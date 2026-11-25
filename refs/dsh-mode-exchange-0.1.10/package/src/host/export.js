/**
 * 会话日志导出（FR-8 ①）与完整性校验（FR-8 ②）。
 *
 * 数据来源优先级：
 *   1. `sessionQuery.readSession(sessionId)` —— 返回 { session(header), inheritedEventCount, events }，
 *      事件是「经过校验与中断回合平衡后的连续原始事件」，最完整也最安全；
 *   2. 退路：`sessionPersistence.open(id, 'read')` + `handle.read()` 逐段读原始日志。
 *
 * 导出产物（都在 `<root>/exports/` 下）：
 *   · `<时间戳>-<短ID>.jsonl`      每行一个 SessionEvent，可直接被 append 回放；
 *   · `<时间戳>-<短ID>.meta.json`  导出元数据：header、inheritedEventCount、计数、sha256、来源模式。
 */
import { extname, join } from 'node:path'
import { serviceOf } from './services.js'
import {
  appendJsonl,
  ensureDir,
  exists,
  readJsonl,
  sha256,
  shortId,
  timestamp,
  writeJsonAtomic,
} from './util.js'

/**
 * 读一个会话的完整事件序列。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<{
 *   header: any,
 *   inheritedEventCount: number,
 *   events: any[],
 *   source: 'sessionQuery' | 'sessionPersistence',
 * }>}
 */
export async function readEvents(ctx, sessionId) {
  const query = serviceOf(ctx, 'sessionQuery')
  if (typeof query?.readSession === 'function') {
    const result = await query.readSession(sessionId)
    if (result !== null && typeof result === 'object' && Array.isArray(result.events)) {
      return {
        header: result.session,
        inheritedEventCount: typeof result.inheritedEventCount === 'number' ? result.inheritedEventCount : 0,
        events: result.events,
        source: 'sessionQuery',
      }
    }
  }
  const persistence = serviceOf(ctx, 'sessionPersistence')
  if (typeof persistence?.open !== 'function') {
    throw new Error('运行时既没有 sessionQuery.readSession，也没有 sessionPersistence.open，无法读取会话日志。')
  }
  const handle = await persistence.open(sessionId, 'read')
  try {
    const chunk = await handle.read()
    const events = Array.isArray(chunk) ? chunk : (Array.isArray(chunk?.events) ? chunk.events : [])
    return {
      header: handle.header,
      inheritedEventCount: typeof handle.inheritedEventCount === 'number' ? handle.inheritedEventCount : 0,
      events,
      source: 'sessionPersistence',
    }
  } finally {
    try {
      handle.close()
    } catch {
      // 关闭失败不影响已读到的数据
    }
  }
}

/**
 * 统计事件里的消息数与工具调用数。
 * @param {readonly any[]} events
 * @returns {{ messageCount: number, toolCallCount: number, toolResultCount: number }}
 */
export function countEvents(events) {
  let messageCount = 0
  let toolCallCount = 0
  let toolResultCount = 0
  for (const event of events) {
    const type = event?.type
    if (type === 'user/message' || type === 'assistant/message') messageCount += 1
    else if (type === 'tool/call') toolCallCount += 1
    else if (type === 'tool/result') toolResultCount += 1
  }
  return { messageCount, toolCallCount, toolResultCount }
}

/**
 * 导出会话日志。
 * @param {any} ctx
 * @param {{
 *   sessionId: string,
 *   dirs: ReturnType<typeof import('./config.js').layout>,
 *   mode?: string | null,
 *   title?: string,
 * }} input
 * @returns {Promise<{
 *   logPath: string,
 *   metaPath: string,
 *   sha256: string,
 *   eventCount: number,
 *   messageCount: number,
 *   toolCallCount: number,
 *   inheritedEventCount: number,
 *   header: any,
 *   events: any[],
 * }>}
 */
export async function exportSession(ctx, input) {
  const { sessionId, dirs } = input
  await ensureDir(dirs.exports)

  const { header, inheritedEventCount, events, source } = await readEvents(ctx, sessionId)
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error(`会话 ${sessionId} 的日志为空，没有可导出的内容。`)
  }

  const stamp = timestamp()
  const base = `${stamp}-${shortId(sessionId)}`
  const logPath = join(dirs.exports, `${base}.jsonl`)
  const metaPath = join(dirs.exports, `${base}.meta.json`)

  // 覆盖写：同一个 (秒级时间戳, 短ID) 组合重复执行时不该产生两份。
  const { writeFile } = await import('node:fs/promises')
  const payload = events.map(event => `${JSON.stringify(event)}\n`).join('')
  await writeFile(logPath, payload, 'utf8')

  const counts = countEvents(events)
  const digest = sha256(payload)
  const meta = {
    version: 1,
    exportedAt: Date.now(),
    exportedAtText: new Date().toISOString(),
    sourceMode: input.mode ?? null,
    sessionId,
    title: input.title ?? null,
    sourceReader: source,
    header,
    inheritedEventCount,
    eventCount: events.length,
    messageCount: counts.messageCount,
    toolCallCount: counts.toolCallCount,
    toolResultCount: counts.toolResultCount,
    sha256: digest,
    logFile: logPath,
  }
  await writeJsonAtomic(metaPath, meta)

  return {
    logPath,
    metaPath,
    sha256: digest,
    eventCount: events.length,
    messageCount: counts.messageCount,
    toolCallCount: counts.toolCallCount,
    inheritedEventCount,
    header,
    events,
  }
}

/**
 * 校验导出文件（FR-8 ②）。
 *
 * 校验项：
 *   · 两个文件都存在且非空；
 *   · JSONL 每行都能解析（readJsonl 会在失败时抛出具行号的错误）；
 *   · 事件数与 meta 记录一致；
 *   · 事件 seq 从 0 开始连续（存储层承诺 "events are contiguous from seq 0"）；
 *   · sha256 与 meta 记录一致。
 *
 * @param {{ logPath: string, metaPath: string, expectedEventCount?: number }} input
 * @returns {Promise<{ ok: true, eventCount: number, messageCount: number, toolCallCount: number }
 *   | { ok: false, reason: string }>}
 */
export async function verifyExport(input) {
  const { logPath, metaPath } = input
  if (!(await exists(logPath))) return { ok: false, reason: `导出文件不存在：${logPath}` }
  if (!(await exists(metaPath))) return { ok: false, reason: `导出元数据不存在：${metaPath}` }

  let events
  try {
    events = await readJsonl(logPath)
  } catch (error) {
    return { ok: false, reason: `导出文件无法解析：${error instanceof Error ? error.message : String(error)}` }
  }
  if (events.length === 0) return { ok: false, reason: '导出文件里没有任何事件。' }

  let meta
  try {
    const { readFile } = await import('node:fs/promises')
    meta = JSON.parse(await readFile(metaPath, 'utf8'))
  } catch (error) {
    return { ok: false, reason: `导出元数据无法解析：${error instanceof Error ? error.message : String(error)}` }
  }

  if (typeof meta.eventCount === 'number' && meta.eventCount !== events.length) {
    return {
      ok: false,
      reason: `事件数不一致：文件 ${events.length} 条，元数据记录 ${meta.eventCount} 条。`,
    }
  }

  const expected = input.expectedEventCount
  if (typeof expected === 'number' && expected !== events.length) {
    return { ok: false, reason: `导出事件数 ${events.length} 与源会话实际事件数 ${expected} 不一致。` }
  }

  // seq 连续性：缺失 seq 视为不可校验，直接跳过该项而不是判失败。
  const withSeq = events.filter(event => typeof event?.seq === 'number')
  if (withSeq.length === events.length) {
    for (let index = 0; index < withSeq.length; index += 1) {
      if (withSeq[index].seq !== index) {
        return { ok: false, reason: `事件序号不连续：第 ${index} 个事件的 seq 是 ${withSeq[index].seq}。` }
      }
    }
  }

  const { readFile } = await import('node:fs/promises')
  const text = await readFile(logPath, 'utf8')
  const digest = sha256(text)
  if (typeof meta.sha256 === 'string' && meta.sha256 !== digest) {
    return { ok: false, reason: '导出文件的 sha256 与元数据记录不一致，文件可能被改动。' }
  }

  const counts = countEvents(events)
  return {
    ok: true,
    eventCount: events.length,
    messageCount: counts.messageCount,
    toolCallCount: counts.toolCallCount,
  }
}

/**
 * 备份一个会话的日志（FR-9 的「先备份再删除」）。
 * @param {any} ctx
 * @param {{ sessionId: string, dirs: ReturnType<typeof import('./config.js').layout> }} input
 * @returns {Promise<string>} 备份文件路径
 */
export async function backupSession(ctx, input) {
  const { sessionId, dirs } = input
  await ensureDir(dirs.backups)
  const { header, inheritedEventCount, events } = await readEvents(ctx, sessionId)
  const path = join(dirs.backups, `${timestamp()}-${shortId(sessionId)}.backup.jsonl`)
  const { writeFile } = await import('node:fs/promises')
  await writeFile(path, events.map(event => `${JSON.stringify(event)}\n`).join(''), 'utf8')
  await writeJsonAtomic(`${path}.meta.json`, {
    version: 1,
    kind: 'backup',
    backedUpAt: Date.now(),
    sessionId,
    header,
    inheritedEventCount,
    eventCount: events.length,
    sha256: sha256(events.map(event => `${JSON.stringify(event)}\n`).join('')),
  })
  return path
}

/**
 * 清理导出文件（FR-14 的「保留导出日志副本」关闭时）。
 * @param {{ logPath?: string, metaPath?: string }} input
 * @returns {Promise<void>}
 */
export async function discardExport(input) {
  const { unlink } = await import('node:fs/promises')
  for (const path of [input.logPath, input.metaPath]) {
    if (typeof path !== 'string' || path.length === 0) continue
    try {
      await unlink(path)
    } catch {
      // 已经不存在就忽略
    }
  }
}

/**
 * 文件名是否为本插件产出的日志（面板列出历史时用）。
 * @param {string} path
 * @returns {boolean}
 */
export function isExportLog(path) {
  return extname(path) === '.jsonl' && !path.endsWith('.backup.jsonl')
}

/**
 * 追加事件到已有导出文件（续跑时把新增事件补进去）。
 * @param {string} logPath
 * @param {readonly any[]} events
 * @returns {Promise<void>}
 */
export async function appendEvents(logPath, events) {
  await appendJsonl(logPath, events)
}
