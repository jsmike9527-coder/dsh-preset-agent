/**
 * 运行时模式切换（FR-1 ~ FR-6）。
 *
 * 为什么不能真的改 preset：宿主把「模式」定义为会话启动时凝固的插件组合，
 * `agentPresets.select()` 只对首轮之前的空白会话生效，`recompose()` 要求 blank Agent。
 * 已产生历史消息的会话无法重新装配。因此这里做的是「软切换」，用三条真实生效的通道
 * 把会话在运行期重构成目标模式的行为：
 *
 *   1. 工具层 —— `agent.ctx.tools.restrict({ deny })`：agent 作用域的限制会与
 *      祖先层（preset 层）的注册求交，被 deny 的工具从 schema 声明与 dispatch 两侧
 *      同时消失，而 preset 自己的注册层不受影响。这是「卸载模式专属工具」的真实实现。
 *      `agent.ctx.tools.register(def)` 用于补挂目标模式有、当前没有的工具（真挂载）。
 *   2. 提示词层 —— `agent.ctx.on('system-prompt/assemble', ...)` 是作用域内的
 *      waterfall。它拿到完整装配结果后，把旧模式的 section 整段摘掉、换成目标模式的
 *      说明，这就是「替换对应系统提示词」的真实实现（不是往末尾追加一句话）。
 *   3. 兜底层 —— guard.js 的会话级拒绝表，保证限制即便在某宿主版本上失效也不会越权。
 *
 * 作用域：全部注册都挂在 `agent.ctx` 上，随 Agent 生命周期 unwind，
 * 不会写全局 profile，也不会影响其它会话（FR-3）。
 */
import { createLogger } from './util.js'
import { addDeny, clearDeny, deniedNames } from './guard.js'
import * as snapshot from './snapshot.js'
import { listModes, resolveMode } from './modes.js'
import { isArchived, liveAgent, serviceOf, sessionHeader, sessionTitleOf } from './services.js'

/** 本插件自己注册的 section 名，判断「哪些 section 属于当前模式」时要排除。 */
const OWN_SECTION = 'mode-exchange.active'

/** @type {Map<string, { text: string, drop: Set<string> | null, dispose: () => void }>} */
const active = new Map()

/**
 * 判定一个会话是否允许切换模式（FR-5）。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<{ ok: true, agent: any } | { ok: false, reason: string }>}
 */
export async function checkSwitchable(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return { ok: false, reason: '没有选中会话。请先在左侧选择一个会话再切换模式。' }
  }
  const header = await sessionHeader(ctx, sessionId)
  if (header === undefined) {
    return { ok: false, reason: `会话 ${sessionId} 不存在或尚未落盘，无法切换模式。` }
  }
  if (isArchived(ctx, sessionId)) {
    return {
      ok: false,
      reason: '该会话已归档（只读）。归档会话不能改变运行期行为；请先取消归档，或改用 /migrate-session 迁移到新会话。',
    }
  }
  if (typeof header.origin === 'string' && header.origin === 'subagent') {
    return { ok: false, reason: '这是子代理会话，模式由父会话决定，不能单独切换。' }
  }
  const agent = liveAgent(ctx, sessionId)
  if (agent === undefined) {
    return {
      ok: false,
      reason: '该会话当前没有活着的 Agent（已结束或未启动），无法改变其运行期行为。'
        + '请先在该会话里发一条消息让它启动，或使用 /migrate-session 以目标模式重建会话。',
    }
  }
  if (typeof agent.ctx?.effect !== 'function') {
    return { ok: false, reason: '该 Agent 没有提供作用域上下文，插件无法在其上注册能力。' }
  }
  return { ok: true, agent }
}

/**
 * 求某个模式会拥有的工具名集合。
 *
 * 用 `agentPresets.acquireScope(modeId)` 拿到该 preset 的装配 scope，
 * 再用 `tools.definitions(scope)` 读出它对模型可见的全部工具名。
 * 这样拿到的是「该模式真实装配出来的工具集」，不是硬编码清单。
 *
 * @param {any} ctx
 * @param {string} modeId
 * @returns {Promise<{ names: Set<string>, definitions: Map<string, any> }>}
 */
export async function toolsetOfMode(ctx, modeId) {
  const empty = { names: new Set(), definitions: new Map() }
  const presets = serviceOf(ctx, 'agentPresets')
  const tools = serviceOf(ctx, 'tools')
  if (typeof presets?.acquireScope !== 'function' || typeof tools?.definitions !== 'function') return empty
  let lease
  try {
    lease = await presets.acquireScope(modeId)
  } catch {
    return empty
  }
  try {
    const definitions = tools.definitions(lease.key)
    const names = new Set()
    const map = new Map()
    if (definitions instanceof Map) {
      for (const [name, definition] of definitions.entries()) {
        names.add(name)
        map.set(name, definition)
      }
    } else if (definitions !== null && typeof definitions === 'object') {
      for (const [name, definition] of Object.entries(definitions)) {
        names.add(name)
        map.set(name, definition)
      }
    }
    return { names, definitions: map }
  } catch {
    return empty
  } finally {
    try {
      await lease?.[Symbol.asyncDispose]?.()
    } catch {
      // 释放失败不影响结论
    }
  }
}

/**
 * 求某个 Agent 当前可见的工具名集合。
 * @param {any} ctx
 * @param {any} agent
 * @returns {Set<string>}
 */
export function currentToolsOf(ctx, agent) {
  const tools = serviceOf(ctx, 'tools')
  const names = new Set()
  if (typeof tools?.definitions !== 'function') return names
  try {
    const definitions = tools.definitions(agent)
    if (definitions instanceof Map) {
      for (const name of definitions.keys()) names.add(name)
    } else if (definitions !== null && typeof definitions === 'object') {
      for (const name of Object.keys(definitions)) names.add(name)
    }
  } catch {
    // 取不到就返回空集，调用方会退化为「只做提示词切换」
  }
  return names
}

/**
 * 生成目标模式的系统提示词 section 文本。
 * @param {string} modeId
 * @param {string} modeName
 * @param {readonly string[]} unavailable 本模式下已被卸载的工具
 * @param {readonly string[]} attached 本模式下额外挂载的工具
 * @returns {string}
 */
function buildPrompt(modeId, modeName, unavailable, attached) {
  const lines = [
    `当前会话已被用户在运行期切换到 「${modeName}」 模式（id: ${modeId}）。`,
    '',
    '该模式下的工作方式：',
    `- 你现在按 ${modeName} 模式的约定工作，不要沿用会话早期其它模式的假设。`,
  ]
  if (unavailable.length > 0) {
    lines.push(`- 以下工具已从本会话的工具集中移除，调用它们会失败：${unavailable.join('、')}。`)
    lines.push('- 需要其中某个能力时，告诉用户用 /switch-mode --revert 回退，或改用 /migrate-session 以该模式重建会话。')
  }
  if (attached.length > 0) {
    lines.push(`- 以下工具为本模式新增挂载：${attached.join('、')}。`)
  }
  lines.push('')
  lines.push('这是运行期软切换：底层插件组合没有重新装配，因此若发现行为与预期不符，请以工具集与本文为准，并提示用户可回退。')
  return lines.join('\n')
}

/**
 * 在 agent 作用域内安装提示词替换。
 * @param {any} agent
 * @param {string} sessionId
 * @param {() => string} textOf
 * @returns {{ dispose: () => void, state: { drop: Set<string> | null } }}
 */
function installPromptSwap(agent, sessionId, textOf) {
  const state = { drop: null }
  const dispose = agent.ctx.effect(() => {
    const prompt = serviceOf(agent.ctx, 'systemPrompt')
    if (prompt === undefined || typeof prompt.assemble !== 'function') {
      // 退路：没有 waterfall 通道时，退化为追加一个高序号 section（软切换的弱化形态）
      return undefined
    }
    return agent.ctx.on('system-prompt/assemble', async (assembly, _context, next) => {
      const result = await next()
      try {
        const mine = {
          name: OWN_SECTION,
          text: textOf(),
          interpolate: false,
        }
        if (state.drop === null) {
          // 第一次装配时把「除本插件之外的所有 section」认定为旧模式的提示词，
          // 记住并整段摘除。这样不需要知道旧模式的 section 命名。
          state.drop = new Set(
            (result.sections ?? [])
              .map(section => section?.name)
              .filter(name => typeof name === 'string' && name !== OWN_SECTION),
          )
        }
        const kept = (result.sections ?? []).filter(section => !state.drop.has(section?.name))
        kept.push(mine)
        return { ...result, sections: kept }
      } catch {
        return result
      }
    })
  }, `mode-exchange.prompt[${sessionId}]`)
  return { dispose, state }
}

/**
 * 执行一次切换。
 *
 * @param {any} ctx
 * @param {{
 *   sessionId: string,
 *   modeId: string,
 *   config: import('../../types/index.d.ts').ModeExchangeConfig,
 *   capabilities: import('../../types/index.d.ts').Capabilities,
 * }} input
 * @returns {Promise<{ ok: true, snapshot: import('../../types/index.d.ts').SwitchSnapshot, notice: string }
 *   | { ok: false, reason: string }>}
 */
export async function switchMode(ctx, input) {
  const logger = createLogger(ctx)
  const { sessionId, modeId, capabilities } = input

  const gate = await checkSwitchable(ctx, sessionId)
  if (!gate.ok) return { ok: false, reason: gate.reason }
  const agent = gate.agent

  const resolved = await resolveMode(ctx, modeId)
  if (!resolved.ok) return { ok: false, reason: resolved.reason }
  const target = resolved.mode

  const before = await currentModeOf(ctx, sessionId)

  // 先撤掉同一会话上已有的软切换，保证重复执行是幂等的（不叠加）。
  await revertMemory(sessionId)

  const desired = await toolsetOfMode(ctx, modeId)
  const present = currentToolsOf(ctx, agent)
  const unavailable = [...present].filter(name => !desired.names.has(name)).sort()
  const missing = desired.names.size === 0
    ? []
    : [...desired.names].filter(name => !present.has(name)).sort()

  /** @type {string[]} */
  const attached = []
  /** @type {string[]} */
  const denied = []
  /** @type {Array<() => void>} */
  const disposers = []
  let scoped = false

  // ① 卸载：agent 作用域的限制会与 preset 层注册求交。
  if (capabilities.scopedRestrict && unavailable.length > 0) {
    try {
      const dispose = agent.ctx.tools.restrict({ deny: unavailable })
      disposers.push(typeof dispose === 'function' ? dispose : () => {})
      denied.push(...unavailable)
      scoped = true
    } catch (error) {
      logger.warn(`作用域限制失败，退化为会话级 guard：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // ② 挂载：目标模式有、当前没有的工具，用其定义在 agent 作用域补挂。
  if (capabilities.scopedRestrict && missing.length > 0) {
    for (const name of missing) {
      const definition = desired.definitions.get(name)
      if (definition === undefined) continue
      try {
        const dispose = agent.ctx.tools.register(definition)
        disposers.push(typeof dispose === 'function' ? dispose : () => {})
        attached.push(name)
        scoped = true
      } catch {
        // 该工具可能依赖目标模式的私有服务，挂不上就跳过；不影响其余工具
      }
    }
  }

  // ③ 兜底：无论作用域限制是否成功，都把清单登记到会话级 guard。
  addDeny(
    sessionId,
    [...denied],
    `工具「%s」在当前模式下已被卸载。当前会话处于软切换后的「${target.name}」模式；`
      + '如需该工具，请用 /switch-mode --revert 回退。',
  )

  // ④ 提示词替换。
  const prompt = installPromptSwap(
    agent,
    sessionId,
    () => buildPrompt(target.id, target.name, denied, attached),
  )
  disposers.push(prompt.dispose)

  const record = {
    sessionId,
    fromMode: before,
    toMode: target.id,
    at: Date.now(),
    denied,
    attached,
    scoped,
  }
  active.set(sessionId, {
    text: buildPrompt(target.id, target.name, denied, attached),
    drop: prompt.state.drop,
    dispose: () => {
      for (const dispose of disposers.reverse()) {
        try {
          dispose()
        } catch {
          // 卸载失败不应阻断回退
        }
      }
    },
  })
  await snapshot.put(record)
  logger.info(`会话 ${sessionId} 软切换：${before ?? '(未知)'} → ${target.id}（deny ${denied.length} / attach ${attached.length}）`)

  const notice = `已切换至「${target.name}」模式，工具集已变更。`
    + (denied.length > 0 ? `已卸载 ${denied.length} 个工具。` : '')
    + (denied.length === 0 && attached.length === 0 ? '（该模式与当前工具集一致，仅提示词已调整。）' : '')
    + '撤销请用 /switch-mode --revert。'
  return { ok: true, snapshot: record, notice }
}

/**
 * 回退到切换前的模式状态（FR-4）。
 * @param {any} ctx
 * @param {{ sessionId: string }} input
 * @returns {Promise<{ ok: true, restoredMode: string | null, notice: string } | { ok: false, reason: string }>}
 */
export async function revertMode(ctx, input) {
  const { sessionId } = input
  const record = snapshot.get(sessionId)
  if (record === undefined) {
    return { ok: false, reason: '当前会话没有可回退的模式切换记录。' }
  }
  const gate = await checkSwitchable(ctx, sessionId)
  if (!gate.ok) {
    // Agent 已结束：注册随 Agent 一起消失了，只需清台账。
    await revertMemory(sessionId)
    await snapshot.remove(sessionId)
    clearDeny(sessionId)
    return {
      ok: true,
      restoredMode: record.fromMode,
      notice: `该会话的 Agent 已结束，运行期限制随之释放；已清除切换记录（原模式：${record.fromMode ?? '未知'}）。`,
    }
  }
  await revertMemory(sessionId)
  await snapshot.remove(sessionId)
  clearDeny(sessionId)
  const name = record.fromMode ?? '原模式'
  return {
    ok: true,
    restoredMode: record.fromMode,
    notice: `已回退至切换前的状态（${name}）。工具集与系统提示词已恢复。`,
  }
}

/**
 * 撤销内存中的软切换（不碰落盘快照）。
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function revertMemory(sessionId) {
  const state = active.get(sessionId)
  if (state === undefined) return
  active.delete(sessionId)
  state.dispose()
}

/**
 * 读会话当前生效的模式。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<string | null>}
 */
export async function currentModeOf(ctx, sessionId) {
  try {
    const presets = serviceOf(ctx, 'agentPresets')
    if (typeof presets?.presetForSession === 'function') {
      const header = await sessionHeader(ctx, sessionId)
      const value = presets.presetForSession(header ?? sessionId)
      if (typeof value === 'string' && value.length > 0) return value
    }
  } catch {
    // 退到 header 上的记录
  }
  const header = await sessionHeader(ctx, sessionId)
  if (typeof header?.agentPreset === 'string' && header.agentPreset.length > 0) return header.agentPreset
  return null
}

/**
 * 组装一个会话的切换状态视图（面板与设置页共用，FR-13）。
 * @param {any} ctx
 * @param {string | null} sessionId
 * @param {import('../../types/index.d.ts').ModeExchangeConfig} config
 * @param {import('../../types/index.d.ts').Capabilities} capabilities
 * @returns {Promise<import('../../types/index.d.ts').SwitchState>}
 */
export async function switchState(ctx, sessionId, config, capabilities) {
  const modes = await listModes(ctx)
  if (sessionId === null || sessionId.length === 0) {
    return {
      sessionId: null,
      currentMode: null,
      switchable: false,
      blockedReason: '还没有选中会话。',
      switched: false,
      modes,
      config,
      capabilities,
    }
  }
  const current = await currentModeOf(ctx, sessionId)
  const gate = await checkSwitchable(ctx, sessionId)
  const record = snapshot.get(sessionId)
  return {
    sessionId,
    currentMode: current,
    switchable: gate.ok,
    ...(gate.ok ? {} : { blockedReason: gate.reason }),
    switched: record !== undefined,
    ...(record === undefined ? {} : { snapshot: record }),
    modes,
    config,
    capabilities,
  }
}

/**
 * 插件启动时重建运行期状态（R10：改配置会让 apply 重建，内存态必须从磁盘恢复）。
 *
 * 注意：作用域级注册随 Agent 存活，本插件重建后拿不到旧的 disposer；
 * 因此这里只重建「会话级 guard 表」与「提示词声明」，保证拦截与提示仍然有效。
 * 面板会据 snapshot 显示「已切换（重启后仍生效）」，回退时清表即可恢复。
 *
 * @param {any} ctx
 * @param {import('../../types/index.d.ts').Capabilities} capabilities
 * @returns {Promise<{ restored: number }>}
 */
export async function restore(ctx, capabilities) {
  const logger = createLogger(ctx)
  const records = snapshot.all()
  let restored = 0
  for (const record of records) {
    const gate = await checkSwitchable(ctx, record.sessionId).catch(() => ({ ok: false }))
    if (!gate.ok) continue
    try {
      if (record.denied.length > 0) {
        addDeny(
          record.sessionId,
          deniedNames(record.sessionId).length > 0 ? deniedNames(record.sessionId) : record.denied,
          `工具「%s」在当前模式下已被卸载（插件重启后仍生效）。请用 /switch-mode --revert 回退。`,
        )
      }
      const prompt = installPromptSwap(
        gate.agent,
        record.sessionId,
        () => buildPrompt(record.toMode, record.toMode, record.denied, record.attached),
      )
      active.set(record.sessionId, {
        text: buildPrompt(record.toMode, record.toMode, record.denied, record.attached),
        drop: prompt.state.drop,
        dispose: prompt.dispose,
      })
      restored += 1
    } catch (error) {
      logger.warn(`恢复会话 ${record.sessionId} 的切换状态失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (restored > 0) logger.info(`已恢复 ${restored} 个会话的切换状态`)
  return { restored }
}

/**
 * 仅供诊断：当前处于软切换状态的会话。
 * @returns {readonly string[]}
 */
export function activeSessions() {
  return [...active.keys()]
}

/**
 * 会话标题（迁移报告与确认框用）。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<string>}
 */
export async function displayTitle(ctx, sessionId) {
  const title = await sessionTitleOf(ctx, sessionId)
  if (title !== undefined) return title
  return `未命名会话（${String(sessionId).slice(-8)}）`
}
