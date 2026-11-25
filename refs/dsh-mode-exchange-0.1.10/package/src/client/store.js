/**
 * 极简可观察状态容器。面板与设置页共用一份实例，保证两边开关状态同步（FR-15）。
 */

const EMPTY_STATE = {
  sessionId: null,
  title: null,
  loading: false,
  loaded: false,
  error: null,
  currentMode: null,
  switchable: false,
  blockedReason: null,
  switched: false,
  snapshot: null,
  modes: [],
  config: {},
  capabilities: { seedCreate: false, scopedRestrict: false, scopedPrompt: false, teamSwitch: false, attachSession: false, notes: [] },
  migrations: [],
  job: null,
  /** 菜单发起的迁移属于哪个会话；面板据此把进度接到正确的会话上。 */
  jobSessionId: null,
  sessions: [],
  workspaces: [],
}

function shallowEqualConfig(a, b) {
  const left = a || {}
  const right = b || {}
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (left[key] !== right[key]) return false
  }
  return true
}

/** 创建 store；getState 返回快照，subscribe 返回退订函数。 */
export function createStore() {
  let state = { ...EMPTY_STATE }
  const listeners = new Set()

  function emit() {
    for (const listener of Array.from(listeners)) {
      try {
        listener(state)
      } catch (error) {
        // 单个订阅者抛错不应影响其他订阅者。
        void error
      }
    }
  }

  return {
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    /** 局部更新；返回值无意义。 */
    set(patch) {
      const next = { ...state, ...patch }
      if (patch.config !== undefined && shallowEqualConfig(state.config, patch.config)) {
        next.config = state.config
      }
      state = next
      emit()
    },
    /** 整体替换（切换会话时用）。 */
    reset(sessionId) {
      state = { ...EMPTY_STATE, config: state.config, sessionId: sessionId || null }
      emit()
    },
    /** 清空错误与加载态，保留其余数据。 */
    settle(patch) {
      state = { ...state, loading: false, error: null, ...patch }
      emit()
    },
    /** 记录一次失败。 */
    fail(error) {
      state = { ...state, loading: false, error: error && error.message ? error.message : String(error) }
      emit()
    },
  }
}

export { EMPTY_STATE }
