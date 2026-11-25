/**
 * 插件设置页（注册到 settings.section）。六个配置项与侧栏面板共用同一份 store，
 * 保存后立即回写 store，保证两边开关状态同步（FR-15）。
 */

import { Notice, Select, Toggle, TextField, Button, Card, Section, PanelHead, StyleTag } from './ui.js'

const FIELDS = ['defaultMode', 'deleteOldSession', 'enableTeam', 'exportDir', 'keepExportCopy', 'confirmBeforeMigrate', 'autoOpenTarget']

function pickConfig(source) {
  const next = {}
  for (const key of FIELDS) {
    if (source && source[key] !== undefined) next[key] = source[key]
  }
  return next
}

export function makeSettings(React, deps) {
  const h = React.createElement
  const { api, store, t } = deps

  function useStore() {
    const [snapshot, setSnapshot] = React.useState(store.getState())
    React.useEffect(() => store.subscribe(setSnapshot), [])
    return snapshot
  }

  function Settings(props) {
    const state = useStore()
    const [draft, setDraft] = React.useState(() => pickConfig(state.config))
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState('')
    const [saved, setSaved] = React.useState(false)
    const [confirmWarn, setConfirmWarn] = React.useState(null)
    const [dirty, setDirty] = React.useState(false)

    // 配置从宿主读回后同步到草稿（用户未改动时）。
    React.useEffect(() => {
      if (!dirty) setDraft(pickConfig(state.config))
    }, [state.config, dirty])

    const modeOptions = [{ value: '', label: t('settings.followDefault') }].concat(
      (state.modes || []).map(mode => ({ value: mode.id, label: mode.name || mode.id, disabled: mode.broken === true })),
    )

    function patch(key, value) {
      setDirty(true)
      setSaved(false)
      setDraft(previous => ({ ...previous, [key]: value }))
    }

    async function save() {
      setBusy(true); setError(''); setSaved(false)
      try {
        const payload = { ...draft }
        if (confirmWarn !== null) payload.disableConfirmAcknowledged = confirmWarn === 'yes'
        const value = await api.saveConfig(payload)
        const nextConfig = (value && value.config) || draft
        store.set({ config: nextConfig })
        setDraft(pickConfig(nextConfig))
        setDirty(false)
        setSaved(true)
        setConfirmWarn(null)
      } catch (cause) {
        setError(t('settings.failed', { reason: cause && cause.message ? cause.message : String(cause) }))
      } finally {
        setBusy(false)
      }
    }

    function onConfirmToggle(checked) {
      if (checked === false) {
        // 关闭「迁移前强制确认」需要二次警告（FR-14）。
        setConfirmWarn('ask')
        return
      }
      setConfirmWarn(null)
      patch('confirmBeforeMigrate', true)
    }

    const teamSupported = state.capabilities && state.capabilities.teamSwitch === true

    return h('div', { className: 'dsh-me-root', 'data-flat': 'true' },
      h(StyleTag, { key: 'style' }),
      h(PanelHead, {
        title: t('settings.title'),
        subtitle: t('settings.description'),
        size: 'lg',
      }),

      error ? h(Notice, { kind: 'error' }, error) : null,
      saved ? h(Notice, { kind: 'ok' }, t('settings.saved')) : null,

      h(Section, { title: t('settings.groupBehavior') },
        h(Card, null,
          h(Select, {
            label: t('settings.defaultMode'),
            value: draft.defaultMode || '',
            options: modeOptions,
            onChange: value => patch('defaultMode', value),
            hint: t('settings.defaultModeHint'),
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h('div', { className: 'dsh-me-stack-sm' },
            h(Toggle, {
              label: t('settings.deleteOld'),
              hint: t('settings.deleteOldHint'),
              checked: draft.deleteOldSession !== false,
              onChange: value => patch('deleteOldSession', value),
            }),
            h(Toggle, {
              label: t('settings.team'),
              checked: draft.enableTeam === true,
              onChange: value => patch('enableTeam', value),
              disabled: !teamSupported,
              hint: teamSupported ? t('settings.teamHint') : t('migrate.teamUnsupported'),
            }),
            h(Toggle, {
              label: t('settings.autoOpenTarget'),
              hint: t('settings.autoOpenTargetHint'),
              checked: draft.autoOpenTarget !== false,
              onChange: value => patch('autoOpenTarget', value),
            }),
          ),
        ),
      ),

      h(Section, { title: t('settings.groupExport') },
        h(Card, null,
          h(TextField, {
            label: t('settings.exportDir'),
            value: draft.exportDir || '',
            placeholder: '.dsh/mode-exchange',
            onChange: value => patch('exportDir', value),
            hint: t('settings.exportDirHint'),
            mono: true,
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h(Toggle, {
            label: t('settings.keepExportCopy'),
            hint: t('settings.keepExportCopyHint'),
            checked: draft.keepExportCopy !== false,
            onChange: value => patch('keepExportCopy', value),
          }),
        ),
      ),

      h(Section, { title: t('settings.groupSafety') },
        confirmWarn === null
          ? h(Card, null,
            h(Toggle, {
              label: t('settings.confirm'),
              hint: t('settings.confirmHint'),
              checked: draft.confirmBeforeMigrate !== false,
              onChange: onConfirmToggle,
            }),
          )
          : h(Card, { tone: 'warn' },
            h(Notice, { kind: 'warn' }, t('settings.confirmWarn')),
            h('div', { className: 'dsh-me-footer' },
              h(Button, { onClick: () => setConfirmWarn(null) }, t('common.cancel')),
              h(Button, {
                variant: 'danger',
                onClick: () => { setConfirmWarn('yes'); patch('confirmBeforeMigrate', false) },
              }, t('common.confirm')),
            ),
          ),
      ),

      h('div', { className: 'dsh-me-footer' },
        typeof props.close === 'function' ? h(Button, { onClick: props.close }, t('common.close')) : null,
        h(Button, { variant: 'primary', onClick: save, disabled: busy }, busy ? t('settings.saving') : t('settings.save')),
      ),
    )
  }

  return Settings
}

/** 设置页图标（settings.section.icon）。size 由宿主给出，active 表示当前选中。 */
export function makeSettingsIcon(React) {
  const h = React.createElement
  return function SettingsIcon(props) {
    const size = props && typeof props.size === 'number' ? props.size : 16
    const active = props && props.active === true
    return h('svg', {
      viewBox: '0 0 16 16',
      width: size,
      height: size,
      'aria-hidden': true,
      style: { display: 'block', opacity: active ? 1 : 0.78 },
    },
    h('path', {
      d: 'M2.5 4.5h8M13.5 4.5h0M2.5 11.5h2M7.5 11.5h6',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      fill: 'none',
    }),
    h('circle', { cx: 11.5, cy: 4.5, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
    h('circle', { cx: 5.5, cy: 11.5, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
    )
  }
}
