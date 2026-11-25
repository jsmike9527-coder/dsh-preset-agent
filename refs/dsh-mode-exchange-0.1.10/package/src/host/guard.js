/**
 * 按会话的工具拦截表 —— 迁移期与软切换期的兜底防线。
 *
 * 主路径是「作用域级真卸载」：在 `agent.ctx.tools.restrict({ deny })` 里 deny 掉
 * 目标模式不提供的工具，连 schema 都不会出现在模型面前（见 switch.js）。
 *
 * 本模块是第二道防线，覆盖主路径做不到的情况：
 *   · restrict 在某个宿主版本上不可用（capabilities.scopedRestrict === false）；
 *   · 迁移过程中源会话被禁用工具，但仍想给它一个可读的拒绝理由。
 *
 * 设计要点（对应风险 R1）：guard 只在「表里明确记录了该会话」且「名字命中」时才拒绝，
 * 任何异常、任何未登记会话、任何空表都一律放行。
 */
import { serviceOf } from './services.js'

/** @type {Map<string, Set<string>>} sessionId → 被拒绝的工具名 */
const denyTable = new Map()

/** @type {Map<string, string>} sessionId → 拒绝时返回给模型的原因 */
const reasonTable = new Map()

/**
 * 为某个会话登记拒绝清单（覆盖式）。
 * @param {string} sessionId
 * @param {readonly string[]} names
 * @param {string} [reason]
 */
export function setDeny(sessionId, names, reason) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return
  const set = new Set(
    (Array.isArray(names) ? names : [])
      .filter(name => typeof name === 'string' && name.length > 0),
  )
  if (set.size === 0) denyTable.delete(sessionId)
  else denyTable.set(sessionId, set)
  if (typeof reason === 'string' && reason.length > 0) reasonTable.set(sessionId, reason)
  else reasonTable.delete(sessionId)
}

/**
 * 追加拒绝项。
 * @param {string} sessionId
 * @param {readonly string[]} names
 * @param {string} [reason]
 */
export function addDeny(sessionId, names, reason) {
  const existing = denyTable.get(sessionId)
  const next = new Set(existing ?? [])
  for (const name of Array.isArray(names) ? names : []) {
    if (typeof name === 'string' && name.length > 0) next.add(name)
  }
  setDeny(sessionId, [...next], reason)
}

/**
 * 清掉某个会话的拒绝清单。
 * @param {string} sessionId
 */
export function clearDeny(sessionId) {
  denyTable.delete(sessionId)
  reasonTable.delete(sessionId)
}

/**
 * 该会话当前是否有拒绝项（面板展示用）。
 * @param {string} sessionId
 * @returns {readonly string[]}
 */
export function deniedNames(sessionId) {
  const set = denyTable.get(sessionId)
  return set === undefined ? [] : [...set]
}

/**
 * 判定一次工具调用是否应当被拒绝。
 * 返回 undefined 表示放行。
 * @param {{ agent?: { id?: string }, name?: string }} execution
 * @returns {{ reason: string } | undefined}
 */
function judge(execution) {
  try {
    const sessionId = execution?.agent?.id
    if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
    const set = denyTable.get(sessionId)
    if (set === undefined || set.size === 0) return undefined
    const name = execution?.name
    if (typeof name !== 'string' || !set.has(name)) return undefined
    const custom = reasonTable.get(sessionId)
    // 文案里允许用 %s 占位工具名，未提供模板时用默认句子。
    const template = typeof custom === 'string' && custom.length > 0
      ? custom
      : '工具「%s」在当前模式下不可用。当前会话已切换到其它模式，该工具不在该模式的工具集内；'
        + '如需使用，请通过 /switch-mode --revert 回退，或改用其它会话。'
    return { reason: template.replaceAll('%s', name) }
  } catch {
    return undefined
  }
}

/**
 * 安装全局 guard。整个插件生命周期只需调用一次，返回 disposer。
 *
 * 注意：guard 是全局注册的（`ctx.tools.guard`），但它内部按 sessionId 查表，
 * 对未登记的会话完全透明，因此不会误伤其它会话。
 *
 * @param {any} ctx
 * @returns {() => void}
 */
export function installGuard(ctx) {
  try {
    // serviceOf 内部同时试 store 与属性访问，并吃掉「without inject」的抛错；
    // 这里不能写 ctx?.tools —— 属性访问在 Proxy 上会直接抛，?? 右侧根本走不到。
    const tools = serviceOf(ctx, 'tools')
    if (tools === undefined || typeof tools.guard !== 'function') {
      return () => {}
    }
    return tools.guard(judge)
  } catch {
    return () => {}
  }
}

/**
 * 仅供测试/诊断：清空整张表。
 */
export function resetAll() {
  denyTable.clear()
  reasonTable.clear()
}
