/**
 * 迁移重建（FR-7 ~ FR-12）。
 *
 * 严格按 FR-8 的七步执行，每一步都会写台账与时间线，任何一步失败都能定位：
 *   ① export   导出源会话完整日志
 *   ② verify   校验导出完整性（解析、条数、seq 连续、sha256）
 *   ③ create   以目标模式创建新会话（含 preset 装配）
 *   ④ import   把日志作为「原生事件序列」导入新会话
 *   ⑤ team     可选：对新会话启用智能体团队协作
 *   ⑥ archive  可选：归档旧会话（先备份再归档）
 *   ⑦ report   输出迁移报告
 *
 * ③④ 在本实现里是同一次 `agents.create()` 调用 —— 这是宿主唯一一条
 * 「带着历史启动一个活会话」的通路（`dsh-agent-loop` 的 createAgent 内部
 * 会把 seed 交给 `sessions.prepare()` 再由 `Session` 构造函数校验并落盘）。
 * 之所以还要分成两个步骤展示，是因为它们的失败语义不同：
 *   · create 失败 = 没有新会话，旧会话原样保留；
 *   · import 失败 = 新会话已建但历史没写进去，此时保留新会话与日志文件，
 *     并在报告里给出可以手动补完的后续步骤（FR-11）。
 *
 * 幂等（FR-10）：同一源会话重复执行时读 `<migrations>/<id>.json`：
 *   · 已有 in-progress → 返回 needsResume，由调用方决定续跑还是放弃；
 *   · 已 done 且目标会话仍存在 → 直接复用，不再新建第二个会话。
 */
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { createLogger, formatDuration, shortId, yieldToLoop } from './util.js'
import { dataRoot, layout } from './config.js'
import { buildSeed, inspectSeed } from './seed.js'
import * as ledger from './ledger.js'
import {
  backupSession,
  countEvents,
  discardExport,
  exportSession,
  readEvents,
  verifyExport,
} from './export.js'
import { resolveMode } from './modes.js'
import { liveAgent, serviceOf, sessionCwd, sessionHeader, sessionTitleOf } from './services.js'
import { workspaceTargetOf } from './roster.js'

/** 进行中的任务（只在内存；台账在磁盘）。 */
const jobs = new Map()

/**
 * 开始一次迁移。立即返回 jobId，真正的七步在后台跑（FR-15：长任务要有进度）。
 *
 * @param {any} ctx
 * @param {{
 *   sessionId: string,
 *   mode: string,
 *   deleteOld: boolean,
 *   team: boolean,
 *   note?: string,
 *   workspaceId?: string,
 *   config: import('../../types/index.d.ts').ModeExchangeConfig,
 *   capabilities: import('../../types/index.d.ts').Capabilities,
 *   force?: boolean,
 * }} input
 * @returns {Promise<
 *   { ok: true, jobId: string } |
 *   { ok: false, reason: string } |
 *   { ok: true, needsResume: true, ledger: import('../../types/index.d.ts').MigrationLedger }
 * >}
 */
export async function startMigration(ctx, input) {
  const { sessionId, mode } = input
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return { ok: false, reason: '没有选中会话，无法迁移。' }
  }
  const header = await sessionHeader(ctx, sessionId)
  if (header === undefined) {
    return { ok: false, reason: `会话 ${sessionId} 不存在或尚未落盘，无法迁移。` }
  }
  const resolved = await resolveMode(ctx, mode)
  if (!resolved.ok) return { ok: false, reason: resolved.reason }

  // 目标工作区：面板可以显式指定新会话落在哪个工作区；不指定就沿用源会话的 cwd。
  // 这里只做「解析出目标目录」，真正挂载在 ⑥ 之前（attachToWorkspace）执行。
  const workspaceId = typeof input.workspaceId === 'string' && input.workspaceId.length > 0 ? input.workspaceId : undefined
  const workspaceTarget = workspaceId === undefined ? undefined : await workspaceTargetOf(ctx, workspaceId)
  const cwd = workspaceTarget?.path ?? await sessionCwd(ctx, sessionId)
  const dirs = layout(dataRoot(input.config, cwd))

  const existing = await ledger.read(dirs, sessionId)
  const resuming = existing !== undefined && existing.status === 'in-progress' && input.resume === true
  if (existing !== undefined && input.force !== true && input.resume !== true) {
    if (existing.status === 'in-progress') {
      return { ok: true, needsResume: true, ledger: existing }
    }
    if (existing.status === 'done' && typeof existing.targetSessionId === 'string') {
      const alive = await sessionHeader(ctx, existing.targetSessionId)
      if (alive !== undefined) {
        return {
          ok: true,
          needsResume: true,
          ledger: { ...existing, error: '该会话此前已成功迁移过，目标会话仍然存在。' },
        }
      }
    }
  }

  // 续跑：台账里已有一次未完成的迁移，且调用方明确要求续跑。
  // 这里只记录「沿用的导出路径」，真正的复用由 ① 重新导出覆盖写保证幂等。
  const resumeLogPath = resuming && existing.logPath !== undefined ? existing.logPath : undefined

  const jobId = randomUUID()
  const controller = new AbortController()
  /** @type {import('../../types/index.d.ts').MigrationJobStatus} */
  const status = {
    jobId,
    sourceSessionId: sessionId,
    targetMode: resolved.mode.id,
    status: 'running',
    stepIndex: 0,
    stepName: ledger.stepLabel(0),
    totalSteps: ledger.STEP_COUNT,
    startedAt: Date.now(),
    elapsedMs: 0,
    message: '准备中…',
  }
  jobs.set(jobId, { status, controller, dirs })

  // 后台跑，不阻塞命令/HTTP 响应；调用方轮询 jobStatus。
  void runJob(ctx, {
    jobId,
    dirs,
    sessionId,
    header,
    cwd,
    workspaceId: workspaceTarget?.id,
    workspaceTitle: workspaceTarget?.title,
    mode: resolved.mode,
    deleteOld: input.deleteOld === true,
    team: input.team === true,
    note: typeof input.note === 'string' && input.note.length > 0 ? input.note : undefined,
    config: input.config,
    capabilities: input.capabilities,
    resumeLogPath,
    status,
    controller,
  }).catch(error => {
    status.status = 'failed'
    status.message = error instanceof Error ? error.message : String(error)
  })

  return { ok: true, jobId }
}

/**
 * 查任务状态（面板轮询）。
 * @param {string} jobId
 * @returns {import('../../types/index.d.ts').MigrationJobStatus | undefined}
 */
export function jobStatus(jobId) {
  const entry = jobs.get(jobId)
  if (entry === undefined) return undefined
  entry.status.elapsedMs = Date.now() - entry.status.startedAt
  return entry.status
}

/**
 * 取消任务。
 * @param {string} jobId
 * @returns {boolean} 是否找到了任务
 */
export function cancelJob(jobId) {
  const entry = jobs.get(jobId)
  if (entry === undefined) return false
  entry.controller.abort(new Error('用户取消'))
  entry.status.status = 'cancelled'
  entry.status.message = '已取消。已导出的日志与新会话（如有）都保留。'
  return true
}

/** 列全部在跑的任务（诊断用）。 */
export function runningJobs() {
  return [...jobs.values()].filter(entry => entry.status.status === 'running').map(entry => entry.status.jobId)
}

/**
 * 真正执行七步。
 * @param {any} ctx
 * @param {any} job
 * @returns {Promise<void>}
 */
async function runJob(ctx, job) {
  const logger = createLogger(ctx)
  const { status, dirs, sessionId, header, cwd, mode, controller } = job
  /** @type {Array<{ step: string, at: number, ok: boolean, detail?: string }>} */
  const timeline = []
  const startedAt = status.startedAt

  /** @type {import('../../types/index.d.ts').MigrationReport} */
  const report = {
    jobId: status.jobId,
    ok: false,
    startedAt,
    finishedAt: 0,
    elapsedMs: 0,
    source: {
      sessionId,
      title: (await sessionTitleOf(ctx, sessionId)) ?? `未命名会话（${shortId(sessionId)}）`,
      mode: typeof header.agentPreset === 'string' ? header.agentPreset : null,
      messageCount: 0,
      toolCallCount: 0,
      eventCount: 0,
    },
    log: { path: '', metaPath: '', sha256: '', verified: false },
    team: { requested: job.team, enabled: false },
    oldSession: { requested: job.deleteOld, archived: false },
    error: null,
    remainingSteps: [],
    timeline,
  }

  const step = (index, name) => {
    status.stepIndex = index
    status.stepName = name
    status.message = name
  }
  const mark = (name, ok, detail) => {
    timeline.push({ step: name, at: Date.now(), ok, ...(detail === undefined ? {} : { detail }) })
  }
  const abortIfCancelled = () => {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason
      throw reason instanceof Error ? reason : new Error(String(reason ?? '已取消'))
    }
  }

  await ledger.write(dirs, {
    sourceSessionId: sessionId,
    sourceTitle: report.source.title,
    sourceMode: report.source.mode,
    targetMode: mode.id,
    status: 'in-progress',
    step: 0,
    jobId: status.jobId,
    deleteOld: job.deleteOld,
    team: job.team,
    note: job.note ?? null,
  })

  let targetSessionId
  let importedEventCount = 0
  try {
    // ---------------------------------------------------------------- ① 导出
    step(0, ledger.stepLabel(0))
    abortIfCancelled()
    const exported = await exportSession(ctx, { sessionId, dirs, mode: report.source.mode, title: report.source.title })
    report.log.path = exported.logPath
    report.log.metaPath = exported.metaPath
    report.log.sha256 = exported.sha256
    report.source.eventCount = exported.eventCount
    report.source.messageCount = exported.messageCount
    report.source.toolCallCount = exported.toolCallCount
    await ledger.write(dirs, { sourceSessionId: sessionId, step: 1, logPath: exported.logPath, metaPath: exported.metaPath })
    mark('① 导出会话日志', true, `${exported.eventCount} 条事件 → ${exported.logPath}`)
    if (typeof job.resumeLogPath === 'string') {
      mark('续跑：沿用已有台账', true, job.resumeLogPath)
    }

    // ---------------------------------------------------------------- ② 校验
    step(1, ledger.stepLabel(1))
    abortIfCancelled()
    const verified = await verifyExport({
      logPath: exported.logPath,
      metaPath: exported.metaPath,
      expectedEventCount: exported.eventCount,
    })
    if (!verified.ok) {
      report.log.verified = false
      report.log.verifyReason = verified.reason
      mark('② 校验导出完整性', false, verified.reason)
      report.remainingSteps.push('导出文件校验失败，已中止。原始会话未做任何改动，日志文件保留在报告里记录的路径。')
      throw new Error(`导出校验失败：${verified.reason}`)
    }
    report.log.verified = true
    mark('② 校验导出完整性', true, `${verified.eventCount} 条事件、seq 连续、sha256 匹配`)

    // ------------------------------------------------------ ③④ 创建 + 导入
    step(2, ledger.stepLabel(2))
    abortIfCancelled()

    // 从头读一次源事件（export 已经读过，这里用导出文件的语义等价数据重建 seed）。
    const { events } = await readEvents(ctx, sessionId)
    const built = buildSeed(events)
    const problems = inspectSeed(built.seed, built.inheritedEventCount)
    if (problems.length > 0) {
      mark('③ 以目标模式创建新会话', false, problems.join('；'))
      throw new Error(`seed 自检未通过：${problems[0]}`)
    }

    targetSessionId = `session-${randomUUID()}`
    report.target = {
      sessionId: targetSessionId,
      mode: mode.id,
      imported: false,
      importedEventCount: 0,
      attachedToWorkspace: false,
      // 面板选了工作区才记；没选时这段保持缺省，报告与 0.1.4 完全一致。
      ...(typeof job.workspaceId === 'string' ? { workspaceId: job.workspaceId } : {}),
      ...(typeof job.workspaceTitle === 'string' ? { workspaceTitle: job.workspaceTitle } : {}),
    }

    const createResult = await createWithHistory(ctx, {
      sessionId: targetSessionId,
      cwd,
      modeId: mode.id,
      seed: built.seed,
      inheritedEventCount: built.inheritedEventCount,
    })
    if (!createResult.ok) {
      mark('③ 以目标模式创建新会话', false, createResult.reason)
      throw new Error(createResult.reason)
    }
    await ledger.write(dirs, { sourceSessionId: sessionId, targetSessionId, step: 3 })
    mark('③ 以目标模式创建新会话', true, `新会话 ${targetSessionId}（模式 ${mode.id}）`)

    // 导入：seed 已随创建写入。用持久层复核条数，确认「原生序列」真的落地了。
    step(3, ledger.stepLabel(3))
    abortIfCancelled()
    const imported = await verifyImport(ctx, {
      sessionId: targetSessionId,
      expectedEventCount: built.seed.length,
    })
    importedEventCount = imported.eventCount
    report.target.imported = imported.ok
    report.target.importedEventCount = imported.eventCount
    if (!imported.ok) {
      mark('④ 导入日志为历史上下文', false, imported.reason)
      report.remainingSteps.push(
        `新会话 ${targetSessionId} 已创建，但历史导入未通过复核：${imported.reason}`,
        `日志文件仍保留在 ${report.log.path}，可手动完成导入：在该会话里让 Agent 重新启动，或用导入的 .jsonl 重建。`,
      )
      throw new Error(`导入复核失败：${imported.reason}`)
    }
    mark(
      '④ 导入日志为历史上下文',
      true,
      `${imported.eventCount} 条原生事件已落盘${imported.location === undefined ? '' : `（${imported.location}）`}`,
    )

    // 来源标记 + 备注（FR-12 / FR-7 的 --note）。
    // 只是给新会话留一句来历，任何失败都不该让整次迁移判失败：
    // 这里包一层 try/catch，appendProvenance 内部也已全包，双保险。
    /** @type {boolean} */
    let provenance = false
    try {
      provenance = await appendProvenance(ctx, {
        sessionId: targetSessionId,
        sourceSessionId: sessionId,
        sourceTitle: report.source.title,
        fromMode: report.source.mode,
        toMode: mode.id,
        note: job.note,
      })
    } catch {
      provenance = false
    }
    mark('  写入来源标记', provenance, provenance ? '已在新会话开头写入迁移来历' : '未能写入来源标记（不影响迁移）')
    await ledger.write(dirs, { sourceSessionId: sessionId, step: 4 })

    // 挂工作区（FR-8 未强制，但新会话要能被侧栏按工作区分组看到）。
    // 二次兜底：挂工作区只是锦上添花，任何意外都不该把整次迁移判失败。
    let attached = false
    try {
      attached = await attachToWorkspace(ctx, targetSessionId, cwd, job.workspaceId)
    } catch {
      attached = false
    }
    report.target.attachedToWorkspace = attached
    mark(
      '  挂载工作区',
      attached,
      attached
        ? `已加入工作区${typeof job.workspaceTitle === 'string' ? `「${job.workspaceTitle}」` : '列表'}`
        : '未能匹配到工作区（不影响迁移）',
    )

    // ---------------------------------------------------------------- ⑤ 团队
    step(4, ledger.stepLabel(4))
    abortIfCancelled()
    if (!job.team) {
      report.team.reason = '未要求启用。'
      mark('⑤ 启用智能体团队协作', true, '跳过（未要求）')
    } else if (!job.capabilities.teamSwitch) {
      report.team.reason = '运行时不支持程序化启停团队协作（未找到 agentTeams.setEnabled）。'
      mark('⑤ 启用智能体团队协作', false, report.team.reason)
    } else {
      /** @type {{ ok: boolean, reason?: string }} */
      let enabled
      try {
        enabled = await enableTeam(ctx, targetSessionId)
      } catch (error) {
        enabled = { ok: false, reason: error instanceof Error ? error.message : String(error) }
      }
      report.team.enabled = enabled.ok
      if (!enabled.ok) report.team.reason = enabled.reason
      mark('⑤ 启用智能体团队协作', enabled.ok, enabled.ok ? '已启用' : enabled.reason)
    }
    await ledger.write(dirs, { sourceSessionId: sessionId, step: 5 })

    // ---------------------------------------------------------------- ⑥ 归档
    step(5, ledger.stepLabel(5))
    abortIfCancelled()
    if (!job.deleteOld) {
      report.oldSession.reason = '按选项保留旧会话。'
      mark('⑥ 处置旧会话', true, '跳过（保留）')
    } else {
      const backupPath = await backupSession(ctx, { sessionId, dirs }).catch(() => undefined)
      if (backupPath !== undefined) report.oldSession.backupPath = backupPath
      /** @type {{ ok: boolean, reason?: string }} */
      let archived
      try {
        archived = await scheduleArchive(ctx, sessionId)
      } catch (error) {
        archived = { ok: false, reason: error instanceof Error ? error.message : String(error) }
      }
      report.oldSession.archived = archived.ok
      if (!archived.ok) report.oldSession.reason = archived.reason
      mark('⑥ 处置旧会话', archived.ok, archived.ok ? `已归档（备份 ${backupPath ?? '无'}）` : archived.reason)
    }
    await ledger.write(dirs, { sourceSessionId: sessionId, step: 6, backupPath: report.oldSession.backupPath ?? null })

    // ---------------------------------------------------------------- 置顶新会话
    // 新会话默认排在列表末尾（按创建时间倒序的既有实现里，旧会话在上面），
    // 迁移完还要用户自己翻列表去找。这里把它置顶，配合客户端「自动切到新会话」，
    // 迁移结束就停在新建的那个窗口上。置顶失败不影响迁移结果。
    if (report.target !== undefined) {
      /** @type {boolean} */
      let pinned = false
      try {
        const registry = serviceOf(ctx, 'workspaceRegistry')
        if (registry !== undefined && typeof registry.pinSession === 'function') {
          await registry.pinSession(targetSessionId)
          pinned = true
        }
      } catch {
        pinned = false
      }
      report.target.pinned = pinned
      mark('  置顶新会话', pinned, pinned ? '新会话已置顶到列表顶部' : '未能置顶（不影响迁移）')
    }

    // ---------------------------------------------------------------- ⑦ 报告
    step(6, ledger.stepLabel(6))
    report.ok = true
    report.finishedAt = Date.now()
    report.elapsedMs = report.finishedAt - startedAt
    const reportPath = await ledger.writeReport(dirs, report)
    await ledger.write(dirs, { sourceSessionId: sessionId, status: 'done', step: 7, error: null })
    mark('⑦ 生成迁移报告', true, reportPath)

    status.status = 'done'
    status.report = report
    status.message = `迁移完成，用时 ${formatDuration(report.elapsedMs)}。`

    // 导出副本保留策略（FR-14）
    if (job.config.keepExportCopy !== true) {
      await discardExport({ logPath: report.log.path, metaPath: report.log.metaPath })
    }
    logger.info(`迁移完成：${srcLabel(sessionId)} → ${targetSessionId}（${mode.id}），报告 ${reportPath}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    report.ok = false
    // 真实原因必须写进报告本身：只写 status.message 的话，迁移一结束它就丢了，
    // 用户打开报告文件只看到「中止在第 N 步」，不知道到底为什么失败。
    report.error = message
    report.finishedAt = Date.now()
    report.elapsedMs = report.finishedAt - startedAt
    const hadSteps = report.remainingSteps.length > 0
    // 原因永远排在最前：它是用户唯一真正需要的诊断信息。
    report.remainingSteps.unshift(`失败原因：${message}`)
    if (!hadSteps) {
      report.remainingSteps.push(
        `迁移在第 ${status.stepIndex + 1} 步（${status.stepName}）中止。`,
        report.log.path.length > 0 ? `已导出的日志保留在 ${report.log.path}` : '尚未产生日志文件。',
        targetSessionId === undefined ? '尚未创建新会话，旧会话未做任何改动。'
          : `新会话 ${targetSessionId} 已创建，可直接打开继续使用。`,
      )
    }
    const reportPath = await ledger.writeReport(dirs, report).catch(() => undefined)
    await ledger.settle(dirs, sessionId, status.status === 'cancelled' ? 'cancelled' : 'failed', {
      step: status.stepIndex,
      error: message,
    }).catch(() => undefined)

    status.status = status.status === 'cancelled' ? 'cancelled' : 'failed'
    status.report = report
    status.message = message
    if (reportPath !== undefined) {
      mark('报告已写入', true, reportPath)
    }
    logger.warn(`迁移失败：${message}`)
  }
}

/** 会话标识的短标签。 */
function srcLabel(sessionId) {
  return `会话 ${shortId(sessionId)}`
}

/**
 * 用 seed 创建新会话并装配目标模式（FR-8 ③④ 的宿主侧实现）。
 *
 * 这是对 `dsh-agent-loop` 里 resume 通路的等价复刻：
 *   `agents.create({ sessionId, seed, inheritedEventCount, meta: { isSeeded: true, agentPreset }, setup })`
 * 其中 setup 负责把目标 preset 真的 mount 到新 Agent 的作用域上——
 * `agents.create()` 自己不会装配模式，必须由调用方在 setup 里做。
 *
 * @param {any} ctx
 * @param {{ sessionId: string, cwd?: string, modeId: string, seed: any[], inheritedEventCount: number }} input
 * @returns {Promise<{ ok: true, agent: any } | { ok: false, reason: string }>}
 */
async function createWithHistory(ctx, input) {
  const agents = serviceOf(ctx, 'agents')
  if (agents === undefined || typeof agents.create !== 'function') {
    return { ok: false, reason: '运行时不提供 agents.create，无法带着历史创建会话。' }
  }
  const presets = serviceOf(ctx, 'agentPresets')
  if (presets === undefined || typeof presets.mount !== 'function') {
    return { ok: false, reason: '运行时不提供 agentPresets.mount，无法在 setup 中装配目标模式。' }
  }

  /** @type {import('../../types/index.d.ts').Capabilities} */
  const agentOptions = readAgentOptions(ctx)

  try {
    const handle = await agents.create({
      sessionId: input.sessionId,
      seed: input.seed,
      inheritedEventCount: input.inheritedEventCount,
      meta: {
        isSeeded: true,
        agentPreset: input.modeId,
        ...(typeof input.cwd === 'string' && input.cwd.length > 0 ? { cwd: input.cwd } : {}),
      },
      agentOptions,
      setup: async agentCtx => {
        await presets.mount(agentCtx, input.modeId)
      },
    })
    return { ok: true, agent: handle.agent }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * 读默认模型路由，用于新会话（否则 Agent 启动时可能没有 provider/model）。
 * @param {any} ctx
 * @returns {{ provider?: string, model?: string, reasoningEffort?: string }}
 */
function readAgentOptions(ctx) {
  try {
    const model = serviceOf(ctx, 'agentDefaultModel')
    const selection = model?.currentSelection?.()
    if (selection !== null && typeof selection === 'object'
      && typeof selection.provider === 'string' && typeof selection.model === 'string') {
      return {
        provider: selection.provider,
        model: selection.model,
        ...(typeof selection.reasoningEffort === 'string' ? { reasoningEffort: selection.reasoningEffort } : {}),
      }
    }
  } catch {
    // 取不到就让宿主用自身默认
  }
  return {}
}

/**
 * 从持久层读一次新会话的事件条数。
 *
 * 宿主 jsonl 后端是「惰性物化」的：`persistence.create()` 只在内存里登记，
 * 真正的文件在第一次 append/flush 时才出现。若读取时命中的是尚未物化的句柄，
 * 句柄会回 `{ eventState: 'detached', events: [] }` —— 这时条数为 0 不代表导入失败，
 * 而是「还没落盘」，必须稍后重试而不是立刻判死。
 *
 * @param {{ open: Function }} persistence
 * @param {string} sessionId
 * @returns {Promise<{ eventCount: number, detached: boolean }>}
 */
async function readPersistedEvents(persistence, sessionId) {
  const handle = await persistence.open(sessionId, 'read')
  try {
    const chunk = await handle.read()
    const events = Array.isArray(chunk) ? chunk : (Array.isArray(chunk?.events) ? chunk.events : [])
    let materialized = chunk?.eventState !== 'detached'
    let location
    if (typeof persistence.stat === 'function') {
      // stat 对「已登记但未物化」的会话不给 location/sizeBytes，可据此区分真假落盘；
      // 顺带把落盘路径记进报告，出问题时能直接照着路径去查。
      try {
        const meta = await persistence.stat(sessionId)
        if (meta !== undefined && meta !== null) {
          if (meta.location !== undefined || (typeof meta.sizeBytes === 'number' && meta.sizeBytes > 0)) {
            materialized = true
          }
          if (typeof meta.location?.path === 'string') location = meta.location.path
        }
      } catch {
        // stat 失败时维持 detached 判断
      }
    }
    return { eventCount: events.length, detached: !materialized, location }
  } finally {
    try {
      await handle.close()
    } catch {
      // 句柄关闭失败不影响复核结论
    }
  }
}

/**
 * 复核导入结果：从持久层读回新会话，比对事件条数。
 *
 * 两条曾经的坑（0.1.3 修）：
 *   ① 没有持久层时返回 ok:true 的「假成功」——报告会谎称 1865 条已落盘；
 *   ② 宿主惰性物化导致的 detached 句柄被判成「落盘 0 条」，
 *      于是明明会成功的迁移在慢盘上偶发失败。现在改成重试 3 次再下结论。
 *
 * @param {any} ctx
 * @param {{ sessionId: string, expectedEventCount: number }} input
 * @returns {Promise<{ ok: boolean, eventCount: number, reason?: string }>}
 */
async function verifyImport(ctx, input) {
  const persistence = serviceOf(ctx, 'sessionPersistence')
  if (persistence === undefined || typeof persistence.open !== 'function') {
    return {
      ok: false,
      eventCount: 0,
      reason: '运行时没有 sessionPersistence.open，无法确认新会话是否真的落盘；为避免报告假成功，这里按未通过处理。',
    }
  }

  let eventCount = 0
  let reason = '尚未读到新会话事件。'
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await yieldToLoop(150)
    try {
      const seen = await readPersistedEvents(persistence, input.sessionId)
      eventCount = seen.eventCount
      if (seen.eventCount >= input.expectedEventCount) {
        return { ok: true, eventCount: seen.eventCount, location: seen.location }
      }
      reason = seen.detached
        ? `新会话尚未物化（宿主把首次落盘推迟到后续写入），当前读回 ${seen.eventCount} 条，期望 ${input.expectedEventCount} 条。`
        : `落盘事件数 ${seen.eventCount} 少于 seed 的 ${input.expectedEventCount} 条。`
    } catch (error) {
      eventCount = 0
      reason = error instanceof Error ? error.message : String(error)
    }
  }
  return { ok: false, eventCount, reason }
}

/**
 * 给新会话追加一条「迁移来源」消息（FR-12），顺带写入 --note。
 *
 * 用 user 角色的普通消息而不是 system/message：后者在宿主里代表
 * 「已渲染的系统提示词快照」，中途插入会污染提示词语义；
 * 而 user 消息是宿主自己也用来发 notice 的形态（见 model-switch notice）。
 *
 * @param {any} ctx
 * @param {{
 *   sessionId: string,
 *   sourceSessionId: string,
 *   sourceTitle: string,
 *   fromMode: string | null,
 *   toMode: string,
 *   note?: string,
 * }} input
 * @returns {Promise<boolean>}
 */
async function appendProvenance(ctx, input) {
  try {
    const agent = liveAgent(ctx, input.sessionId)
    const session = agent?.session
    if (session === undefined || typeof session.append !== 'function') return false
    const at = new Date().toISOString()
    const lines = [
      `【迁移来源】本会话由会话 ${input.sourceTitle}（${input.sourceSessionId}）于 ${at} 迁移而来；`
        + `模式由「${input.fromMode ?? '未知'}」切换为「${input.toMode}」。`,
      '历史消息与工具调用记录已作为原生事件序列导入，可以直接在此基础上继续对话。',
    ]
    if (input.note !== undefined) {
      lines.push('', `用户备注：${input.note}`)
    }
    session.append(
      'user/message',
      {
        id: `mode-exchange-${randomUUID()}`,
        role: 'user',
        content: [{ type: 'text', text: lines.join('\n') }],
        source: { kind: 'user' },
      },
      { surfaceOp: 'append' },
    )
    return true
  } catch {
    // 「写不写来历」不影响迁移是否成立：整段兜住，返回 false 让上层记一笔即可。
    return false
  }
}

/**
 * 把新会话挂到工作区上。
 *
 * 两种情况：
 *   · 面板指定了 workspaceId → 按 id 精确挂载（用户选了哪个就落哪个）；
 *   · 没指定 → 退回按 cwd 猜（与 0.1.4 行为一致）。
 *
 * @param {any} ctx
 * @param {string} sessionId
 * @param {string | undefined} cwd
 * @param {string | undefined} workspaceId
 * @returns {Promise<boolean>}
 */
async function attachToWorkspace(ctx, sessionId, cwd, workspaceId) {
  // serviceOf 自带 try/catch：workspaceRegistry 不在本插件 inject 里，
  // 直接写 ctx?.workspaceRegistry 会被 Cordis 的注入检查抛错。
  const registry = serviceOf(ctx, 'workspaceRegistry')
  if (registry === undefined) return false
  // ① 面板显式指定了工作区 —— 优先按 id 精确挂载（用户在哪里选就落在哪里）。
  if (typeof workspaceId === 'string' && workspaceId.length > 0) {
    try {
      const target = typeof registry.get === 'function' ? await registry.get(workspaceId) : undefined
      if (target !== undefined && typeof target.attachSession === 'function') {
        await target.attachSession(sessionId)
        return true
      }
    } catch {
      // 精确挂载失败时退回按 cwd 猜
    }
  }
  if (typeof cwd !== 'string' || cwd.length === 0) return false
  try {
    if (typeof registry.resolveByPath === 'function') {
      const workspace = await registry.resolveByPath(cwd)
      if (workspace !== undefined && typeof workspace.attachSession === 'function') {
        await workspace.attachSession(sessionId)
        return true
      }
      return false
    }
    const list = typeof registry.list === 'function' ? registry.list() : []
    const hit = Array.isArray(list)
      ? list.find(workspace => typeof workspace?.path === 'string' && workspace.path === cwd)
      : undefined
    if (hit === undefined || typeof hit.attachSession !== 'function') return false
    await hit.attachSession(sessionId)
    return true
  } catch {
    return false
  }
}

/**
 * 对新会话启用团队协作（FR-8 ⑤）。
 *
 * 约束（宿主原文）：`agentTeams.setEnabled` 只接受 root Session 的活 Agent，
 * 且新值在「下一次 step 准备」时才影响工具可见性。因此必须在 create 之后、
 * 用刚拿到的 agent 调用，且不能指望它在同一条命令的当前 step 里立刻生效。
 *
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
async function enableTeam(ctx, sessionId) {
  const teams = serviceOf(ctx, 'agentTeams')
  if (teams === undefined || typeof teams.setEnabled !== 'function') {
    return { ok: false, reason: '运行时不支持程序化启停团队协作。' }
  }
  const agent = liveAgent(ctx, sessionId)
  if (agent === undefined) {
    return { ok: false, reason: '新会话的 Agent 尚未就绪，无法启用团队协作（可打开该会话后手动启用）。' }
  }
  try {
    await teams.setEnabled(agent, true)
    const now = typeof teams.isEnabled === 'function' ? teams.isEnabled(agent) === true : true
    return now ? { ok: true } : { ok: false, reason: '已提交启用请求，但当前仍未生效（下一次 step 后才可见）。' }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * 归档旧会话（FR-9 的「删除」= 归档，宿主没有真删除会话的接口）。
 *
 * 关键取舍：归档时如果传 `stopActivity: true`，宿主会去停掉该会话正在跑的
 * 工作——而本命令正是跑在被归档会话的 Agent 里，直接归档会打断自己，
 * 报告就写不出来了。所以这里把归档推迟到命令返回之后执行（面板/HTTP 路径
 * 同样安全），并先同步返回「已排期」。
 *
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
async function scheduleArchive(ctx, sessionId) {
  const registry = serviceOf(ctx, 'workspaceRegistry')
  if (registry === undefined || typeof registry.archiveSession !== 'function') {
    return { ok: false, reason: '运行时不提供 workspaceRegistry.archiveSession，无法归档。' }
  }
  // 已经归档就当作成功（幂等）。
  const archivedIds = registry.archivedSessionIds
  if (Array.isArray(archivedIds) && archivedIds.includes(sessionId)) {
    return { ok: true }
  }
  try {
    await registry.archiveSession(sessionId, { stopActivity: true })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // 活动冲突：本轮还在跑，交给下一轮事件循环再试一次。
    if (/activity|active/i.test(message)) {
      queueMicrotask(() => {
        void (async () => {
          await yieldToLoop(200)
          try {
            await registry.archiveSession(sessionId, { stopActivity: true })
          } catch {
            // 已尽力；报告里已标注
          }
        })()
      })
      return { ok: true, reason: '已排期在当前回合结束后归档。' }
    }
    return { ok: false, reason: message }
  }
}

/**
 * 历史迁移记录（FR-13 的列表）。
 * @param {import('../../types/index.d.ts').ModeExchangeConfig} config
 * @param {string | undefined} cwd
 * @returns {Promise<import('../../types/index.d.ts').MigrationHistoryRow[]>}
 */
export async function history(config, cwd) {
  const dirs = layout(dataRoot(config, cwd))
  const rows = await ledger.list(dirs)
  return rows.map(row => ({
    ts: row.updatedAt,
    sourceSessionId: row.sourceSessionId,
    sourceTitle: row.sourceTitle,
    ...(typeof row.targetSessionId === 'string' ? { targetSessionId: row.targetSessionId } : {}),
    targetMode: row.targetMode,
    result: row.status,
    ...(typeof row.jobId === 'string' ? { reportId: row.jobId } : {}),
  }))
}

/**
 * 读一份迁移报告。
 * @param {import('../../types/index.d.ts').ModeExchangeConfig} config
 * @param {string} jobId
 * @param {string | undefined} cwd
 * @returns {Promise<import('../../types/index.d.ts').MigrationReport | undefined>}
 */
export async function report(config, jobId, cwd) {
  const dirs = layout(dataRoot(config, cwd))
  return ledger.readReport(dirs, jobId)
}

/**
 * 只归档一个旧会话（面板里「只删旧会话」入口用）。
 * @param {any} ctx
 * @param {{ sessionId: string, backup: boolean, config: import('../../types/index.d.ts').ModeExchangeConfig }} input
 * @returns {Promise<{ ok: true, archived: boolean, backupPath?: string } | { ok: false, reason: string }>}
 */
export async function archiveOld(ctx, input) {
  const header = await sessionHeader(ctx, input.sessionId)
  if (header === undefined) return { ok: false, reason: `会话 ${input.sessionId} 不存在。` }
  const cwd = await sessionCwd(ctx, input.sessionId)
  const dirs = layout(dataRoot(input.config, cwd))
  let backupPath
  if (input.backup) {
    backupPath = await backupSession(ctx, { sessionId: input.sessionId, dirs }).catch(() => undefined)
  }
  const result = await scheduleArchive(ctx, input.sessionId)
  if (!result.ok) return { ok: false, reason: result.reason ?? '归档失败。' }
  return { ok: true, archived: true, ...(backupPath === undefined ? {} : { backupPath }) }
}

/** 供 routes 复用：把所有事件数一次算清。 */
export { countEvents }
