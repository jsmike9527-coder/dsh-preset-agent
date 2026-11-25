/**
 * 会话右键菜单：在宿主的会话列表行（target kind = 'session'）和会话标题「更多」菜单
 * （kind = 'sessionHeader'）里挂两个入口 ——「切换模式」（软切换）与「迁移重建」
 * （按目标模式建一个新会话），子菜单都按模式列叶子。
 *
 * 三条宿主契约决定了这里的写法（源自 @deepseek-ai/dsh-client-ui-context-menu）：
 *   1. resolve() 要么同步返回，要么在 resolutionTimeoutMs（默认 1000ms）内完成，
 *      所以这里只读内存缓存；网络刷新交给后台跑，刷完通过 observe 的快照触发重新解析。
 *   2. 带 children 的菜单项被点击时不会执行 run，只会展开子菜单 —— 切换动作只能放叶子上。
 *   3. 同一个 target + id 重复注册会抛 Duplicate menu contribution，所以每个 target 只注册一次。
 *
 * 服务取法：contextMenus 是可选依赖，不写进 entry 的 inject 列表，而是用
 * ctx.inject(['contextMenus', 'slots'], ...) 等它就绪；这样宿主没有该服务时，
 * 面板与设置页照常工作，不会被一起拖垮。
 */

const MENU_ID = 'mode-exchange.switch'
const MIGRATE_MENU_ID = 'mode-exchange.migrate'
const MENU_ORDER = 350
const ICON_KEY = 'mode-exchange.switch'
const TARGETS = ['session', 'sessionHeader']
/** 已经挂过菜单的 api 实例（每个插件实例一份），用于防重复注册。 */
const MOUNTED = new WeakSet()
/** 缓存保鲜期：菜单每次打开都会尝试刷新，但同一份数据 15s 内不重复请求。 */
const FRESH_MS = 15000

/** 极简可观察快照：宿主 contextMenus 的 observe() 需要 getSnapshot / subscribe。 */
function createSnapshot(initial) {
  let value = initial
  const listeners = new Set()
  return {
    getSnapshot() { return value },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(next) {
      if (Object.is(next, value)) return
      value = next
      for (const listener of Array.from(listeners)) {
        try { listener(value) } catch (error) { void error }
      }
    },
  }
}

/**
 * 取一个可选服务。
 * Cordis 的 ctx 是 Proxy：访问没有 inject 的服务属性会直接抛错，可选链只挡
 * null/undefined、挡不住抛错，所以两条路径都得包 try/catch。
 */
export function serviceOf(ctx, name) {
  if (!ctx) return undefined
  try {
    if (typeof ctx.get === 'function') {
      const value = ctx.get(name, false)
      if (value !== undefined && value !== null) return value
    }
  } catch (error) {
    void error
  }
  try {
    const value = ctx[name]
    if (value !== undefined && value !== null) return value
  } catch (error) {
    void error
  }
  return undefined
}

/** 会话列表行右键时宿主给的 target 是 { sessionId, displayTitle }。 */
function sessionIdOf(value) {
  if (!value || typeof value !== 'object') return ''
  const id = value.sessionId
  return typeof id === 'string' && id.length > 0 ? id : ''
}

function clip(text, limit) {
  const value = String(text === undefined || text === null ? '' : text)
  if (limit === undefined || value.length <= limit) return value
  return value.slice(0, limit) + '…'
}

/** 菜单图标：两条带箭头的滑轨，与侧栏入口同一套图形语言。 */
function makeIcon(h) {
  return function ModeExchangeMenuIcon() {
    return h('svg', {
      viewBox: '0 0 16 16',
      width: 14,
      height: 14,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      style: { display: 'block', pointerEvents: 'none' },
    },
    h('path', { d: 'M2.6 5.4h8.2' }),
    h('path', { d: 'M9 3.1 11.3 5.4 9 7.7' }),
    h('path', { d: 'M13.4 10.6H5.2' }),
    h('path', { d: 'M7 8.3 4.7 10.6 7 12.9' }),
    )
  }
}

/** 把两个 target 的贡献注册进宿主。 */
function install(scope, menus, deps) {
  const api = deps.api
  const store = deps.store
  const t = deps.t
  const h = deps.h
  // entry.js 会把插件级 ctx 塞进 deps；万一没有（比如单独复用这个模块），退回注册时拿到的 scope。
  const ctx = deps.ctx || scope
  if (typeof menus.register !== 'function') return undefined
  if (!api || typeof api.switchMode !== 'function') return undefined

  // 缓存形状：{ modes, config, modesError, modesAt, sessions: { [sessionId]: { currentMode, switchable, blockedReason, at } } }
  const state = createSnapshot({ modes: null, config: null, modesError: null, modesAt: 0, sessions: {} })
  const pending = new Set()
  let fetchingModes = false

  const patch = next => { state.set({ ...state.getSnapshot(), ...next }) }
  const patchSession = (sessionId, next) => {
    const current = state.getSnapshot()
    const previous = current.sessions[sessionId] || {}
    patch({ sessions: { ...current.sessions, [sessionId]: { ...previous, ...next } } })
  }
  const readSession = sessionId => state.getSnapshot().sessions[sessionId]

  /** 拉全部模式：/state 不带 sessionId 时返回模式清单、配置与能力。 */
  function refreshModes() {
    const current = state.getSnapshot()
    if (fetchingModes) return
    if (current.modes !== null && current.modesError === null && Date.now() - current.modesAt < FRESH_MS) return
    fetchingModes = true
    Promise.resolve()
      .then(() => api.getState(null))
      .then(value => {
        const modes = value && Array.isArray(value.modes) ? value.modes : []
        const config = value && value.config && typeof value.config === 'object' ? value.config : null
        patch({ modes, config, modesError: null, modesAt: Date.now() })
      })
      .catch(error => {
        patch({ modesError: error && error.message ? error.message : String(error), modesAt: Date.now() })
      })
      .then(() => { fetchingModes = false })
  }

  /** 拉某个会话的当前模式与可切换性（用来标记当前模式、提前禁掉不可切换的会话）。 */
  function refreshSession(sessionId) {
    const known = readSession(sessionId)
    if (known && Date.now() - (known.at || 0) < FRESH_MS) return
    if (pending.has(sessionId)) return
    pending.add(sessionId)
    Promise.resolve()
      .then(() => api.getState(sessionId))
      .then(value => {
        patchSession(sessionId, {
          currentMode: value && value.currentMode ? String(value.currentMode) : null,
          switchable: !(value && value.switchable === false),
          blockedReason: value && value.blockedReason ? String(value.blockedReason) : null,
          at: Date.now(),
        })
      })
      .catch(() => {
        // 读不到状态时不拦用户，只记下已经尝试过。
        patchSession(sessionId, { at: Date.now() })
      })
      .then(() => { pending.delete(sessionId) })
  }

  /** action 是宿主 notice 上的一个文字按钮：{ label, run, failureLabel }。 */
  function notify(text, success, action) {
    try {
      if (typeof menus.notify !== 'function') return
      if (action === undefined) menus.notify(text, success === true)
      else menus.notify(text, success === true, action)
    } catch (error) {
      void error
    }
  }

  /** 迁移是后台长任务，菜单里只负责发起；后续进度在面板里看。 */
  function progressAction() {
    return {
      label: t('menu.viewProgress'),
      run: () => {
        const layout = serviceOf(ctx, 'layout')
        if (layout && typeof layout.selectPanel === 'function') layout.selectPanel('mode-exchange')
      },
      failureLabel: t('menu.panelUnavailable'),
    }
  }

  /** 执行一次切换：结果同时反馈到菜单提示与（面板开着同一个会话时）面板状态。 */
  function switchTo(sessionId, mode) {
    const label = mode && mode.name ? String(mode.name) : String(mode && mode.id ? mode.id : '')
    return Promise.resolve()
      .then(() => api.switchMode(sessionId, String(mode.id)))
      .then(value => {
        patchSession(sessionId, { currentMode: String(mode.id), switchable: true, blockedReason: null, at: Date.now() })
        try {
          const panel = store && typeof store.getState === 'function' ? store.getState() : null
          if (panel && panel.sessionId === sessionId && typeof store.set === 'function') {
            store.set({
              currentMode: String(mode.id),
              switched: true,
              snapshot: value && value.snapshot ? value.snapshot : panel.snapshot,
            })
          }
        } catch (error) {
          void error
        }
        notify(t('menu.switched', { mode: label }), true)
      })
      .catch(error => {
        notify(t('menu.failed', { reason: error && error.message ? error.message : String(error) }), false)
      })
  }

  /**
   * 执行一次迁移重建。
   * 菜单里没法弹二次确认框，所以这里把「点了模式」当成用户已经确认：
   * confirmDelete 传 true 才能越过台账对同一会话的幂等拦截。
   * 其余参数一律取用户在设置页配好的默认值，不在菜单里另开入口。
   */
  function migrateTo(sessionId, mode) {
    const label = mode && mode.name ? String(mode.name) : String(mode && mode.id ? mode.id : '')
    const config = state.getSnapshot().config || {}
    const backup = config.keepExportCopy !== false
    // 标记写进快照里（不是模块级 Set），这样 observe 会触发重新解析，叶子立刻变灰防重复点击。
    patchSession(sessionId, { migrating: true })
    notify(t('menu.migrating', { mode: label }), true)
    return Promise.resolve()
      .then(() => api.migrate({
        sessionId,
        mode: String(mode.id),
        deleteOld: config.deleteOldSession === true,
        team: config.enableTeam === true,
        confirmDelete: true,
        backup,
      }))
      .then(value => {
        if (value && value.needsResume) {
          notify(t('menu.migrateResume'), false, progressAction())
          return
        }
        notify(t('menu.migrateStarted', { mode: label }), true, progressAction())
        try {
          const panel = store && typeof store.getState === 'function' ? store.getState() : null
          if (typeof store.set === 'function' && value && value.jobId) {
            // 不要求面板正好停在这个会话上：面板会自己切到这条会话再展示进度。
            store.set({ job: value.jobId, jobSessionId: sessionId })
          }
        } catch (error) {
          void error
        }
      })
      .catch(error => {
        notify(t('menu.migrateFailed', { reason: error && error.message ? error.message : String(error) }), false, progressAction())
      })
      .then(() => { patchSession(sessionId, { migrating: false }) })
  }

  /** resolve 必须快：只读缓存，顺便把过期缓存丢给后台刷新。 */
  function render(sessionId) {
    if (sessionId.length === 0) return []
    refreshModes()
    refreshSession(sessionId)
    const current = state.getSnapshot()
    const info = readSession(sessionId)
    const blocked = info && info.blockedReason ? String(info.blockedReason) : ''
    const locked = blocked.length > 0 || Boolean(info && info.switchable === false)
    const modes = Array.isArray(current.modes) ? current.modes : []
    const children = []

    if (modes.length === 0) {
      const loading = current.modes === null && !current.modesError
      children.push({
        id: 'empty',
        label: loading ? t('menu.loading') : t('menu.noModes'),
        disabled: true,
      })
    } else {
      for (const mode of modes) {
        const id = String(mode && mode.id !== undefined && mode.id !== null ? mode.id : '')
        if (id.length === 0) continue
        const name = mode && mode.name ? String(mode.name) : id
        const isCurrent = Boolean(info && info.currentMode === id)
        children.push({
          id: 'mode:' + id,
          label: isCurrent ? t('menu.currentMode', { mode: name }) : name,
          disabled: locked || isCurrent || mode.broken === true,
          run: () => switchTo(sessionId, mode),
        })
      }
    }

    if (blocked.length > 0) {
      children.push({
        id: 'blocked',
        label: t('menu.blocked', { reason: clip(blocked, 60) }),
        disabled: true,
        separatorBefore: true,
      })
    }

    // 迁移重建的叶子与软切换不同：
    //   · 当前模式也能选（「用同一个模式重建一个干净会话」正是主要用法）；
    //   · 不理会 switchable —— 没有活 Agent、已归档的会话恰恰是最需要重建的。
    const migrating = Boolean(info && info.migrating === true)
    const migrateChildren = []
    if (modes.length === 0) {
      const loading = current.modes === null && !current.modesError
      migrateChildren.push({
        id: 'empty',
        label: loading ? t('menu.loading') : t('menu.noModes'),
        disabled: true,
      })
    } else {
      for (const mode of modes) {
        const id = String(mode && mode.id !== undefined && mode.id !== null ? mode.id : '')
        if (id.length === 0) continue
        const name = mode && mode.name ? String(mode.name) : id
        const isCurrent = Boolean(info && info.currentMode === id)
        migrateChildren.push({
          id: 'migrate:' + id,
          label: isCurrent ? t('menu.currentMode', { mode: name }) : name,
          disabled: migrating || mode.broken === true,
          run: () => migrateTo(sessionId, mode),
        })
      }
    }
    if (migrating) {
      migrateChildren.push({
        id: 'migrating',
        label: t('menu.migratingItem'),
        disabled: true,
        separatorBefore: true,
      })
    }

    const entries = [{
      id: 'switch',
      label: t('menu.switch'),
      icon: { key: ICON_KEY },
      children,
    }]
    // 迁移要调 api.migrate：客户端与宿主版本不匹配时它可能不在，这时只保留切换入口。
    if (typeof api.migrate === 'function') {
      entries.push({
        id: 'migrate',
        label: t('menu.migrate'),
        icon: { key: ICON_KEY },
        children: migrateChildren,
      })
    }
    return entries
  }

  /**
   * 一个 target 上挂两条贡献（切换 / 迁移）：宿主按 target + id 去重，
   * 同一个 id 只能注册一次，而两条入口的顺序与 id 都不同，所以分开注册。
   */
  const ENTRIES = [
    { id: MENU_ID, order: MENU_ORDER, pick: 'switch' },
    { id: MIGRATE_MENU_ID, order: MENU_ORDER + 1, pick: 'migrate' },
  ]

  const disposers = []
  for (const target of TARGETS) {
    for (const entry of ENTRIES) {
      // 注册失败（例如同一 target 上已有同名贡献）不能冒到 apply()，
      // 否则整个客户端插件都会挂掉 —— 少一个右键菜单远比面板消失好。
      const register = () => {
        try {
          const dispose = menus.register({
            id: entry.id,
            target,
            order: entry.order,
            observe: () => [state],
            resolve: value => {
              const actions = render(sessionIdOf(value))
              const action = actions.find(item => item.id === entry.pick)
              if (!action) return []
              // 会话标题的「更多」菜单项目很密，加一条分隔线把它与内置项分开。
              return [target === 'sessionHeader' ? { ...action, separatorBefore: true } : action]
            },
          })
          return typeof dispose === 'function' ? dispose : () => {}
        } catch (error) {
          void error
          return () => {}
        }
      }
      if (typeof scope.effect === 'function') {
        scope.effect(() => {
          const dispose = register()
          return () => { if (typeof dispose === 'function') dispose() }
        }, 'mode-exchange: ' + target + ' ' + entry.id)
      } else {
        disposers.push(register())
      }
    }
  }

  // 图标走 keyed 插槽；注册失败（宿主没有该插槽）不影响菜单功能本身。
  const slots = serviceOf(scope, 'slots')
  if (slots && typeof slots.inject === 'function' && typeof slots.register === 'function') {
    try {
      slots.inject('contextMenu.icon', function* icons() {
        yield slots.register({ name: 'contextMenu.icon', key: ICON_KEY }, makeIcon(h))
      })
    } catch (error) {
      void error
    }
  }

  return () => {
    for (const dispose of disposers) {
      if (typeof dispose === 'function') dispose()
    }
  }
}

/**
 * 挂上会话右键菜单。
 * contextMenus 是可选依赖：先直接取，取不到就等 ctx.inject 就绪后再注册。
 */
export function mountSessionMenu(ctx, deps) {
  // 宿主对同一个 target+id 的重复注册会抛 Duplicate menu contribution，
  // 而 apply() 在宿主重建插件时可能被调多次，所以这里按 api 实例做一次幂等保护。
  const api = deps ? deps.api : undefined
  if (api && typeof api === 'object') {
    if (MOUNTED.has(api)) return
    MOUNTED.add(api)
  }
  const menus = serviceOf(ctx, 'contextMenus')
  if (menus) {
    install(ctx, menus, deps)
    return
  }
  if (typeof ctx.inject !== 'function') return
  try {
    ctx.inject(['contextMenus', 'slots'], scope => {
      const ready = serviceOf(scope, 'contextMenus')
      if (ready) install(scope, ready, deps)
    })
  } catch (error) {
    void error
  }
}
