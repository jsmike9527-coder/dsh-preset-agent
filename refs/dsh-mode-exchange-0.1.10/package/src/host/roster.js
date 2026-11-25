/**
 * 会话 / 工作区清单 —— 面板里「选一个会话」「选一个工作区」的数据源。
 *
 * 为什么需要这一层：
 *   · 宿主的 SessionHeader 里**没有标题字段**（只有 id/cwd/createdAt/agentPreset…），
 *     标题必须走 sessionTitle 服务，而它要的是 Session 实例；
 *   · 会话清单有多个来源（sessionQuery.listSessions / sessions.list /
 *     sessionPersistence.list），不同版本提供的字段不同，这里统一成一种形状；
 *   · 工作区归属要反向建索引（workspace.sessionIds → sessionId）。
 *
 * 所有服务都用 serviceOf 取（Cordis 的 ctx Proxy 对未 inject 的属性直接抛错），
 * 并且在每处调用前用 typeof 判方法存在 —— 宿主版本差异不该让面板整个崩掉。
 */
import { isArchived, isRunning, serviceOf, sessionTitleOf } from './services.js'

/** 默认最多返回多少个会话（面板下拉不需要无限长）。 */
const DEFAULT_LIMIT = 60

/**
 * 从各种来路的记录里抠出 header。
 * @param {any} value
 * @returns {any | undefined}
 */
function headerOf(value) {
  if (value === null || typeof value !== 'object') return undefined
  if (value.header !== null && typeof value.header === 'object') return value.header
  if (typeof value.id === 'string') return value
  return undefined
}

/**
 * 取 cwd 的最后一段，作为没有标题时的可读回退。
 * @param {string | undefined} cwd
 * @returns {string | undefined}
 */
function basenameOf(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) return undefined
  const parts = cwd.split(/[\\/]+/).filter(part => part.length > 0)
  return parts.length === 0 ? undefined : parts[parts.length - 1]
}

/**
 * 收集所有能看到的会话 header（按来源优先级去重）。
 *
 * 顺序即展示顺序：sessionQuery.listSessions() 是宿主的「newest-first」口径，
 * 后面的来源只补齐没见过的会话。
 *
 * @param {any} ctx
 * @returns {Promise<Array<{ header: any, live: boolean, persisted: boolean, formatStatus?: string }>>}
 */
async function collectHeaders(ctx) {
  /** @type {Array<{ header: any, live: boolean, persisted: boolean, formatStatus?: string }>} */
  const rows = []
  const seen = new Set()

  /** @param {any} raw @param {{ live?: boolean, persisted?: boolean, formatStatus?: string }} extra */
  const push = (raw, extra) => {
    const header = headerOf(raw)
    const id = typeof header?.id === 'string' ? header.id : undefined
    if (id === undefined || seen.has(id)) return
    seen.add(id)
    rows.push({
      header,
      live: extra.live === true,
      persisted: extra.persisted === true,
      ...(typeof extra.formatStatus === 'string' ? { formatStatus: extra.formatStatus } : {}),
    })
  }

  const query = serviceOf(ctx, 'sessionQuery')
  if (query !== undefined && typeof query.listSessions === 'function') {
    try {
      const records = await query.listSessions()
      if (Array.isArray(records)) {
        for (const record of records) {
          push(record, { live: record?.live === true, persisted: record?.persisted === true, formatStatus: record?.formatStatus })
        }
      }
    } catch {
      // 列不出来就换下一个来源
    }
  }

  const store = serviceOf(ctx, 'sessions')
  if (store !== undefined && typeof store.list === 'function') {
    try {
      const list = store.list()
      if (Array.isArray(list)) {
        for (const session of list) push(session, { live: true, persisted: true })
      }
    } catch {
      // 同上
    }
  }

  const persistence = serviceOf(ctx, 'sessionPersistence')
  if (persistence !== undefined && typeof persistence.list === 'function') {
    try {
      const snapshots = await persistence.list()
      if (Array.isArray(snapshots)) {
        for (const snapshot of snapshots) {
          push(snapshot, { persisted: true, formatStatus: snapshot?.formatStatus })
        }
      }
    } catch {
      // 同上
    }
  }

  return rows
}

/**
 * sessionId → workspaceId 的反向索引。
 * @param {any} ctx
 * @returns {{ bySession: Map<string, string>, workspaces: any[] }}
 */
function workspaceIndex(ctx) {
  /** @type {Map<string, string>} */
  const bySession = new Map()
  /** @type {any[]} */
  const workspaces = []
  const registry = serviceOf(ctx, 'workspaceRegistry')
  if (registry === undefined || typeof registry.list !== 'function') return { bySession, workspaces }
  let list
  try {
    list = registry.list()
  } catch {
    return { bySession, workspaces }
  }
  if (!Array.isArray(list)) return { bySession, workspaces }
  for (const workspace of list) {
    if (workspace === null || typeof workspace !== 'object') continue
    const id = typeof workspace.id === 'string' ? workspace.id : undefined
    if (id === undefined) continue
    const sessionIds = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []
    workspaces.push({ workspace, sessionIds })
    for (const sessionId of sessionIds) {
      if (typeof sessionId === 'string' && !bySession.has(sessionId)) bySession.set(sessionId, id)
    }
  }
  return { bySession, workspaces }
}

/**
 * 面板用的会话清单。
 *
 * 形状固定为 `{ id, title, cwd, workspaceId, createdAt, live, persisted, running, archived }`，
 * 标题的回退顺序与宿主客户端一致：durable title → cwd 的最后一段 → 会话 id。
 *
 * 子代理会话（`header.origin === 'subagent'`）默认不出现在清单里 ——
 * 它们既不能切换模式也不能迁移，混进列表只会让人误选。
 *
 * @param {any} ctx
 * @param {{ limit?: number, includeSubagent?: boolean }} [options]
 * @returns {Promise<Array<{ id: string, title: string, cwd: string | null, workspaceId: string | null, createdAt: number | null, live: boolean, persisted: boolean, running: boolean, archived: boolean }>>}
 */
export async function listSessionBriefs(ctx, options = {}) {
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : DEFAULT_LIMIT
  const includeSubagent = options.includeSubagent === true
  const { bySession } = workspaceIndex(ctx)
  const headers = await collectHeaders(ctx)

  /** @type {any[]} */
  const briefs = []
  for (const row of headers) {
    const header = row.header
    const id = typeof header?.id === 'string' ? header.id : undefined
    if (id === undefined) continue
    if (!includeSubagent && header.origin === 'subagent') continue
    const cwd = typeof header.cwd === 'string' && header.cwd.length > 0 ? header.cwd : null
    const title = (await sessionTitleOf(ctx, id)) ?? basenameOf(cwd ?? undefined) ?? id
    briefs.push({
      id,
      title,
      cwd,
      workspaceId: bySession.get(id) ?? null,
      createdAt: typeof header.createdAt === 'number' ? header.createdAt : null,
      live: row.live,
      persisted: row.persisted,
      running: isRunning(ctx, id),
      archived: isArchived(ctx, id),
    })
    if (briefs.length >= limit) break
  }
  return briefs
}

/**
 * 面板用的工作区清单。
 * @param {any} ctx
 * @returns {Array<{ id: string, title: string, path: string, sessionIds: string[], createdAt: number | null }>}
 */
export function listWorkspaceBriefs(ctx) {
  const { workspaces } = workspaceIndex(ctx)
  /** @type {any[]} */
  const briefs = []
  for (const entry of workspaces) {
    const workspace = entry.workspace
    const id = typeof workspace.id === 'string' ? workspace.id : undefined
    if (id === undefined) continue
    const path = typeof workspace.path === 'string' ? workspace.path : ''
    const title = typeof workspace.title === 'string' && workspace.title.length > 0
      ? workspace.title
      : (basenameOf(path) ?? id)
    briefs.push({
      id,
      title,
      path,
      sessionIds: entry.sessionIds.filter(sessionId => typeof sessionId === 'string'),
      createdAt: typeof workspace.createdAt === 'number' ? workspace.createdAt : null,
    })
  }
  return briefs
}

/**
 * 按 workspaceId 解析出「新会话该落在哪个目录」。
 *
 * 优先用 workspaceRegistry.get（宿主同步 API，但这里兼容 Promise 实现），
 * 拿不到就退回 list() 里找 —— 前者在旧版本里可能不存在。
 *
 * @param {any} ctx
 * @param {string} workspaceId
 * @returns {Promise<{ id: string, title: string, path: string } | undefined>}
 */
export async function workspaceTargetOf(ctx, workspaceId) {
  if (typeof workspaceId !== 'string' || workspaceId.length === 0) return undefined
  const registry = serviceOf(ctx, 'workspaceRegistry')
  if (registry === undefined) return undefined
  /** @param {any} workspace @returns {{ id: string, title: string, path: string } | undefined} */
  const shape = workspace => {
    if (workspace === null || typeof workspace !== 'object') return undefined
    const id = typeof workspace.id === 'string' ? workspace.id : undefined
    const path = typeof workspace.path === 'string' ? workspace.path : undefined
    if (id === undefined || path === undefined || path.length === 0) return undefined
    const title = typeof workspace.title === 'string' && workspace.title.length > 0
      ? workspace.title
      : (basenameOf(path) ?? id)
    return { id, title, path }
  }
  try {
    if (typeof registry.get === 'function') {
      const hit = await registry.get(workspaceId)
      const shaped = shape(hit)
      if (shaped !== undefined) return shaped
    }
  } catch {
    // 落到 list
  }
  try {
    const list = typeof registry.list === 'function' ? registry.list() : []
    if (Array.isArray(list)) {
      for (const workspace of list) {
        const shaped = shape(workspace)
        if (shaped !== undefined && shaped.id === workspaceId) return shaped
      }
    }
  } catch {
    // 放弃
  }
  return undefined
}

/**
 * 用主视图会话 id 猜「上次点进来的那个会话属于哪个工作区」。
 * @param {any} ctx
 * @param {string | null} sessionId
 * @returns {string | null}
 */
export function workspaceIdOfSession(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return null
  const { bySession } = workspaceIndex(ctx)
  return bySession.get(sessionId) ?? null
}
