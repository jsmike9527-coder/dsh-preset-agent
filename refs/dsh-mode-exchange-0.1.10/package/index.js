/**
 * dsh-mode-exchange —— 宿主入口（Cordis 插件）。
 *
 * 导出形式采用 `apply` 函数形态（host-plugin.md 允许的两种形式之一），
 * 好处是配置（Config）由宿主校验后直接传进来，且能在 apply 里挂好全部资源。
 *
 * 本文件只做「装配」：
 *   · 解析服务、探测能力（探不到就降级，不硬写）；
 *   · 从磁盘读回切换快照（R10：改配置会让 apply 重建）；
 *   · 安装会话级 guard（软切换的兜底防线）；
 *   · 注册 /switch-mode 与 /migrate-session 两个命令；
 *   · 注册 /api/mode-exchange/* 路由（面板与设置页的数据通道）。
 *
 * 业务逻辑分别在 src/host/switch.js 与 src/host/migrate.js。
 */
import { Config, normalizeConfig, dataRoot, layout, DEFAULTS } from './src/host/config.js'
import {
  liveAgent,
  logCapabilities,
  probeCapabilities,
  resolveServices,
  serviceOf,
  sessionHeader,
  sessionTitleOf,
} from './src/host/services.js'
import { defaultModeId, formatNotFound, listModes, resolveMode } from './src/host/modes.js'
import { installGuard } from './src/host/guard.js'
import { init as initSnapshot } from './src/host/snapshot.js'
import { checkSwitchable, currentModeOf, restore, revertMode, switchMode } from './src/host/switch.js'
import { startMigration } from './src/host/migrate.js'
import { installRoutes } from './src/host/routes.js'
import { createLogger, formatDuration } from './src/host/util.js'

/** 本插件依赖的宿主服务；缺任意一个就不激活（避免半残运行）。 */
export const inject = ['commands', 'agentPresets', 'agents', 'sessionQuery', 'sessionPersistence']

/** 配置 schema，宿主在加载插件行时用它校验并补默认值。 */
export { Config }

/**
 * 插件激活。
 * @param {any} ctx
 * @param {Partial<import('./types/index.d.ts').ModeExchangeConfig>} rawConfig
 */
export async function apply(ctx, rawConfig) {
  const logger = createLogger(ctx)
  const config = normalizeConfig(rawConfig ?? DEFAULTS)

  const resolved = resolveServices(ctx)
  if (resolved.missing.length > 0) {
    logger.warn(
      `缺少必需服务 ${resolved.missing.join(', ')}，dsh-mode-exchange 未激活。`
      + '（可用 /switch-mode 与 /migrate-session 需要 commands/agentPresets/agents/sessionQuery/sessionPersistence）',
    )
    return
  }

  const capabilities = probeCapabilities(ctx, resolved)
  logCapabilities(ctx, capabilities)

  // 数据目录：apply 时还没有具体会话，以宿主进程的工作目录为基准。
  // 具体会话的导出会用自己的 cwd 重算（见 migrate.js / routes.js）。
  const dirs = layout(dataRoot(config, process.cwd()))

  // ① 读回切换快照（R10）。失败不阻断激活。
  try {
    await initSnapshot(dirs.switchesFile)
  } catch (error) {
    logger.warn(`读回切换快照失败：${error instanceof Error ? error.message : String(error)}`)
  }

  // ② 安装会话级 guard —— 软切换的第二道防线，对未登记会话完全透明。
  installGuardWhenReady(ctx, logger, capabilities)

  // ③ 恢复上次运行遗留的软切换状态（提示词 + guard 表）。
  try {
    const result = await restore(ctx, capabilities)
    if (result.restored > 0) logger.info(`已恢复 ${result.restored} 个会话的软切换状态`)
  } catch (error) {
    logger.warn(`恢复软切换状态失败：${error instanceof Error ? error.message : String(error)}`)
  }

  // ④ 命令：/switch-mode
  registerSwitchCommand(ctx, config, capabilities)

  // ⑤ 命令：/migrate-session
  registerMigrateCommand(ctx, config, capabilities)

  // ⑥ 路由：面板与设置页的数据通道。
  startRoutes(ctx, { config, capabilities })

  logger.info(`dsh-mode-exchange 已就绪（数据目录 ${dirs.root}）`)
}

/**
 * 安装会话级 guard（②）。
 *
 * 坑：`tools` 不在本插件的 inject 清单里，直接 `ctx.tools` 会撞 Cordis 的注入检查
 * （cannot get property "tools" without inject）。之前这里包了 try/catch，异常被吞掉后
 * 返回空 disposer —— 表现是「guard 从没装上过」而不是报错。改法与 startRoutes 同构：
 *   1. 先用 serviceOf 非 strict 读一次，读到就装；
 *   2. 读不到就交给 ctx.inject(['tools'], …)，服务就绪时再装。
 *
 * @param {any} ctx
 * @param {{ info: (message: string) => void, warn: (message: string) => void }} logger
 * @param {import('./types/index.d.ts').Capabilities} capabilities 由 apply 创建、命令与路由共用同一引用
 */
function installGuardWhenReady(ctx, logger, capabilities) {
  /**
   * tools 就绪后补一次能力探测：apply 时 tools / agentTeams / workspaceRegistry
   * 可能都还没装配，那一次探测会得到一串 false。probeCapabilities 不再缓存负结果，
   * 所以这里重探是安全的；结果原地合并进 capabilities，命令与路由看到的是同一对象。
   */
  const refreshCapabilities = () => {
    try {
      const fresh = probeCapabilities(ctx, resolveServices(ctx))
      if (fresh.notes.length > 0) {
        capabilities.notes = fresh.notes
        logCapabilities(ctx, fresh)
      }
      Object.assign(capabilities, fresh)
    } catch (error) {
      logger.warn(`能力重探失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const install = scope => {
    if (typeof scope.effect === 'function') {
      scope.effect(() => installGuard(scope), 'mode-exchange.guard')
    } else {
      installGuard(scope)
    }
  }

  if (serviceOf(ctx, 'tools') !== undefined) {
    install(ctx)
    return
  }

  if (typeof ctx.inject !== 'function') {
    logger.warn('运行时不提供 tools 服务，软切换只能靠提示词层生效（guard 未安装）。')
    return
  }

  const fiber = ctx.inject(['tools'], scope => {
    install(scope)
    refreshCapabilities()
    logger.info('tools 服务就绪，已安装会话级 guard。')
  })
  if (fiber !== undefined && typeof fiber.then === 'function') {
    fiber.then(undefined, error => {
      logger.warn(`等待 tools 服务失败（guard 未安装）：${error instanceof Error ? error.message : String(error)}`)
    })
  }
}

/**
 * 注册 /api/mode-exchange/* 路由（⑥）。
 *
 * `connection` 由 Web Host 组合在启动过程中提供，时机可能晚于本插件：
 * 直接访问 `ctx.connection` 会撞上 Cordis 的注入检查（cannot get property "connection" without inject），
 * 把整个插件判成「异常」，侧栏面板与命令一起消失。所以这里：
 *   1. 先按非 strict 读一次 store；
 *   2. 读不到就交给 `ctx.inject(['connection'], …)` —— 服务就绪时回调运行、服务变化时回调重跑；
 *      插件本身照常激活（命令仍可用），不会白等服务。
 *
 * @param {any} ctx
 * @param {{ config: import('./types/index.d.ts').ModeExchangeConfig, capabilities: import('./types/index.d.ts').Capabilities }} deps
 */
function startRoutes(ctx, deps) {
  const logger = createLogger(ctx)

  const register = scope => {
    try {
      if (typeof scope.effect === 'function') {
        scope.effect(() => installRoutes(scope, deps), 'mode-exchange.routes')
      } else {
        installRoutes(scope, deps)
      }
    } catch (error) {
      logger.warn(`注册 HTTP 路由失败（面板将不可用，命令仍然可用）：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (serviceOf(ctx, 'connection') !== undefined) {
    register(ctx)
    return
  }

  if (typeof ctx.inject !== 'function') {
    logger.warn('运行时不提供 connection 服务，侧栏面板将无法与宿主通信（命令仍然可用）。')
    return
  }

  const fiber = ctx.inject(['connection'], scope => {
    register(scope)
  })
  // 不 await：await 会让 apply 卡在「等服务」上（CLI 组合里没有 Web 服务）。
  // 但 fiber 的失败要有人接住，否则会变成 unhandled rejection。
  if (fiber !== undefined && typeof fiber.then === 'function') {
    fiber.then(undefined, error => {
      logger.warn(`等待 connection 服务失败：${error instanceof Error ? error.message : String(error)}`)
    })
  }
}

/**
 * 注册 /switch-mode。
 *
 * 用法：
 *   /switch-mode <模式>     切换到指定模式
 *   /switch-mode --revert   回退到切换前的状态
 *   /switch-mode --list     列出全部可用模式
 *
 * 关于补全（FR-1）：宿主 `CommandInputDescriptor` 只有 `hint` 字符串，
 * **没有参数级枚举字段**，所以 Tab 补全无法注册成结构化候选。
 * 本实现的替代：把当前可用模式写进 hint，并在 `--list` / 错误文案里
 * 完整列出运行时枚举结果（仍然零硬编码）。侧栏面板用下拉框补齐交互。
 *
 * @param {any} ctx
 * @param {import('./types/index.d.ts').ModeExchangeConfig} config
 * @param {import('./types/index.d.ts').Capabilities} capabilities
 */
function registerSwitchCommand(ctx, config, capabilities) {
  const logger = createLogger(ctx)
  ctx.effect(() => ctx.commands.register({
    name: 'switch-mode',
    description: '在当前会话内切换 Agent 模式（软切换：替换系统提示词并卸载/补挂对应工具集）。',
    input: { hint: '<模式名> | --revert | --list' },
    handler: async invocation => {
      const { agent, rawInput, signal } = invocation
      const sessionId = typeof agent?.id === 'string' ? agent.id : ''
      if (sessionId.length === 0) {
        return { kind: 'error', text: '当前没有可用的会话上下文，无法切换模式。' }
      }
      if (signal?.aborted === true) {
        return { kind: 'error', text: '已取消。' }
      }

      const input = String(rawInput ?? '').trim()
      const tokens = input.length === 0 ? [] : input.split(/\s+/)

      // --list：列出运行时枚举的全部模式（零硬编码）。
      if (tokens.includes('--list') || tokens.includes('-l')) {
        const modes = await listModes(ctx)
        if (modes.length === 0) return { kind: 'error', text: '运行时没有提供任何可用模式。' }
        const current = await currentModeOf(ctx, sessionId)
        const lines = modes.map(mode => {
          const marks = []
          if (mode.id === current) marks.push('当前')
          if (mode.isDefault) marks.push('运行时默认')
          if (mode.broken !== undefined) marks.push(`装配失败：${mode.broken}`)
          const suffix = marks.length === 0 ? '' : `（${marks.join('，')}）`
          const desc = mode.description.length > 0 ? ` — ${mode.description}` : ''
          return `· ${mode.id}${mode.name !== mode.id ? ` (${mode.name})` : ''}${suffix}${desc}`
        })
        return {
          kind: 'success',
          text: [`可用模式（${modes.length} 个）：`, ...lines, '', '切换：/switch-mode <模式名>；回退：/switch-mode --revert'].join('\n'),
        }
      }

      // --revert：回退。
      if (tokens.includes('--revert') || tokens.includes('-r')) {
        const result = await revertMode(ctx, { sessionId })
        if (!result.ok) return { kind: 'error', text: result.reason }
        return { kind: 'success', text: result.notice }
      }

      // 位置参数 = 目标模式名。
      const wanted = tokens.find(token => !token.startsWith('-')) ?? ''
      if (wanted.length === 0) {
        const modes = await listModes(ctx)
        const current = await currentModeOf(ctx, sessionId)
        const name = current === null ? '未知' : current
        return {
          kind: 'error',
          text: [
            `当前会话模式：${name}。请给出目标模式名。`,
            `可用模式：${modes.map(mode => mode.id).join('、') || '（运行时未提供）'}`,
            '用法：/switch-mode <模式名> | /switch-mode --revert | /switch-mode --list',
          ].join('\n'),
        }
      }

      const resolvedMode = await resolveMode(ctx, wanted)
      if (!resolvedMode.ok) {
        const modes = await listModes(ctx)
        return { kind: 'error', text: formatNotFound(wanted, modes) }
      }

      const gate = await checkSwitchable(ctx, sessionId)
      if (!gate.ok) return { kind: 'error', text: gate.reason }

      const startedAt = Date.now()
      const result = await switchMode(ctx, { sessionId, modeId: resolvedMode.mode.id, config, capabilities })
      if (!result.ok) return { kind: 'error', text: result.reason }

      // FR-6：把「已切换」提示写进对话流。
      // 命令结果本身会渲染成一条 command 卡片，但为了让模型在下一轮也看见
      // 这件事（工具集变了，别再去调已被卸载的工具），额外追加一条 notice。
      const notice = `${result.notice}（用时 ${formatDuration(Date.now() - startedAt)}）`
      appendNotice(ctx, sessionId, notice)
      logger.info(`/switch-mode ${resolvedMode.mode.id} 完成：${sessionId}`)

      const lines = [notice]
      if (result.snapshot.denied.length > 0) {
        lines.push(`已卸载（目标模式不提供）：${result.snapshot.denied.join('、')}`)
      }
      if (result.snapshot.attached.length > 0) {
        lines.push(`已补挂（目标模式新增）：${result.snapshot.attached.join('、')}`)
      }
      if (result.snapshot.scoped !== true) {
        lines.push('注意：本次未能建立作用域级工具注册，只做了提示词层切换（详见 /switch-mode --list 与插件日志）。')
      }
      return { kind: 'success', text: lines.join('\n') }
    },
  }), 'mode-exchange.command.switch-mode')
}

/**
 * 注册 /migrate-session。
 *
 * 用法：
 *   /migrate-session --mode <模式> [--delete-old true|false] [--team on|off] [--note <备注>]
 *
 * FR-9 的确认：本命令跑在会话里，无法可靠地弹宿主模态框，
 * 因此把「确认」落到两个地方：
 *   · 默认 deleteOld = config.deleteOldSession 且 config.confirmBeforeMigrate 为真时，
 *     命令在没带 `--delete-old false` 也没带 `--yes` 的情况下**拒绝删旧**并给出提示；
 *   · 侧栏面板走 HTTP 路径时会真正弹出确认对话框（客户端实现）。
 * 这样命令行与面板两条入口都不会「静默删掉一个会话」。
 *
 * @param {any} ctx
 * @param {import('./types/index.d.ts').ModeExchangeConfig} config
 * @param {import('./types/index.d.ts').Capabilities} capabilities
 */
function registerMigrateCommand(ctx, config, capabilities) {
  const logger = createLogger(ctx)
  ctx.effect(() => ctx.commands.register({
    name: 'migrate-session',
    description: '把当前会话迁移到一个新模式的新会话：导出日志 → 校验 → 建会话 → 导入 → 可选团队协作 → 可选归档旧会话 → 报告。',
    input: { hint: '--mode <模式> [--delete-old true|false] [--team on|off] [--note <备注>] [--yes]' },
    handler: async invocation => {
      const { agent, rawInput, signal } = invocation
      const sessionId = typeof agent?.id === 'string' ? agent.id : ''
      if (sessionId.length === 0) {
        return { kind: 'error', text: '当前没有可用的会话上下文，无法迁移。' }
      }
      if (signal?.aborted === true) return { kind: 'error', text: '已取消。' }

      const parsed = parseMigrateArgs(String(rawInput ?? ''))
      if (parsed.error !== undefined) return { kind: 'error', text: parsed.error }

      const resolvedMode = await resolveMode(ctx, parsed.mode)
      if (!resolvedMode.ok) {
        const modes = await listModes(ctx)
        return { kind: 'error', text: formatNotFound(parsed.mode, modes) }
      }

      const totalSteps = 7
      const job = await startMigration(ctx, {
        sessionId,
        mode: resolvedMode.mode.id,
        deleteOld: parsed.deleteOld,
        team: parsed.team,
        note: parsed.note,
        config,
        capabilities,
        // --yes 表示「我已确认可以归档旧会话」，--resume 表示「跳过台账里的
        // 未完成记录，直接再跑一次」。两者都要求越过幂等守卫，因此合并成 force。
        force: parsed.yes === true || parsed.resume === true,
      })

      if (job.ok !== true) return { kind: 'error', text: job.reason }
      if (job.needsResume === true) {
        const existing = job.ledger
        return {
          kind: 'error',
          text: [
            existing.error ?? '该会话已有一次迁移未完成。',
            `上次进度：第 ${existing.step}/${totalSteps} 步，目标模式 ${existing.targetMode}。`,
            typeof existing.targetSessionId === 'string' ? `已创建的新会话：${existing.targetSessionId}` : '',
            typeof existing.logPath === 'string' ? `已导出的日志：${existing.logPath}` : '',
            '继续：/migrate-session ' + `--mode ${resolvedMode.mode.id} --resume`,
            '放弃：在侧栏面板里点「放弃」，或直接忽略（不会产生新会话）。',
          ].filter(line => line.length > 0).join('\n'),
        }
      }

      logger.info(`/migrate-session 启动：${sessionId} → ${resolvedMode.mode.id}，job ${job.jobId}`)
      const lines = [
        `迁移已开始（任务 ${String(job.jobId).slice(0, 8)}），共 ${totalSteps} 步：`,
        '① 导出会话日志  ② 校验完整性  ③ 以目标模式创建新会话  ④ 导入历史  ⑤ 团队协作  ⑥ 归档旧会话  ⑦ 报告',
        `目标模式：${resolvedMode.mode.name}（${resolvedMode.mode.id}）`,
        `旧会话：${parsed.deleteOld ? (parsed.yes ? '迁移完成后归档（已确认）' : '默认不归档 —— 未带 --yes，为安全起见本次保留旧会话') : '保留'}`,
        `团队协作：${parsed.team ? '迁移完成后启用' : '不启用'}`,
        '',
        '进度与报告：打开侧栏「模式迁移」面板，或直接查看工作区下的 .dsh/mode-exchange/ 目录。',
      ]
      if (!capabilities.teamSwitch && parsed.team) {
        lines.push('注意：运行时不支持程序化启停团队协作，该步会记录原因而不会伪造成功。')
      }
      return { kind: 'success', text: lines.join('\n') }
    },
  }), 'mode-exchange.command.migrate-session')
}

/**
 * 解析 /migrate-session 的参数。
 * @param {string} raw
 * @returns {{
 *   mode: string,
 *   deleteOld: boolean,
 *   team: boolean,
 *   note?: string,
 *   yes: boolean,
 *   resume: boolean,
 *   error?: string,
 * }}
 */
function parseMigrateArgs(raw) {
  const tokens = raw.trim().length === 0 ? [] : raw.trim().split(/\s+/)
  let mode = ''
  let deleteOld
  let team = false
  let note
  let yes = false
  let resume = false

  const asBool = value => {
    const lowered = String(value).toLowerCase()
    if (['true', 'on', 'yes', 'y', '1'].includes(lowered)) return true
    if (['false', 'off', 'no', 'n', '0'].includes(lowered)) return false
    return undefined
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (token === '--mode' || token === '-m') {
      if (next === undefined) return { error: '--mode 需要一个模式名。', mode, deleteOld, team, yes, resume }
      mode = next
      index += 1
      continue
    }
    if (token.startsWith('--mode=')) {
      mode = token.slice('--mode='.length)
      continue
    }
    if (token === '--delete-old') {
      if (next === undefined) {
        deleteOld = true
        continue
      }
      const value = asBool(next)
      if (value === undefined) return { error: `--delete-old 只接受 true 或 false（收到 ${next}）。`, mode, deleteOld, team, yes, resume }
      deleteOld = value
      index += 1
      continue
    }
    if (token.startsWith('--delete-old=')) {
      const value = asBool(token.slice('--delete-old='.length))
      if (value === undefined) return { error: '--delete-old 只接受 true 或 false。', mode, deleteOld, team, yes, resume }
      deleteOld = value
      continue
    }
    if (token === '--team') {
      if (next === undefined) {
        team = true
        continue
      }
      const value = asBool(next)
      if (value === undefined) return { error: `--team 只接受 on 或 off（收到 ${next}）。`, mode, deleteOld, team, yes, resume }
      team = value
      index += 1
      continue
    }
    if (token.startsWith('--team=')) {
      const value = asBool(token.slice('--team='.length))
      if (value === undefined) return { error: '--team 只接受 on 或 off。', mode, deleteOld, team, yes, resume }
      team = value
      continue
    }
    if (token === '--note' || token === '-n') {
      if (next === undefined) return { error: '--note 需要一段文本（含空格时请用引号）。', mode, deleteOld, team, yes, resume }
      note = next
      index += 1
      continue
    }
    if (token.startsWith('--note=')) {
      note = token.slice('--note='.length)
      continue
    }
    if (token === '--yes' || token === '-y') {
      yes = true
      continue
    }
    if (token === '--resume') {
      resume = true
      continue
    }
    if (token.startsWith('-')) {
      return { error: `未知参数 ${token}。用法：/migrate-session --mode <模式> [--delete-old true|false] [--team on|off] [--note <备注>] [--yes]`, mode, deleteOld, team, yes, resume }
    }
  }

  if (mode.length === 0) {
    return { error: '缺少必需参数 --mode <模式名>。先用 /switch-mode --list 查看可用模式。', mode, deleteOld, team, yes, resume }
  }
  return {
    mode,
    deleteOld: deleteOld === undefined ? DEFAULTS.deleteOldSession : deleteOld,
    team,
    ...(note === undefined ? {} : { note }),
    yes,
    resume,
  }
}

/**
 * 往会话里追加一条「系统级提示」（FR-6）。
 *
 * 用 user 角色的普通消息：宿主自己发模型切换提示时也是这个形态；
 * `system/message` 在宿主里代表「已渲染的系统提示词快照」，中途插入会污染语义。
 *
 * @param {any} ctx
 * @param {string} sessionId
 * @param {string} text
 */
function appendNotice(ctx, sessionId, text) {
  try {
    const agent = liveAgent(ctx, sessionId)
    const session = agent?.session
    if (session === undefined || typeof session.append !== 'function') return
    session.append(
      'user/message',
      {
        id: `mode-exchange-notice-${Date.now()}`,
        role: 'user',
        content: [{ type: 'text', text }],
        source: { kind: 'user' },
      },
      { surfaceOp: 'append' },
    )
  } catch {
    // 追加提示失败不影响切换本身（命令返回值里已经有同样的文案）
  }
}

/** 供诊断/测试使用：判断某个会话当前能否切换。 */
export async function describeSession(ctx, sessionId) {
  const header = await sessionHeader(ctx, sessionId)
  const title = await sessionTitleOf(ctx, sessionId)
  const mode = await currentModeOf(ctx, sessionId)
  const gate = await checkSwitchable(ctx, sessionId)
  return {
    sessionId,
    title: title ?? null,
    hasHeader: header !== undefined,
    mode,
    switchable: gate.ok,
    ...(gate.ok ? {} : { blockedReason: gate.reason }),
    defaultMode: await defaultModeId(ctx),
  }
}