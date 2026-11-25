/**
 * dsh-mode-exchange —— client 侧类型声明。
 *
 * 客户端产物是 bundle.js（由 scripts/build-client.mjs 拼接），运行时只有
 * `require('react')` 与宿主注入的模块表，拿不到 npm 类型包。
 * 这里只描述本插件客户端内部的数据形状。
 */

import type {
  Capabilities,
  MigrationHistoryRow,
  MigrationJobStatus,
  MigrationReport,
  ModeExchangeConfig,
  ModeInfo,
  SwitchSnapshot,
} from './index.js'

/** 面板与设置页共享的客户端状态（FR-15 的同步基础）。 */
export interface ClientState {
  /** 当前关注的会话；null 表示还没有选中会话。 */
  sessionId: string | null
  currentMode: string | null
  switchable: boolean
  blockedReason?: string
  switched: boolean
  snapshot?: SwitchSnapshot
  modes: ModeInfo[]
  config: ModeExchangeConfig
  capabilities: Capabilities
  migrations: MigrationHistoryRow[]
  job?: MigrationJobStatus
  /** 正在加载的状态项，用于禁用按钮与显示骨架。 */
  loading: boolean
  /** 最近一次错误的可读文案。 */
  error?: string
}

/** 状态订阅者。 */
export type Listener = (state: ClientState) => void

/** 与 host 通信的客户端封装。 */
export interface Api {
  getState(sessionId: string | null): Promise<Partial<ClientState>>
  switchMode(sessionId: string, mode: string): Promise<{ mode: string; notice: string }>
  revert(sessionId: string): Promise<{ mode: string | null; notice: string }>
  migrate(input: {
    sessionId: string
    mode: string
    deleteOld: boolean
    team: boolean
    note?: string
    confirmDelete?: boolean
  }): Promise<{ jobId: string }>
  jobStatus(jobId: string): Promise<MigrationJobStatus>
  cancelJob(jobId: string): Promise<{ cancelled: boolean }>
  migrations(sessionId?: string): Promise<MigrationHistoryRow[]>
  report(reportId: string): Promise<MigrationReport>
  archiveOld(input: {
    sessionId: string
    confirm: boolean
    backup: boolean
  }): Promise<{ archived: boolean; backupPath?: string }>
  saveConfig(patch: Partial<ModeExchangeConfig>): Promise<ModeExchangeConfig>
}

/** 面板/设置页可用的客户端服务（宿主注入）。 */
export interface SlotProps {
  /** 标注当前 slot 的 owner 传下来的属性，可能为空。 */
  [key: string]: unknown
}

/** 宿主 client 服务的最小接口（只列本插件用到的）。 */
export interface ClientContext {
  slots: {
    register(options: Record<string, unknown>, component: unknown): () => void
    registerFactory(options: Record<string, unknown>, factory: () => unknown): () => void
    inject(key: string, callback: () => () => void): void
  }
  effect(callback: () => (() => void) | void, label?: string): void
  on(event: string, listener: (...args: unknown[]) => void): () => void
  get(name: string): unknown
  layout?: { selectPanel(panelId: string | null): void }
  locale?: {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
    bind(namespace: string): (key: string, params?: Record<string, unknown>) => string
  }
  sessions?: {
    using?: unknown
    scope?(sessionId: string): unknown
  }
  uiWorkspace?: {
    openSession(target: { sessionId: string }): void
    archiveSession(sessionId: string, options?: { stopActivity?: boolean }): Promise<void>
  }
}

/** 组件通用 props：宿主会把标准 hooks 注入进来，本插件只用一个最小的子集。 */
export interface ComponentProps {
  /** 侧栏 footer action 的 owner props。 */
  wide?: boolean
  /** 设置页 section 的 owner props。 */
  close?: () => void
  /** 宿主注入的当前会话快照（形态随宿主版本变化，做防御性读取）。 */
  session?: { sessionId?: string } | null
  [key: string]: unknown
}
