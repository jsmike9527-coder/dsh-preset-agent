/**
 * 宿主侧 HTTP 路由 —— 侧栏面板与设置页的唯一数据通道。
 *
 * 走宿主的 `connection.fetch.register()`，挂载在 `/api/mode-exchange` 下，
 * 与 Harness 自身的 API 同源同鉴权。响应统一信封：
 *   { ok: true, value } | { ok: false, error: { code, message } }
 *
 * 路径表（全部固定路径，用 query/body 传参 —— 宿主的 register 只接受固定 path）：
 *   GET  /state?sessionId=     面板状态（模式列表、当前模式、快照、配置、能力）
 *   POST /switch               { sessionId, mode }
 *   POST /revert               { sessionId }
 *   POST /migrate              { sessionId, mode, deleteOld, team, note, confirmDelete }
 *   GET  /job?jobId=           迁移进度（面板轮询）
 *   POST /cancel               { jobId }
 *   GET  /migrations?sessionId= 迁移历史
 *   GET  /report?reportId=     单份迁移报告
 *   POST /archive-old          { sessionId, confirm, backup }
 *   POST /config               { patch } 写入插件配置（持久化）
 *   GET  /sessions             可切换/可迁移的会话清单（带标题，供面板选择器）
 *   GET  /workspaces           工作区清单（供面板选择器）
 *
 * 所有 handler 都做了同源校验：只接受来自 Harness 自身页面的请求。
 */
import { createLogger } from './util.js'
import { switchMode, revertMode, switchState } from './switch.js'
import { archiveOld, cancelJob, history, jobStatus, report, startMigration } from './migrate.js'
import { serviceOf, sessionCwd, sessionTitleOf } from './services.js'
import { listSessionBriefs, listWorkspaceBriefs } from './roster.js'
import { normalizeConfig } from './config.js'

/** 路由前缀。 */
export const ROUTE_PREFIX = '/api/mode-exchange'

/** JSON 响应。 */
function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/** 成功信封。 */
function ok(value) {
  return json({ ok: true, value })
}

/** 失败信封。 */
function fail(code, message, status = 200) {
  return json({ ok: false, error: { code, message } }, status)
}

/**
 * 同源校验：origin 为空（同源导航）或 origin 的 host 与请求 host 一致时放行。
 * @param {Request} request
 * @returns {boolean}
 */
function sameOrigin(request) {
  try {
    const origin = request.headers.get('origin')
    if (origin === null || origin.length === 0 || origin === 'null') return true
    const host = request.headers.get('host')
    if (host === null || host.length === 0) return true
    const url = new URL(origin)
    return url.host === host
  } catch {
    return false
  }
}

/**
 * 读 JSON 请求体（失败时返回空对象，由各 handler 自行校验必填项）。
 * @param {Request} request
 * @returns {Promise<Record<string, unknown>>}
 */
async function readBody(request) {
  try {
    const text = await request.text()
    if (text.length === 0) return {}
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** 从 query 里取字符串参数。 */
function queryValue(request, name) {
  try {
    const value = new URL(request.url).searchParams.get(name)
    return value === null ? undefined : value
  } catch {
    return undefined
  }
}

/**
 * 注册全部路由。整个插件生命周期调用一次，返回 disposer。
 *
 * @param {any} ctx
 * @param {{
 *   config: import('../../types/index.d.ts').ModeExchangeConfig,
 *   capabilities: import('../../types/index.d.ts').Capabilities,
 * }} deps
 * @returns {() => void}
 */
export function installRoutes(ctx, deps) {
  const logger = createLogger(ctx)
  const connection = serviceOf(ctx, 'connection')
  if (connection === undefined || connection?.fetch?.register === undefined) {
    logger.warn('运行时不提供 connection.fetch，侧栏面板将无法与宿主通信（命令仍然可用）。')
    return () => {}
  }

  // 配置在 apply 时快照一份；写配置会重建 apply，因此这里只用它算默认值。
  const baseConfig = normalizeConfig(deps.config)
  const capabilities = deps.capabilities

  /**
   * 解析「当前会话」：优先请求里显式给的，其次退回最近活跃的软切换会话。
   * @param {Record<string, unknown>} body
   * @param {Request} request
   */
  const pickSessionId = (body, request) => {
    if (typeof body.sessionId === 'string' && body.sessionId.length > 0) return body.sessionId
    const fromQuery = queryValue(request, 'sessionId')
    if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery
    return null
  }

  /** @type {Array<{ path: string, methods: Array<'GET'|'POST'>, requestBody: 'buffered'|'streaming', fetch: (request: Request) => Promise<Response> }>} */
  const routes = [
    // ------------------------------------------------------------ 面板状态
    {
      path: `${ROUTE_PREFIX}/state`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async request => {
        const sessionId = pickSessionId({}, request)
        try {
          const state = await switchState(ctx, sessionId, baseConfig, capabilities)
          const title = sessionId === null ? undefined : await sessionTitleOf(ctx, sessionId)
          return ok({ ...state, title: title ?? null })
        } catch (error) {
          return fail('state-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 切换模式
    {
      path: `${ROUTE_PREFIX}/switch`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        const body = await readBody(request)
        const sessionId = pickSessionId(body, request)
        const mode = typeof body.mode === 'string' ? body.mode : ''
        if (sessionId === null) return fail('missing-session', '缺少 sessionId。')
        if (mode.length === 0) return fail('missing-mode', '缺少目标模式。')
        try {
          const result = await switchMode(ctx, { sessionId, modeId: mode, config: baseConfig, capabilities })
          if (!result.ok) return fail('switch-refused', result.reason)
          return ok({ mode: result.snapshot.toMode, notice: result.notice, snapshot: result.snapshot })
        } catch (error) {
          return fail('switch-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 回退切换
    {
      path: `${ROUTE_PREFIX}/revert`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        const body = await readBody(request)
        const sessionId = pickSessionId(body, request)
        if (sessionId === null) return fail('missing-session', '缺少 sessionId。')
        try {
          const result = await revertMode(ctx, { sessionId })
          if (!result.ok) return fail('revert-refused', result.reason)
          return ok({ mode: result.restoredMode, notice: result.notice })
        } catch (error) {
          return fail('revert-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 开始迁移
    {
      path: `${ROUTE_PREFIX}/migrate`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        const body = await readBody(request)
        const sessionId = pickSessionId(body, request)
        const mode = typeof body.mode === 'string' ? body.mode : ''
        if (sessionId === null) return fail('missing-session', '缺少 sessionId。')
        if (mode.length === 0) return fail('missing-mode', '缺少目标模式。')
        try {
          const result = await startMigration(ctx, {
            sessionId,
            mode,
            deleteOld: body.deleteOld === true,
            team: body.team === true,
            note: typeof body.note === 'string' && body.note.length > 0 ? body.note : undefined,
            workspaceId: typeof body.workspaceId === 'string' && body.workspaceId.length > 0 ? body.workspaceId : undefined,
            config: baseConfig,
            capabilities,
            force: body.confirmDelete === true,
          })
          if (!result.ok) return fail('migrate-refused', result.reason)
          if (result.needsResume === true) {
            return ok({
              needsResume: true,
              ledger: result.ledger,
              message: result.ledger.error ?? '该会话已有一次迁移未完成，可续跑或放弃。',
            })
          }
          return ok({ jobId: result.jobId })
        } catch (error) {
          return fail('migrate-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 迁移进度
    {
      path: `${ROUTE_PREFIX}/job`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async request => {
        const jobId = queryValue(request, 'jobId')
        if (typeof jobId !== 'string' || jobId.length === 0) return fail('missing-job', '缺少 jobId。')
        const status = jobStatus(jobId)
        if (status === undefined) return fail('job-not-found', '找不到该迁移任务（可能已随重启清理）。')
        return ok(status)
      },
    },

    // ------------------------------------------------------------ 取消迁移
    {
      path: `${ROUTE_PREFIX}/cancel`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        const body = await readBody(request)
        const jobId = typeof body.jobId === 'string' ? body.jobId : ''
        if (jobId.length === 0) return fail('missing-job', '缺少 jobId。')
        const cancelled = cancelJob(jobId)
        if (!cancelled) return fail('job-not-found', '找不到该迁移任务。')
        return ok({ cancelled: true })
      },
    },

    // ------------------------------------------------------------ 迁移历史
    {
      path: `${ROUTE_PREFIX}/migrations`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async request => {
        const sessionId = pickSessionId({}, request)
        try {
          const cwd = sessionId === null ? undefined : await sessionCwd(ctx, sessionId)
          const rows = await history(baseConfig, cwd)
          return ok(rows)
        } catch (error) {
          return fail('history-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 迁移报告
    {
      path: `${ROUTE_PREFIX}/report`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async request => {
        const reportId = queryValue(request, 'reportId')
        const sessionId = pickSessionId({}, request)
        if (typeof reportId !== 'string' || reportId.length === 0) return fail('missing-report', '缺少 reportId。')
        try {
          const cwd = sessionId === null ? undefined : await sessionCwd(ctx, sessionId)
          const value = await report(baseConfig, reportId, cwd)
          if (value === undefined) return fail('report-not-found', '找不到该迁移报告。')
          return ok(value)
        } catch (error) {
          return fail('report-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // -------------------------------------------------------- 只归档旧会话
    {
      path: `${ROUTE_PREFIX}/archive-old`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        const body = await readBody(request)
        const sessionId = pickSessionId(body, request)
        if (sessionId === null) return fail('missing-session', '缺少 sessionId。')
        if (body.confirm !== true) {
          return fail('confirm-required', '归档旧会话需要显式确认（confirm: true）。')
        }
        try {
          const result = await archiveOld(ctx, {
            sessionId,
            backup: body.backup === true,
            config: baseConfig,
          })
          if (!result.ok) return fail('archive-refused', result.reason)
          return ok({ archived: result.archived, backupPath: result.backupPath ?? null })
        } catch (error) {
          return fail('archive-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 保存配置
    {
      path: `${ROUTE_PREFIX}/config`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async request => {
        const body = await readBody(request)
        const patch = body !== null && typeof body.patch === 'object' && body.patch !== null ? body.patch : body
        const next = normalizeConfig({ ...baseConfig, ...patch })

        // 二次确认开关：从 true 改成 false 属于「降低安全性」，要求显式确认位。
        if (baseConfig.confirmBeforeMigrate === true && next.confirmBeforeMigrate === false
          && body.disableConfirmAcknowledged !== true) {
          return fail(
            'confirm-required',
            '关闭「迁移前强制确认」会让归档旧会话不再询问，请再次确认（disableConfirmAcknowledged: true）。',
          )
        }

        const entry = ctx.fiber?.entry
        const editor = serviceOf(ctx, 'configEditor')
        if (entry === undefined || editor === undefined || typeof editor.edit !== 'function') {
          return fail('config-unavailable', '当前 profile 不支持写入插件配置。')
        }
        try {
          // 先回响应再落盘：写配置会让宿主重启本插件，同步写会掐断这次请求。
          setTimeout(() => {
            void editor.edit(entry, current => ({ ...current, ...next })).catch(error => {
              logger.warn(`保存配置失败：${error instanceof Error ? error.message : String(error)}`)
            })
          }, 50)
          return ok({ saved: true, restarting: true, config: next })
        } catch (error) {
          return fail('config-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 会话清单
    //
    // 面板要让人「按标题认会话」，而 SessionHeader 里没有标题字段；
    // 标题在这条路由里用 sessionTitle 服务补齐（见 roster.js）。
    {
      path: `${ROUTE_PREFIX}/sessions`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async request => {
        try {
          const limitRaw = Number(queryValue(request, 'limit'))
          const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : undefined
          const items = await listSessionBriefs(ctx, limit === undefined ? {} : { limit })
          return ok({ items })
        } catch (error) {
          return fail('sessions-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },

    // ------------------------------------------------------------ 工作区清单
    {
      path: `${ROUTE_PREFIX}/workspaces`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          return ok({ items: listWorkspaceBriefs(ctx) })
        } catch (error) {
          return fail('workspaces-failed', error instanceof Error ? error.message : String(error))
        }
      },
    },
  ]

  /** @type {Array<() => Promise<void> | void>} */
  const disposers = []
  for (const route of routes) {
    const label = `mode-exchange route ${route.path}`
    try {
      if (typeof ctx.effect === 'function') {
        ctx.effect(() => {
          const dispose = connection.fetch.register({
            path: route.path,
            methods: route.methods,
            requestBody: route.requestBody,
            fetch: async request => {
              if (!sameOrigin(request)) {
                return fail('forbidden-origin', '拒绝跨源请求。', 403)
              }
              try {
                return await route.fetch(request)
              } catch (error) {
                return fail('internal', error instanceof Error ? error.message : String(error))
              }
            },
          })
          return () => {
            void dispose()
          }
        }, label)
      } else {
        const dispose = connection.fetch.register({
          path: route.path,
          methods: route.methods,
          requestBody: route.requestBody,
          fetch: async request => {
            if (!sameOrigin(request)) return fail('forbidden-origin', '拒绝跨源请求。', 403)
            try {
              return await route.fetch(request)
            } catch (error) {
              return fail('internal', error instanceof Error ? error.message : String(error))
            }
          },
        })
        disposers.push(dispose)
      }
    } catch (error) {
      logger.warn(`注册路由 ${route.path} 失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  logger.info(`已注册 ${routes.length} 条 HTTP 路由（前缀 ${ROUTE_PREFIX}）`)
  return () => {
    for (const dispose of disposers.reverse()) {
      try {
        dispose()
      } catch {
        // 卸载失败不影响退出
      }
    }
  }
}
