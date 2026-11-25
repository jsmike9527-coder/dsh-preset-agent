/**
 * 模式枚举与解析 —— 全插件唯一的模式数据源。
 *
 * 硬规则（FR-1）：补全/下拉列表一律来自运行时 `agentPresets.list()`，
 * 任何地方都不得硬编码模式清单（不写 'standard' / 'ptc' 之类的常量）。
 */
import { serviceOf } from './services.js'

/**
 * 列出全部可用模式。
 * 数据来自 agentPresets.list()，按宿主给的顺序（order → id）原样保留。
 * @param {any} ctx
 * @returns {Promise<import('../../types/index.d.ts').ModeInfo[]>}
 */
export async function listModes(ctx) {
  const presets = serviceOf(ctx, 'agentPresets')
  if (presets === undefined || typeof presets.list !== 'function') return []
  let rows
  try {
    rows = await presets.list()
  } catch {
    return []
  }
  if (!Array.isArray(rows)) return []
  return rows
    .filter(row => row !== null && typeof row === 'object' && typeof row.id === 'string' && row.id.length > 0)
    .map((row, index) => ({
      id: row.id,
      name: typeof row.name === 'string' && row.name.length > 0 ? row.name : row.id,
      description: typeof row.description === 'string' ? row.description : '',
      isDefault: row.isDefault === true || (row.isDefault === undefined && index === 0),
      ...(typeof row.broken === 'string' ? { broken: row.broken } : {}),
    }))
}

/**
 * 按 id 解析一个模式；未知时返回 undefined（不抛错，由调用方决定文案）。
 * @param {any} ctx
 * @param {string} modeId
 * @returns {Promise<import('../../types/index.d.ts').ModeInfo | undefined>}
 */
export async function findMode(ctx, modeId) {
  if (typeof modeId !== 'string' || modeId.length === 0) return undefined
  const modes = await listModes(ctx)
  return modes.find(mode => mode.id === modeId)
}

/**
 * 解析目标模式并校验装配状态。
 * @param {any} ctx
 * @param {string} modeId
 * @returns {Promise<{ ok: true, mode: import('../../types/index.d.ts').ModeInfo } | { ok: false, reason: string }>}
 */
export async function resolveMode(ctx, modeId) {
  const modes = await listModes(ctx)
  if (modes.length === 0) {
    return { ok: false, reason: '当前没有可用的 Agent 模式（运行时未提供任何 preset）。' }
  }
  const mode = modes.find(row => row.id === modeId)
  if (mode === undefined) {
    return { ok: false, reason: formatNotFound(modeId, modes) }
  }
  if (typeof mode.broken === 'string' && mode.broken.length > 0) {
    return { ok: false, reason: `模式「${mode.name}」（${mode.id}）当前不可用：${mode.broken}` }
  }
  return { ok: true, mode }
}

/**
 * 取运行时默认模式 id。
 * @param {any} ctx
 * @returns {Promise<string | undefined>}
 */
export async function defaultModeId(ctx) {
  try {
    const value = serviceOf(ctx, 'agentPresets')?.defaultId
    if (typeof value === 'string' && value.length > 0) return value
  } catch {
    // 忽略
  }
  const modes = await listModes(ctx)
  return modes.find(mode => mode.isDefault)?.id ?? modes[0]?.id
}

/**
 * 把配置里的「默认目标模式」解析成实际 id：
 * 配置为空 → 运行时默认；配置指向的模式已不存在 → 回退到运行时默认并在返回值里标注。
 * @param {any} ctx
 * @param {string} configured
 * @returns {Promise<{ id: string | undefined, fallbackFrom?: string }>}
 */
export async function resolveConfiguredMode(ctx, configured) {
  const modes = await listModes(ctx)
  if (typeof configured === 'string' && configured.length > 0) {
    const hit = modes.find(mode => mode.id === configured)
    if (hit !== undefined) return { id: hit.id }
    const fallback = await defaultModeId(ctx)
    return { id: fallback, fallbackFrom: configured }
  }
  return { id: await defaultModeId(ctx) }
}

/**
 * 未知模式的可读提示，附带全部可选项（这就是 FR-1「运行时枚举」的用户可见面）。
 * @param {string} wanted
 * @param {readonly import('../../types/index.d.ts').ModeInfo[]} modes
 * @returns {string}
 */
export function formatNotFound(wanted, modes) {
  const list = modes.length === 0
    ? '（无）'
    : modes.map(mode => `  · ${mode.id}${mode.isDefault ? '（默认）' : ''} —— ${mode.name}`).join('\n')
  return `未知模式「${wanted}」。可用模式：\n${list}\n\n用法：/switch-mode <模式名>，或 /switch-mode --list 查看清单。`
}

/**
 * 生成 `/switch-mode --list` 的正文。
 * @param {readonly import('../../types/index.d.ts').ModeInfo[]} modes
 * @param {string | null} current
 * @returns {string}
 */
export function describeModes(modes, current) {
  if (modes.length === 0) return '当前没有可用的 Agent 模式。'
  const header = current === null
    ? '可用模式（共 ' + modes.length + ' 个）：'
    : `可用模式（共 ${modes.length} 个，当前为 ${current}）：`
  const rows = modes.map((mode) => {
    const marks = []
    if (mode.id === current) marks.push('当前')
    if (mode.isDefault) marks.push('默认')
    const suffix = marks.length > 0 ? `（${marks.join(' / ')}）` : ''
    const broken = mode.broken !== undefined ? ` ⚠ ${mode.broken}` : ''
    const description = mode.description.length > 0 ? ` —— ${mode.description}` : ''
    return `  · ${mode.id}${suffix}${description}${broken}`
  })
  return `${header}\n${rows.join('\n')}\n\n切换到某个模式：/switch-mode <模式名>`
}

/**
 * 生成面板下拉框的选项（含不可用项标记）。
 * @param {readonly import('../../types/index.d.ts').ModeInfo[]} modes
 * @returns {Array<{ value: string, label: string, disabled: boolean, hint?: string }>}
 */
export function toOptions(modes) {
  return modes.map(mode => ({
    value: mode.id,
    label: mode.id === mode.name ? mode.id : `${mode.name}（${mode.id}）`,
    disabled: typeof mode.broken === 'string' && mode.broken.length > 0,
    ...(typeof mode.broken === 'string' ? { hint: mode.broken } : {}),
  }))
}
