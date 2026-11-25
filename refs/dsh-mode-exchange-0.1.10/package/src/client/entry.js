/**
 * 客户端入口。注册四个插槽与一份样式表：
 *   1. sidebar.panellist(id=mode-exchange) —— 侧栏图标入口（点击切到 main 面板）
 *   2. main(key=mode-exchange)             —— 中央面板承载模式切换与迁移重建
 *   3. settings.section(id=mode-exchange)  —— 插件设置页
 *   4. settings.section.icon               —— 设置页图标
 *
 * 全部注册都放在 ctx.effect() / ctx.slots.inject() 里，插件卸载时自动清理。
 * 样式走宿主提供的 styles.insert()，不向 document.body 追加节点。
 */

import { setLocale, registerLocale, t } from './i18n.js'
import { ensureGlobalStyle, dropGlobalStyle, bindUiReact } from './ui.js'
import { createApi } from './api.js'
import { createStore } from './store.js'
import { makePanel } from './panel.js'
import { makeSettings, makeSettingsIcon } from './settings.js'
import { mountSessionMenu } from './menu.js'

export const PANEL_KEY = 'mode-exchange'
const SETTINGS_ID = 'mode-exchange'
const PANEL_ENTRY_ID = 'mode-exchange'

/**
 * 从 sessions 服务的列表快照里找出「当前主视图占用的会话」。
 * 依据：SessionSummary.retainedBy.mainView > 0 —— 这是宿主自己判定「当前会话」的口径。
 * 取不到返回 null，面板会提示用户先打开一个会话。
 */
export function mainViewSessionId(sessions) {
  try {
    const snapshot = sessions && sessions.list ? sessions.list.getSnapshot() : undefined
    const byId = snapshot ? snapshot.byId : undefined
    if (!byId) return null
    for (const row of Object.values(byId)) {
      if (!row) continue
      const retained = row.retainedBy ? row.retainedBy.mainView : 0
      if (typeof retained === 'number' && retained > 0) return String(row.id)
    }
    return null
  } catch (error) {
    void error
    return null
  }
}

/** 供 bundle 生成脚本调用的工厂。 */
export function startModeExchangeClient(require) {
  const React = require('react')
  const h = React.createElement
  // 先绑定 React，ui.js 里的共享组件依赖它（否则渲染即抛错 → 面板/设置页白屏）
  bindUiReact(React)

  return {
    inject: ['slots', 'sessions', 'locale', 'layout'],
    apply(ctx) {
      // ---- 语言：跟随宿主 locale，取不到回退中文 ----
      try {
        const locale = ctx.get('locale')
        if (locale && typeof locale.getSnapshot === 'function') {
          const snapshot = locale.getSnapshot()
          setLocale(snapshot && snapshot.locale ? snapshot.locale : 'zh')
        }
      } catch (error) {
        void error
      }
      try {
        registerLocale(ctx)
      } catch (error) {
        // 语言包注册失败不该连累插槽：界面会退回中文兜底文案。
        console.error('[dsh-mode-exchange] locale 注册失败：', error)
      }

      const api = createApi(t)
      const store = createStore()
      const deps = { api, store, t, ctx, h }

      /**
       * ---- 样式：贴一份到 document.head ----
       * 宿主的 Web 宿主里没有 'styles' 服务（ctx.get('styles') 拿不到），
       * 也不存在 globalThis.__dshStylesInsert —— 之前那条链路是死的，CSS 从未生效，
       * 所以面板/设置页只剩纯文本堆叠。这里改为直接建 <style>（宿主自带插件都这么做），
       * 按 data-plugin-css 去重，并在每个面板/设置页根节点再渲染一份 <StyleTag/> 兜底。
       */
      try {
        ctx.effect(() => {
          const tag = ensureGlobalStyle()
          return () => { dropGlobalStyle(tag) }
        }, 'mode-exchange styles')
      } catch (error) {
        // 样式挂不上只是丑，不该拖垮插槽注册。
        console.error('[dsh-mode-exchange] 样式注入失败：', error)
      }

      /**
       * 订阅「当前会话」。sessions.list 是可观察快照，订阅后跟随主视图切换实时更新，
       * 不再用 location 正则去猜。
       */
      function useActiveSessionId() {
        const sessions = ctx.get('sessions')
        const read = () => mainViewSessionId(sessions)
        const [sessionId, setSessionId] = React.useState(read)
        React.useEffect(() => {
          if (!sessions || !sessions.list || typeof sessions.list.subscribe !== 'function') return undefined
          const sync = () => {
            const next = read()
            setSessionId(previous => (previous === next ? previous : next))
          }
          sync()
          const dispose = sessions.list.subscribe(sync)
          return () => { if (typeof dispose === 'function') dispose() }
        }, [])
        return sessionId
      }

      /**
       * 逐项注册插槽。
       *
       * 宿主不同版本的插槽名并不保证齐全（例如某些版本没有 settings.section.icon），
       * 而 ctx.slots.inject 命中不存在的插槽时会抛错。裸写法下任何一处抛错都会中断整个
       * apply，后面的入口全部注册不上 —— 表现正是「插件显示已启动，侧栏图标和设置分节却
       * 一个都不见了」。所以这里统一兜住：一项失败只记日志，不影响其余入口。
       */
      function safeSlot(name, register) {
        try {
          ctx.slots.inject(name, register)
        } catch (error) {
          try {
            console.error('[dsh-mode-exchange] ' + name + ' 插槽注册失败：', error)
          } catch (ignored) {
            void ignored
          }
        }
      }

      // ---- 中央面板 ----
      safeSlot('main', () => ctx.slots.register(
        { name: 'main', key: PANEL_KEY, order: 40 },
        function ModeExchangePanel(props) {
          const sessionId = useActiveSessionId()
          const Panel = makePanel(React, deps)
          return h(Panel, {
            sessionId: sessionId || (props && props.sessionId) || null,
            onClose: props && props.closePanel,
          })
        },
      ))

      // ---- 侧栏图标入口：id 与 main 的 key 同名，点击即切面板 ----
      safeSlot('sidebar.panellist', () => ctx.slots.register(
        {
          name: 'sidebar.panellist',
          id: PANEL_ENTRY_ID,
          order: 35,
          label: () => t('panel.title'),
        },
        function ModeExchangeIcon(props) {
          const size = props && typeof props.size === 'number' ? props.size : 18
          const active = props && props.active === true
          return h('svg', {
            viewBox: '0 0 16 16',
            width: size,
            height: size,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: active ? 1.7 : 1.3,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': true,
            style: { display: 'block', pointerEvents: 'none' },
          },
          h('path', { d: 'M2.5 4.5h5.2' }),
          h('path', { d: 'M10.3 4.5h3.2' }),
          h('path', { d: 'M2.5 11.5h3.2' }),
          h('path', { d: 'M8.3 11.5h5.2' }),
          h('circle', { cx: 9, cy: 4.5, r: 1.5 }),
          h('circle', { cx: 7, cy: 11.5, r: 1.5 }),
          )
        },
      ))

      // ---- 设置页与图标 ----
      safeSlot('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: SETTINGS_ID, order: 62, label: () => t('settings.title') },
        makeSettings(React, deps),
      ))

      safeSlot('settings.section.icon', () => ctx.slots.register(
        { name: 'settings.section.icon', id: SETTINGS_ID, order: 62 },
        makeSettingsIcon(React),
      ))

      /**
       * ---- 会话右键菜单 ----
       * 在会话列表行（session）与标题「更多」（sessionHeader）里加「切换模式」子菜单。
       * contextMenus 是可选服务：缺席时这里静默跳过，面板与设置页不受影响。
       */
      try {
        mountSessionMenu(ctx, deps)
      } catch (error) {
        // contextMenus 是可选服务，缺席时静默跳过。
        console.error('[dsh-mode-exchange] 右键菜单挂载失败：', error)
      }
    },
  }
}
