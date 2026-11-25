/**
 * 切换快照持久化（FR-4 的跨重启部分）。
 *
 * 为什么必须落盘：配置字段全为非 volatile，用户在设置页改任何一个开关都会让宿主
 * 重启本插件的 apply，内存态全部丢失。如果快照只在内存里，`/switch-mode --revert`
 * 在改过设置之后就失效了。因此：
 *   · 每次成功切换写一条快照到 `state/switches.json`；
 *   · apply 启动时读回，重建 guard 表，并让面板显示「已切换」状态；
 *   · 回退成功后删除该会话的快照。
 *
 * 局限（已写进 README）：作用域级的 restrict/register 注册随 agent 生命周期存在，
 * 插件重启后这些注册仍在（它们挂在 agent.ctx 上，不随本插件 apply 重建），
 * 但本插件持有的 disposer 丢了。因此快照里额外记录 `deny`/`attached` 名单，
 * 重启后以「重新登记 guard 表」的方式保证拦截仍然有效。
 */
import { readJson, writeJsonAtomic } from './util.js'

/** @type {Map<string, import('../../types/index.d.ts').SwitchSnapshot>} */
const memory = new Map()

/** 当前快照文件路径；apply 时由 init 设定。 */
let filePath = null

/**
 * 设定快照文件路径并加载已落盘的快照。
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function init(path) {
  filePath = path
  const raw = await readJson(path, { sessions: {} })
  memory.clear()
  const sessions = raw !== null && typeof raw === 'object' && typeof raw.sessions === 'object'
    ? raw.sessions
    : {}
  for (const [sessionId, snapshot] of Object.entries(sessions)) {
    if (snapshot === null || typeof snapshot !== 'object') continue
    if (typeof snapshot.toMode !== 'string' || snapshot.toMode.length === 0) continue
    memory.set(sessionId, {
      sessionId,
      fromMode: typeof snapshot.fromMode === 'string' ? snapshot.fromMode : null,
      toMode: snapshot.toMode,
      at: typeof snapshot.at === 'number' ? snapshot.at : Date.now(),
      denied: Array.isArray(snapshot.denied) ? snapshot.denied.filter(name => typeof name === 'string') : [],
      attached: Array.isArray(snapshot.attached) ? snapshot.attached.filter(name => typeof name === 'string') : [],
      scoped: snapshot.scoped === true,
    })
  }
}

/**
 * 落盘当前内存态。
 * @returns {Promise<void>}
 */
async function flush() {
  if (filePath === null) return
  const sessions = {}
  for (const [sessionId, snapshot] of memory.entries()) sessions[sessionId] = snapshot
  try {
    await writeJsonAtomic(filePath, { version: 1, updatedAt: Date.now(), sessions })
  } catch {
    // 落盘失败不影响功能：内存态仍然可用，只是重启后丢失
  }
}

/**
 * 读取某个会话的快照。
 * @param {string} sessionId
 * @returns {import('../../types/index.d.ts').SwitchSnapshot | undefined}
 */
export function get(sessionId) {
  return memory.get(sessionId)
}

/**
 * 写入并落盘快照。
 * @param {import('../../types/index.d.ts').SwitchSnapshot} snapshot
 * @returns {Promise<void>}
 */
export async function put(snapshot) {
  memory.set(snapshot.sessionId, snapshot)
  await flush()
}

/**
 * 删除某个会话的快照。
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function remove(sessionId) {
  const deleted = memory.delete(sessionId)
  if (deleted) await flush()
}

/**
 * 列出全部快照（启动时重建 guard 表用）。
 * @returns {readonly import('../../types/index.d.ts').SwitchSnapshot[]}
 */
export function all() {
  return [...memory.values()]
}

/**
 * 清空（仅测试用）。
 * @returns {Promise<void>}
 */
export async function reset() {
  memory.clear()
  await flush()
}
