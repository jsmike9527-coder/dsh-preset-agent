/**
 * Config schema 与默认值。宿主在加载插件行时用 `Config` 校验 config 字段，
 * 并把校验后的对象作为 `apply(ctx, config)` 的第二个参数传进来。
 *
 * 全部字段都是「非 volatile」：改设置会让插件 apply 重建（宿主行为）。
 * 因此切换快照与迁移台账必须落盘，并在 apply 启动时读回（见 snapshot.js / ledger.js）。
 *
 * ## 为什么这里不用 @deepseek-ai/schemastery
 *
 * 宿主只要求 `Config` 是 standard-schema v1 对象，校验走的是
 * `runtime.Config['~standard'].validate(config)`（见 cordis-fiber.ts 的 resolveConfig），
 * 并不检查它是不是 schemastery。
 *
 * 而 schemastery 只在「宿主自己的 node_modules」里，插件的解析路径够不到它：
 * 本地 link 安装时 profile 的 node_modules/dsh-mode-exchange 是指向本仓库的符号链接，
 * Node 按 realpath 解析后只会在【本仓库】往上找 node_modules。仓库一旦没有 node_modules，
 * 顶层 `import z from '@deepseek-ai/schemastery'` 就会让整个入口 import 失败 ——
 * 插件显示「启用中」，但侧栏面板、设置页、命令、路由全部不出现（0.1.3 的真实故障）。
 *
 * 所以这里手写一个最小 standard-schema：零依赖、同步校验、缺省补齐，
 * 任何环境 import 都不会失败。代价仅是宿主 cordis_inspect 的 JSON Schema 投影
 * 会显示 unsupported（本插件自带设置页，不依赖宿主生成的表单）。
 */
import { absoluteFrom, fallbackDataRoot } from './util.js'

/** 默认值集中在这一处，patch / 设置页 / 恢复默认都从这里取。 */
export const DEFAULTS = {
  /** 空字符串 = 取运行时默认模式（agentPresets.defaultId）。 */
  defaultMode: '',
  deleteOldSession: true,
  enableTeam: false,
  /** 空字符串 = `<cwd>/.dsh/mode-exchange`。 */
  exportDir: '',
  keepExportCopy: true,
  confirmBeforeMigrate: true,
  /** 迁移成功后是否自动切到新建的会话（并把它置顶）。 */
  autoOpenTarget: true,
}

/** 字段声明：类型、文案、默认值各只有一份，schema 与文档都从这里取。 */
const FIELDS = [
  { key: 'defaultMode', type: 'string', description: '默认目标模式；留空表示使用运行时默认模式。' },
  { key: 'deleteOldSession', type: 'boolean', description: '迁移时默认是否归档旧会话。' },
  { key: 'enableTeam', type: 'boolean', description: '迁移时默认是否对新会话启用智能体团队协作。' },
  { key: 'exportDir', type: 'string', description: '日志导出根目录；留空表示 <工作目录>/.dsh/mode-exchange。' },
  { key: 'keepExportCopy', type: 'boolean', description: '是否保留导出的日志副本（关闭后成功迁移会删除导出文件）。' },
  { key: 'confirmBeforeMigrate', type: 'boolean', description: '迁移前是否强制确认；关闭后归档旧会话将不再询问。' },
  { key: 'autoOpenTarget', type: 'boolean', description: '迁移成功后是否自动切到新建的会话。' },
]

/** 类型名 → 给用户看的期望值。 */
const TYPE_LABEL = { string: '字符串', boolean: '布尔值' }

/**
 * standard-schema v1 的 validate 实现。
 * 只做两件事：类型不对就报 issue（宿主据此抛 ValidationError），类型对就补齐默认值。
 * @param {unknown} value 宿主从 patch 行读到的 config（可能是 undefined / {} / 部分字段）
 * @returns {{ value: import('../../types/index.d.ts').ModeExchangeConfig } | { issues: Array<{ message: string, path?: Array<string> }> }}
 */
function validateConfig(value) {
  if (value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value))) {
    return { issues: [{ message: '配置必须是一个对象' }] }
  }
  const source = value ?? {}
  /** @type {Array<{ message: string, path?: Array<string> }>} */
  const issues = []
  for (const field of FIELDS) {
    const raw = /** @type {Record<string, unknown>} */ (source)[field.key]
    if (raw === undefined) continue
    if (typeof raw !== field.type) {
      issues.push({ message: `${field.key} 必须是${TYPE_LABEL[field.type]}`, path: [field.key] })
    }
  }
  if (issues.length > 0) return { issues }
  return { value: normalizeConfig(/** @type {any} */ (source)) }
}

/**
 * 插件配置 schema（standard-schema v1，零依赖）。
 *
 * 宿主读 `Config['~standard'].validate(config)`：同步返回则直接取 value，
 * 返回 thenable 会被判为「不支持异步校验」——本实现是纯同步的。
 */
export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-mode-exchange',
    validate: validateConfig,
  },
}

/**
 * 把可能不完整的 config 补成完整形态。
 * 宿主传来的 config 一般已经过 schema 校验，但命令与路由可能拿到部分对象。
 * @param {Partial<import('../../types/index.d.ts').ModeExchangeConfig> | undefined} config
 * @returns {import('../../types/index.d.ts').ModeExchangeConfig}
 */
export function normalizeConfig(config) {
  const source = config ?? {}
  return {
    defaultMode: typeof source.defaultMode === 'string' ? source.defaultMode : DEFAULTS.defaultMode,
    deleteOldSession: typeof source.deleteOldSession === 'boolean' ? source.deleteOldSession : DEFAULTS.deleteOldSession,
    enableTeam: typeof source.enableTeam === 'boolean' ? source.enableTeam : DEFAULTS.enableTeam,
    exportDir: typeof source.exportDir === 'string' ? source.exportDir : DEFAULTS.exportDir,
    keepExportCopy: typeof source.keepExportCopy === 'boolean' ? source.keepExportCopy : DEFAULTS.keepExportCopy,
    confirmBeforeMigrate: typeof source.confirmBeforeMigrate === 'boolean'
      ? source.confirmBeforeMigrate
      : DEFAULTS.confirmBeforeMigrate,
    autoOpenTarget: typeof source.autoOpenTarget === 'boolean'
      ? source.autoOpenTarget
      : DEFAULTS.autoOpenTarget,
  }
}

/**
 * 计算数据根目录。
 * 顺序：config.exportDir（绝对或相对 cwd）→ `<cwd>/.dsh/mode-exchange` → 兜底目录。
 * @param {import('../../types/index.d.ts').ModeExchangeConfig} config
 * @param {string | undefined} cwd 会话/工作区的工作目录
 * @returns {string}
 */
export function dataRoot(config, cwd) {
  if (typeof config.exportDir === 'string' && config.exportDir.length > 0) {
    return absoluteFrom(config.exportDir, cwd ?? process.cwd())
  }
  if (typeof cwd === 'string' && cwd.length > 0) {
    return absoluteFrom('.dsh/mode-exchange', cwd)
  }
  return fallbackDataRoot()
}

/**
 * 数据根目录下的各子目录约定（全部由 dataRoot 派生，便于自定义导出口径）。
 * @param {string} root
 */
export function layout(root) {
  return {
    root,
    exports: absoluteFrom('exports', root),
    backups: absoluteFrom('backups', root),
    reports: absoluteFrom('reports', root),
    migrations: absoluteFrom('migrations', root),
    state: absoluteFrom('state', root),
    switchesFile: absoluteFrom('state/switches.json', root),
    jobsFile: absoluteFrom('state/jobs.json', root),
  }
}