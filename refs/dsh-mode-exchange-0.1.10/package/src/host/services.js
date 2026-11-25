/**
 * 服务解析与运行时能力探测。
 *
 * 本插件不 import 任何 @deepseek-ai/dsh-* 包（profile 里没有这些包），
 * 所有宿主能力都通过 ctx 上的服务访问。这里做两件事：
 *   1. 一次性把用到的服务取出来，缺哪个就给出可读的缺失清单；
 *   2. 探测若干「文档没有保证、但实现里存在」的通道是否可用，
 *      决定功能走完整实现还是降级实现（U1/U2/U3 的落地）。
 */
import { createLogger } from './util.js'

/** 必需服务：缺任何一个，插件的核心功能都无法工作。 */
const REQUIRED = ['commands', 'agentPresets', 'agents', 'sessionQuery', 'sessionPersistence']

/** 可选服务：缺了对应功能降级，但插件仍能加载。 */
const OPTIONAL = [
  'tools',
  'systemPrompt',
  'agentTeams',
  'connection',
  'configEditor',
  'workspaceRegistry',
  'sessionTitle',
  'workingDirectory',
  'userQuestions',
  'sessions',
  'workspaces',
]

/**
 * 安全地取一个服务。
 *
 * 两个坑：
 *   · Cordis 的上下文 Proxy 对「未在本插件 inject 里声明」的服务做属性访问会直接抛
 *     `cannot get property "x" without inject` —— 所以属性访问必须包 try/catch；
 *   · `ctx.get(name)` 默认 strict，只返回「提供方 fiber 当前活跃」的实现，
 *     服务稍晚就绪时同样得到 undefined —— 所以这里按非 strict 读一次 store。
 *
 * @param {any} ctx
 * @param {string} name
 * @returns {any}
 */
export function serviceOf(ctx, name) {
  try {
    if (typeof ctx?.get === 'function') {
      const viaStore = ctx.get(name, false)
      if (viaStore !== undefined) return viaStore
    }
  } catch {
    // get 自身抛错时退回属性访问
  }
  try {
    return ctx?.[name]
  } catch {
    return undefined
  }
}

/**
 * 能力探测用的取值：保持 strict 语义（只认活跃实现），属性访问失败按缺失处理。
 * 与 serviceOf 的区别：这里宁可少报能力，也不要拿着未激活的服务去调方法。
 * @param {any} ctx
 * @param {string} name
 * @returns {any}
 */
function take(ctx, name) {
  try {
    if (typeof ctx?.get === 'function') return ctx.get(name)
  } catch {
    // 落到属性访问
  }
  try {
    return ctx?.[name]
  } catch {
    return undefined
  }
}

/**
 * 解析全部服务。
 * @param {any} ctx
 * @returns {{ services: Record<string, any>, missing: string[] }}
 */
export function resolveServices(ctx) {
  const services = {}
  const missing = []
  for (const name of REQUIRED) {
    const service = take(ctx, name)
    if (service === undefined) missing.push(name)
    else services[name] = service
  }
  for (const name of OPTIONAL) {
    const service = take(ctx, name)
    if (service !== undefined) services[name] = service
  }
  return { services, missing }
}

/**
 * 探测结果缓存：per-ctx 只保留「正向」结果。
 *
 * 为什么不再缓存全量结果：apply 时 tools / agentTeams / workspaceRegistry 可能还没就绪，
 * 那时探到的 false 会被永久记住，之后服务就绪也一直走降级路径。所以这里只缓存
 * 「五项全真」的结果（服务稳定、之后不会变差）；否则每次都重探。
 */
const capabilityCache = new WeakMap()

/** @param {{ seedCreate: boolean, scopedRestrict: boolean, scopedPrompt: boolean, teamSwitch: boolean, attachSession: boolean }} capabilities */
function allCapable(capabilities) {
  return capabilities.seedCreate
    && capabilities.scopedRestrict
    && capabilities.scopedPrompt
    && capabilities.teamSwitch
    && capabilities.attachSession
}

/**
 * 探测运行时能力。
 *
 * 每一项都对应一处「文档未保证」的实现细节，探不到就走降级路径，
 * 而不是硬写后在运行期抛错。
 *
 * @param {any} ctx
 * @param {{ services: Record<string, any> }} resolved
 * @returns {import('../../types/index.d.ts').Capabilities}
 */
export function probeCapabilities(ctx, resolved) {
  const cached = capabilityCache.get(ctx)
  if (cached !== undefined) return cached
  const services = resolved.services
  const notes = []

  // ① 真导入通道：agents.create 是否接受 seed + inheritedEventCount。
  //    这是 fork 走同一条通道，存在即说明 seed 真导入可用（档位 A）。
  const seedCreate = typeof services.agents?.create === 'function'
  if (!seedCreate) notes.push('缺少 agents.create，无法真导入原生消息序列，迁移将降级为「空白会话 + 引导」。')

  // ② 按会话卸载工具：agent.ctx.tools.restrict 存在即说明能做作用域级限制。
  //    注意 restrict 要求 scoped context，这里是能力位而非调用点。
  const scopedRestrict = typeof services.tools?.restrict === 'function'
  if (!scopedRestrict) notes.push('缺少 tools.restrict，模式切换无法卸载模式专属工具，只能靠提示词声明。')

  // ③ 按会话替换提示词：systemPrompt.section 支持 scoped shadow。
  const scopedPrompt = typeof services.systemPrompt?.section === 'function'
  if (!scopedPrompt) notes.push('缺少 systemPrompt.section，模式切换无法替换系统提示词。')

  // ④ 团队协作开关。
  const teamSwitch = typeof services.agentTeams?.setEnabled === 'function'
  if (!teamSwitch) notes.push('缺少 agentTeams.setEnabled，迁移时无法启用智能体团队协作，面板将置灰。')

  // ⑤ 新会话补挂工作区：真导入走 agents.create，不经过 sessionController.create，
  //    因此不会自动进工作区列表；这里探测 workspaceRegistry 是否支持补挂。
  const attachSession = typeof services.workspaceRegistry?.create === 'function'
    && typeof services.workspaceRegistry?.get === 'function'
  if (!attachSession) notes.push('缺少 workspaceRegistry 查询能力，迁移出的新会话可能不出现在会话列表中。')

  const capabilities = { seedCreate, scopedRestrict, scopedPrompt, teamSwitch, attachSession, notes }
  if (allCapable(capabilities)) capabilityCache.set(ctx, capabilities)
  return capabilities
}

/**
 * 启动时把能力探测结果打到日志，便于本地调试时一眼看到降级项。
 * @param {any} ctx
 * @param {import('../../types/index.d.ts').Capabilities} capabilities
 */
export function logCapabilities(ctx, capabilities) {
  const logger = createLogger(ctx)
  const summary = [
    `seedCreate=${capabilities.seedCreate}`,
    `scopedRestrict=${capabilities.scopedRestrict}`,
    `scopedPrompt=${capabilities.scopedPrompt}`,
    `teamSwitch=${capabilities.teamSwitch}`,
    `attachSession=${capabilities.attachSession}`,
  ].join(' ')
  logger.info(`能力探测：${summary}`)
  for (const note of capabilities.notes) logger.warn(note)
}

/**
 * 取会话 header（不存在返回 undefined）。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<any | undefined>}
 */
export async function sessionHeader(ctx, sessionId) {
  const persistence = take(ctx, 'sessionPersistence')
  if (persistence === undefined || typeof persistence.stat !== 'function') return undefined
  try {
    const snapshot = await persistence.stat(sessionId)
    return snapshot?.header
  } catch {
    return undefined
  }
}

/**
 * 找一个活着的 Agent。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {any | undefined}
 */
export function liveAgent(ctx, sessionId) {
  const agents = take(ctx, 'agents')
  if (agents === undefined || typeof agents.get !== 'function') return undefined
  try {
    return agents.get(sessionId)
  } catch {
    return undefined
  }
}

/**
 * 会话是否已归档。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {boolean}
 */
export function isArchived(ctx, sessionId) {
  const registry = take(ctx, 'workspaceRegistry')
  const ids = registry?.archivedSessionIds
  if (!Array.isArray(ids)) return false
  return ids.includes(sessionId)
}

/**
 * 读会话标题（失败返回 undefined）。
 *
 * 宿主 API 的坑（0.1.4 之前这里恒返回 undefined，面板只能显示裸 id）：
 *   `sessionTitle.get(session)` 要的是 **Session 实例**，不是 sessionId。
 * 所以先 `sessions.get(sessionId)` 取实例，再读标题；宿主换了实现也能兼容。
 *
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<string | undefined>}
 */
export async function sessionTitleOf(ctx, sessionId) {
  const titles = take(ctx, 'sessionTitle')
  if (titles === undefined || typeof titles.get !== 'function') return undefined
  const sessions = take(ctx, 'sessions')
  let session
  try {
    session = sessions !== undefined && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
  } catch {
    session = undefined
  }
  if (session === undefined) return undefined
  try {
    // get() 是同步的；await 兼容「返回 Promise」的旧实现。
    const value = await titles.get(session)
    if (typeof value === 'string' && value.length > 0) return value
    if (value !== null && typeof value === 'object' && typeof value.title === 'string' && value.title.length > 0) {
      return value.title
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * 读会话的工作目录（用于计算数据根目录）。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {Promise<string | undefined>}
 */
export async function sessionCwd(ctx, sessionId) {
  const header = await sessionHeader(ctx, sessionId)
  if (typeof header?.cwd === 'string' && header.cwd.length > 0) return header.cwd
  return undefined
}

/**
 * 会话当前是否在跑。
 * @param {any} ctx
 * @param {string} sessionId
 * @returns {boolean}
 */
export function isRunning(ctx, sessionId) {
  try {
    const controller = take(ctx, 'sessionController')
    if (controller !== undefined && typeof controller.state === 'function') {
      // state 可能是异步的；这里只在同步可读时用。真正的运行态由 switch.js 异步取。
      return false
    }
  } catch {
    // 忽略
  }
  try {
    const agents = take(ctx, 'agents')
    const agent = agents?.get?.(sessionId)
    const status = agent?.status
    return status === 'running' || status === 'busy'
  } catch {
    return false
  }
}
