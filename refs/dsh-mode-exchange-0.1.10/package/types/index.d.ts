/**
 * dsh-mode-exchange —— host 侧类型声明。
 *
 * 这里只声明「本插件自己的数据形状」。宿主服务的类型（Context / Agent / Session …）
 * 一律不在这里重新定义：插件运行时拿不到 @deepseek-ai/dsh-* 的类型包，
 * 所有服务都通过 ctx.get(name) / ctx.<name> 动态访问。
 */

/** 插件配置（对应 cordis.patch.yml 中本插件行的 config 字段）。 */
export interface ModeExchangeConfig {
  /** 默认目标模式；空字符串表示「取运行时默认模式」。 */
  defaultMode: string
  /** 迁移时默认是否归档旧会话。 */
  deleteOldSession: boolean
  /** 迁移时默认是否对新会话启用智能体团队协作。 */
  enableTeam: boolean
  /** 日志根目录；空字符串表示 `<cwd>/.dsh/mode-exchange`。 */
  exportDir: string
  /** 是否保留导出日志副本。 */
  keepExportCopy: boolean
  /** 迁移前是否强制确认（关闭需二次警告）。 */
  confirmBeforeMigrate: boolean
  /** 迁移成功后是否自动切到新建的会话（并把新会话置顶）。 */
  autoOpenTarget: boolean
}

/** 一个可用模式（来自运行时 agentPresets.list()，不做任何硬编码）。 */
export interface ModeInfo {
  id: string
  name: string
  description: string
  isDefault: boolean
  /** 该 preset 的插件组合装配失败时的诊断信息。 */
  broken?: string
}

/** 运行时能力探测结果；决定功能走「完整实现」还是「降级实现」。 */
export interface Capabilities {
  /** ctx.agents.create({ seed }) 可用 —— 决定档位 A 真导入是否成立。 */
  seedCreate: boolean
  /** agent.ctx.tools.restrict() 可用 —— 决定能否真卸载模式专属工具。 */
  scopedRestrict: boolean
  /** agent.ctx.systemPrompt.section() 可用 —— 决定能否替换模式提示词。 */
  scopedPrompt: boolean
  /** agentTeams.setEnabled 可用。 */
  teamSwitch: boolean
  /** 能对非 sessionController.create 建立的新会话补挂工作区。 */
  attachSession: boolean
  /** 探测到的问题描述（逐条中文），用于 UI 展示与 README 对照。 */
  notes: string[]
}

/** 软切换的一份快照（落盘到 state/switches.json）。 */
export interface SwitchSnapshot {
  sessionId: string
  fromMode: string | null
  toMode: string
  /** 切换时刻（epoch ms）。 */
  at: number
  /** 被 deny 的 preset 工具名；回退时用于说明，guard 表重建也用它。 */
  denied: string[]
  /** 目标模式补充挂载的工具名；回退时从 agent scope 卸载。 */
  attached: string[]
  /** 是否已成功注册到 agent scope（false 表示只做了提示词层的软切换）。 */
  scoped: boolean
}

/** /switch-mode 的状态视图（侧栏面板与设置页共用）。 */
export interface SwitchState {
  sessionId: string | null
  currentMode: string | null
  /** 该会话当前是否允许切换；false 时 blockedReason 一定有值。 */
  switchable: boolean
  blockedReason?: string
  /** 是否处于软切换后的状态（决定「回退」按钮是否可用）。 */
  switched: boolean
  snapshot?: SwitchSnapshot
  modes: ModeInfo[]
  config: ModeExchangeConfig
  capabilities: Capabilities
}

/** 迁移台账（migrations/<srcSessionId>.json），用于幂等与续跑。 */
export interface MigrationLedger {
  sourceSessionId: string
  sourceTitle: string
  sourceMode: string | null
  status: 'in-progress' | 'done' | 'failed' | 'cancelled'
  targetSessionId?: string
  targetMode: string
  logPath?: string
  backupPath?: string
  /** 已完成到第几步（0-7，对应 FR-8 的 ①-⑦）。 */
  step: number
  /** 最近一次失败的原因。 */
  error?: string
  startedAt: number
  updatedAt: number
}

/** 一次迁移的报告（reports/<ts>-<jobId>.json）。 */
export interface MigrationReport {
  jobId: string
  ok: boolean
  startedAt: number
  finishedAt: number
  elapsedMs: number
  source: {
    sessionId: string
    title: string
    mode: string | null
    messageCount: number
    toolCallCount: number
    eventCount: number
  }
  target?: {
    sessionId: string
    mode: string
    /** 是否真的导入了原生消息序列（档位 A 成功）。 */
    imported: boolean
    importedEventCount: number
    attachedToWorkspace: boolean
    /** 迁移结束时是否已把新会话置顶（置顶失败为 false，不影响迁移结果）。 */
    pinned?: boolean
    /** 面板指定了目标工作区时才会出现。 */
    workspaceId?: string
    workspaceTitle?: string
  }
  log: {
    path: string
    metaPath: string
    sha256: string
    verified: boolean
    verifyReason?: string
  }
  team: {
    requested: boolean
    enabled: boolean
    reason?: string
  }
  oldSession: {
    requested: boolean
    archived: boolean
    backupPath?: string
    reason?: string
  }
  /** 失败原因（成功时为 null）；与 remainingSteps 的第一条同源。 */
  error?: string | null
  /** 失败时给出的「可手动完成的剩余步骤」。 */
  remainingSteps: string[]
  /** 逐步骤的时间线，用于面板展示耗时。 */
  timeline: Array<{ step: string; at: number; ok: boolean; detail?: string }>
}

/** 迁移任务的内存态（面板轮询用）。 */
export interface MigrationJobStatus {
  jobId: string
  sourceSessionId: string
  targetMode: string
  status: 'running' | 'done' | 'failed' | 'cancelled'
  stepIndex: number
  stepName: string
  totalSteps: number
  startedAt: number
  elapsedMs: number
  message?: string
  report?: MigrationReport
}

/** 迁移历史中的一行（FR-13 的列表项）。 */
export interface MigrationHistoryRow {
  ts: number
  sourceSessionId: string
  sourceTitle: string
  targetSessionId?: string
  targetMode: string
  result: 'done' | 'failed' | 'in-progress' | 'cancelled'
  reportId?: string
}

/** 统一响应信封。 */
export type ApiEnvelope<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } }

/** POST /api/mode-exchange/migrate 的请求体。 */
export interface MigrateRequest {
  sessionId: string
  /** 新会话要落进哪个工作区（面板「选择工作区」）。不传则沿用源会话的目录。 */
  workspaceId?: string
  mode: string
  deleteOld: boolean
  team: boolean
  note?: string
  /** 用户已在对话框里确认归档旧会话。 */
  confirmDelete?: boolean
}

/** GET /api/mode-exchange/sessions 的列表项（面板「选择会话」用）。 */
export interface SessionBrief {
  id: string
  /** 展示用标题：durable title → 工作目录名 → 会话 id。 */
  title: string
  cwd: string | null
  /** 所属工作区 id（不在任何工作区时为 null）。 */
  workspaceId: string | null
  createdAt: number | null
  live: boolean
  persisted: boolean
  running: boolean
  archived: boolean
}

/** GET /api/mode-exchange/workspaces 的列表项（面板「选择工作区」用）。 */
export interface WorkspaceBrief {
  id: string
  title: string
  path: string
  sessionIds: string[]
  createdAt: number | null
}

/** POST /api/mode-exchange/archive-old 的请求体。 */
export interface ArchiveOldRequest {
  sessionId: string
  confirm: boolean
  backup: boolean
}
