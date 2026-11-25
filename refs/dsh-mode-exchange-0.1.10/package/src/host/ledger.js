/**
 * 迁移台账（FR-10 幂等 / 断点续跑，FR-13 迁移历史）。
 *
 * 一路一个文件：`<root>/migrations/<源会话 ID>.json`。
 *
 * 为什么必须落盘：用户在迁移途中改一次插件设置会让 `apply` 重建，
 * 内存里的任务状态会全部丢失（风险 R10）。只有把「进行到第几步、新会话 ID、
 * 日志路径」落到磁盘，才能在重建后继续跑而不是重开一个会话。
 *
 * 幂等语义：
 *   · status === 'in-progress' → 有未完成的迁移，面板提示「续跑 / 放弃」；
 *   · status === 'done'        → 已经成功迁移过，默认不再新建会话；
 *   · status === 'failed'      → 失败现场保留，可续跑或查看报告。
 */
import { join } from 'node:path'
import { ensureDir, exists, readJson, timestamp, writeJsonAtomic } from './util.js'

/** 迁移步骤清单，序号即 `MigrationLedger.step` 的取值。 */
export const STEPS = [
  { index: 0, id: 'export', label: '导出会话日志' },
  { index: 1, id: 'verify', label: '校验导出完整性' },
  { index: 2, id: 'create', label: '以目标模式创建新会话' },
  { index: 3, id: 'import', label: '导入日志为历史上下文' },
  { index: 4, id: 'team', label: '启用智能体团队协作' },
  { index: 5, id: 'archive', label: '处置旧会话' },
  { index: 6, id: 'report', label: '生成迁移报告' },
]

/** 步骤总数。 */
export const STEP_COUNT = STEPS.length

/** 台账文件名里不允许直接出现的字符。 */
function safeSegment(value) {
  return String(value).replaceAll(/[^A-Za-z0-9._-]/g, '_')
}

/**
 * 台账目录的路径。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @returns {string}
 */
export function ledgerDir(dirs) {
  return dirs.migrations
}

/**
 * 某个源会话的台账文件路径。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {string} sourceSessionId
 * @returns {string}
 */
export function ledgerPath(dirs, sourceSessionId) {
  return join(dirs.migrations, `${safeSegment(sourceSessionId)}.json`)
}

/**
 * 读一份台账；不存在返回 undefined。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {string} sourceSessionId
 * @returns {Promise<import('../../types/index.d.ts').MigrationLedger | undefined>}
 */
export async function read(dirs, sourceSessionId) {
  const path = ledgerPath(dirs, sourceSessionId)
  if (!(await exists(path))) return undefined
  const value = await readJson(path)
  if (value === null || typeof value !== 'object') return undefined
  return value
}

/**
 * 写一份台账（原子写）。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {Partial<import('../../types/index.d.ts').MigrationLedger> & { sourceSessionId: string }} patch
 * @returns {Promise<import('../../types/index.d.ts').MigrationLedger>}
 */
export async function write(dirs, patch) {
  await ensureDir(dirs.migrations)
  const previous = await read(dirs, patch.sourceSessionId)
  const now = Date.now()
  const next = {
    sourceSessionId: patch.sourceSessionId,
    sourceTitle: patch.sourceTitle ?? previous?.sourceTitle ?? null,
    sourceMode: patch.sourceMode ?? previous?.sourceMode ?? null,
    status: patch.status ?? previous?.status ?? 'in-progress',
    targetSessionId: patch.targetSessionId ?? previous?.targetSessionId ?? null,
    targetMode: patch.targetMode ?? previous?.targetMode ?? '',
    logPath: patch.logPath ?? previous?.logPath ?? null,
    metaPath: patch.metaPath ?? previous?.metaPath ?? null,
    backupPath: patch.backupPath ?? previous?.backupPath ?? null,
    jobId: patch.jobId ?? previous?.jobId ?? null,
    step: patch.step ?? previous?.step ?? 0,
    error: patch.error ?? null,
    note: patch.note ?? previous?.note ?? null,
    deleteOld: patch.deleteOld ?? previous?.deleteOld ?? true,
    team: patch.team ?? previous?.team ?? false,
    startedAt: previous?.startedAt ?? now,
    updatedAt: now,
  }
  await writeJsonAtomic(ledgerPath(dirs, patch.sourceSessionId), next)
  return next
}

/**
 * 列出台账（新的在前），供 FR-13 的迁移历史列表使用。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @returns {Promise<Array<import('../../types/index.d.ts').MigrationLedger>>}
 */
export async function list(dirs) {
  const { readdir } = await import('node:fs/promises')
  let names
  try {
    names = await readdir(dirs.migrations)
  } catch {
    return []
  }
  /** @type {Array<import('../../types/index.d.ts').MigrationLedger>} */
  const rows = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const value = await readJson(join(dirs.migrations, name))
    if (value === null || typeof value !== 'object') continue
    if (typeof value.sourceSessionId !== 'string') continue
    rows.push(value)
  }
  rows.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
  return rows
}

/**
 * 找某个源会话「正在进行中」的迁移。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {string} sourceSessionId
 * @returns {Promise<import('../../types/index.d.ts').MigrationLedger | undefined>}
 */
export async function inProgress(dirs, sourceSessionId) {
  const value = await read(dirs, sourceSessionId)
  if (value === undefined) return undefined
  return value.status === 'in-progress' ? value : undefined
}

/**
 * 把台账标记为完成 / 失败 / 取消。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {string} sourceSessionId
 * @param {'done' | 'failed' | 'cancelled'} status
 * @param {{ step?: number, error?: string | null }} [extra]
 * @returns {Promise<import('../../types/index.d.ts').MigrationLedger>}
 */
export async function settle(dirs, sourceSessionId, status, extra = {}) {
  return write(dirs, {
    sourceSessionId,
    status,
    step: extra.step,
    error: extra.error ?? null,
  })
}

/**
 * 报告文件路径（FR-8 ⑦ 的迁移报告）。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {string} jobId
 * @returns {string}
 */
export function reportPath(dirs, jobId) {
  return join(dirs.reports, `${timestamp()}-${safeSegment(jobId)}.json`)
}

/**
 * 写迁移报告。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {import('../../types/index.d.ts').MigrationReport} report
 * @returns {Promise<string>} 报告文件路径
 */
export async function writeReport(dirs, report) {
  await ensureDir(dirs.reports)
  const path = join(dirs.reports, `${safeSegment(report.jobId)}.json`)
  await writeJsonAtomic(path, report)
  return path
}

/**
 * 读迁移报告。
 * @param {ReturnType<typeof import('./config.js').layout>} dirs
 * @param {string} jobId
 * @returns {Promise<import('../../types/index.d.ts').MigrationReport | undefined>}
 */
export async function readReport(dirs, jobId) {
  const path = join(dirs.reports, `${safeSegment(jobId)}.json`)
  if (!(await exists(path))) return undefined
  const value = await readJson(path)
  if (value === null || typeof value !== 'object') return undefined
  return value
}

/**
 * 步骤名（进度展示用）。
 * @param {number} index
 * @returns {string}
 */
export function stepLabel(index) {
  return STEPS[index]?.label ?? `第 ${index + 1} 步`
}
