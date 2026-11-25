window.__ModuleLoader__.load({
  id: 'dsh-agent-identity',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useState } = React

    const API = '/api/agent-identity/'

    /* ------------------------------------------------------------------ */
    /* data access                                                         */
    /* ------------------------------------------------------------------ */

    async function api(path, body) {
      const init =
        body === undefined
          ? { headers: { accept: 'application/json' } }
          : {
              method: 'POST',
              headers: { 'content-type': 'application/json', accept: 'application/json' },
              body: JSON.stringify(body),
            }
      const response = await fetch(API + path, init)
      let data = {}
      try {
        data = await response.json()
      } catch {
        data = {}
      }
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || `HTTP ${response.status}`)
      }
      return data
    }

    /* ------------------------------------------------------------------ */
    /* copy                                                                */
    /* ------------------------------------------------------------------ */

    const EN = {
      label: 'Identity',
      native: 'Native (no identity)',
      manage: 'Manage identities…',
      activePrefix: 'Active:',
      heroTitle: 'Agent identity',
      loading: 'Loading…',
      failed: 'Could not load identities',
      settingsLabel: 'Agent identity',
      settingsTitle: 'Agent identities',
      settingsHint:
        'A named identity is a reusable persona injected into the system prompt ahead of the project instructions. Pick identities per layer (global, project, this session) from the picker above the composer; layers stack, and the later one wins on conflict.',
      newIdentity: 'New identity',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      saving: 'Saving…',
      cancel: 'Cancel',
      name: 'Name',
      namePlaceholder: 'e.g. Rust reviewer',
      description: 'Summary',
      descriptionPlaceholder: 'One line shown in the picker',
      body: 'Identity instructions',
      bodyPlaceholder: 'How this identity works: role, priorities, review style, forbidden moves…',
      bodyHint: 'Markdown. Injected verbatim at the top of the system prompt.',
      empty: 'No identities yet. Create the first one.',
      count: (n) => `${n} identity(ies)`,
      saved: 'Saved',
      deleted: 'Deleted',
      confirmDelete: (name) => `Delete the identity "${name}"? Sessions using it fall back to the native identity.`,
      preview: 'Preview injection',
      previewEmpty: 'Nothing is injected for this session right now.',
      close: 'Close',
      mutedShort: 'Muted',
      layersTitle: 'Identity layers',
      layersHint: 'Layers stack broad to specific; the later one wins on conflict.',
      layerGlobal: 'Global (every session)',
      layerProject: 'Project (this folder)',
      layerSession: 'Session (this chat)',
      mute: 'Mute every identity for this chat',
      moveUp: 'Move up',
      moveDown: 'Move down',
    }

    const ZH = {
      label: '身份',
      native: '原生（无身份）',
      manage: '管理身份…',
      activePrefix: '当前：',
      heroTitle: 'Agent 身份',
      loading: '加载中…',
      failed: '身份列表加载失败',
      settingsLabel: 'Agent 身份',
      settingsTitle: 'Agent 身份',
      settingsHint:
        '具名身份是一段可复用的设定，会注入系统提示词并排在项目指令之前。在输入框上方的选择器里按层挑选（全局 / 项目 / 本会话）；各层依次叠加，冲突时后者优先。',
      newIdentity: '新建身份',
      edit: '编辑',
      delete: '删除',
      save: '保存',
      saving: '保存中…',
      cancel: '取消',
      name: '名称',
      namePlaceholder: '例如：Rust 审查员',
      description: '简介',
      descriptionPlaceholder: '选择器里显示的一行说明',
      body: '身份设定',
      bodyPlaceholder: '这个身份如何工作：角色、优先级、审查风格、禁止动作……',
      bodyHint: 'Markdown，将原样注入系统提示词最前面。',
      empty: '还没有身份，先创建一个。',
      count: (n) => `${n} 个身份`,
      saved: '已保存',
      deleted: '已删除',
      confirmDelete: (name) => `删除身份「${name}」？使用该身份的会话会退回原生身份。`,
      preview: '预览注入内容',
      previewEmpty: '当前会话没有注入任何身份。',
      close: '关闭',
      mutedShort: '已静音',
      layersTitle: '身份层',
      layersHint: '各层依次叠加，越靠下越具体；冲突时后者优先。',
      layerGlobal: '全局（所有会话）',
      layerProject: '项目（当前目录）',
      layerSession: '会话（当前对话）',
      mute: '本会话静音（不使用任何身份）',
      moveUp: '上移',
      moveDown: '下移',
    }

    function detectCopy(ctx) {
      try {
        const snapshot = ctx.get('locale')?.getLocale?.()
        const id =
          typeof snapshot === 'string'
            ? snapshot
            : (snapshot?.id ?? snapshot?.locale ?? snapshot?.active ?? snapshot?.language ?? '')
        if (typeof id === 'string' && id) return id.toLowerCase().startsWith('zh') ? ZH : EN
      } catch {
        /* fall through to the browser */
      }
      const nav = typeof navigator !== 'undefined' ? navigator.language || '' : ''
      return nav.toLowerCase().startsWith('zh') ? ZH : EN
    }

    /* ------------------------------------------------------------------ */
    /* styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.dsh-ai { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-primary, inherit); }
.dsh-ai-bar { display: inline-flex; align-items: center; gap: 6px; min-width: 0; position: relative; }
.dsh-ai-label { color: var(--dsw-alias-label-secondary, #888); white-space: nowrap; }
.dsh-ai-trigger {
  display: inline-flex; align-items: center; gap: 6px; max-width: 260px;
  padding: 2px 8px; font: inherit; cursor: pointer;
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-l1, rgba(127,127,127,.08));
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  border-radius: var(--dsw-radius-md, 6px);
}
.dsh-ai-trigger:hover { background: var(--dsw-alias-bg-l2, rgba(127,127,127,.16)); }
.dsh-ai-trigger:disabled { opacity: .55; cursor: default; }
.dsh-ai-trigger.is-muted { color: var(--dsw-alias-label-secondary, #888); font-style: italic; }
.dsh-ai-trigger-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-ai-caret { font-size: 10px; opacity: .7; }
.dsh-ai-pop {
  position: absolute; left: 0; bottom: calc(100% + 6px); z-index: 40;
  display: grid; gap: 8px; min-width: 250px; max-width: 330px; max-height: 62vh; overflow: auto;
  padding: 10px 12px;
  background: var(--dsw-alias-bg-l1, #fff);
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  border-radius: var(--dsw-radius-lg, 10px);
  box-shadow: 0 10px 28px rgba(0,0,0,.18);
}
.dsh-ai-pop-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 600; }
.dsh-ai-group-head { font-weight: 600; margin-top: 2px; }
.dsh-ai-checks { display: grid; gap: 2px; padding-left: 2px; }
.dsh-ai-check { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.dsh-ai-check-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-ai-order { display: inline-flex; gap: 2px; }
.dsh-ai-mini {
  padding: 0 6px; font: inherit; line-height: 1.7; cursor: pointer;
  color: inherit; background: transparent;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  border-radius: 4px;
}
.dsh-ai-mini:disabled { opacity: .35; cursor: default; }
.dsh-ai-mute { border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); padding-top: 8px; }
.dsh-ai-badge {
  padding: 1px 6px; border-radius: 999px; font-size: 11px;
  color: var(--dsw-alias-label-secondary, #888);
  background: var(--dsw-alias-bg-l2, rgba(127,127,127,.12));
}
.dsh-ai-error { color: var(--dsw-alias-label-danger, #d33); }
.dsh-ai-section { display: grid; gap: 14px; max-width: 720px; }
.dsh-ai-hint { color: var(--dsw-alias-label-secondary, #888); }
.dsh-ai-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-ai-card {
  display: grid; gap: 6px; padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3));
  border-radius: var(--dsw-radius-lg, 10px);
  background: var(--dsw-alias-bg-l1, rgba(127,127,127,.05));
}
.dsh-ai-card-head { display: flex; align-items: baseline; gap: 8px; }
.dsh-ai-name { font-weight: 600; font-size: 13px; }
.dsh-ai-muted { color: var(--dsw-alias-label-secondary, #888); font-size: 11px; }
.dsh-ai-btn {
  padding: 4px 10px; font: inherit; cursor: pointer; white-space: nowrap;
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-l2, rgba(127,127,127,.1));
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  border-radius: var(--dsw-radius-md, 6px);
}
.dsh-ai-btn:hover { background: var(--dsw-alias-bg-l1, rgba(127,127,127,.18)); }
.dsh-ai-btn:disabled { opacity: .5; cursor: default; }
.dsh-ai-btn-primary {
  color: #fff; background: var(--dsw-alias-brand-primary, #247bbf);
  border-color: transparent;
}
.dsh-ai-btn-danger { color: var(--dsw-alias-label-danger, #d33); }
.dsh-ai-field { display: grid; gap: 4px; }
.dsh-ai-input, .dsh-ai-textarea {
  width: 100%; box-sizing: border-box; padding: 6px 8px; font: inherit;
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-l1, rgba(127,127,127,.06));
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.35));
  border-radius: var(--dsw-radius-md, 6px);
}
.dsh-ai-textarea {
  min-height: 220px; resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px; line-height: 1.6;
}
.dsh-ai-preview {
  max-height: 260px; overflow: auto; margin: 0; padding: 10px; white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px;
  background: var(--dsw-alias-bg-l2, rgba(127,127,127,.1));
  border-radius: var(--dsw-radius-md, 6px);
}
`

    function Style() {
      return h('style', { dangerouslySetInnerHTML: { __html: CSS } })
    }

    /* ------------------------------------------------------------------ */
    /* picker                                                              */
    /* ------------------------------------------------------------------ */

    function useIdentityState(sessionId) {
      const [state, setState] = useState(null)
      const [error, setError] = useState('')
      const [busy, setBusy] = useState(false)
      const projectKey = state?.projectKey ?? ''

      const reload = useCallback(async () => {
        if (!sessionId) return
        try {
          setState(await api(`state?sessionId=${encodeURIComponent(sessionId)}`))
          setError('')
        } catch (err) {
          setError(String(err?.message ?? err))
        }
      }, [sessionId])

      useEffect(() => {
        reload()
      }, [reload])

      const apply = useCallback(
        async (scope, ids) => {
          if (!sessionId) return
          setBusy(true)
          try {
            setState(await api('select', { scope, sessionId, projectKey, ids }))
            setError('')
          } catch (err) {
            setError(String(err?.message ?? err))
          } finally {
            setBusy(false)
          }
        },
        [sessionId, projectKey],
      )

      return { state, error, busy, apply, reload }
    }

    function LayerGroup(props) {
      const { t, kind, title, ids, identities, busy, onToggle, onMove } = props
      const list = ids ?? []
      return h(
        'div',
        { className: 'dsh-ai-group' },
        h('div', { className: 'dsh-ai-group-head' }, title),
        identities.length === 0
          ? h('div', { className: 'dsh-ai-muted' }, t.empty)
          : h(
              'div',
              { className: 'dsh-ai-checks' },
              identities.map((item) => {
                const index = list.indexOf(item.id)
                const checked = index >= 0
                return h(
                  'label',
                  { key: `${kind}:${item.id}`, className: 'dsh-ai-check' },
                  h('input', {
                    type: 'checkbox',
                    checked,
                    disabled: busy,
                    onChange: () => onToggle(kind, item.id),
                  }),
                  h('span', { className: 'dsh-ai-check-name', title: item.description || item.name }, item.name),
                  checked
                    ? h(
                        'span',
                        { className: 'dsh-ai-order' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsh-ai-mini',
                            title: t.moveUp,
                            disabled: busy || index === 0,
                            onClick: (event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              onMove(kind, index, -1)
                            },
                          },
                          '↑',
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsh-ai-mini',
                            title: t.moveDown,
                            disabled: busy || index === list.length - 1,
                            onClick: (event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              onMove(kind, index, 1)
                            },
                          },
                          '↓',
                        ),
                      )
                    : null,
                )
              }),
            ),
      )
    }

    function LayersPanel(props) {
      const { t, state, busy, error, onToggle, onMove, onMute, onClose } = props
      const identities = state?.identities ?? []
      const layers = state?.layers ?? { global: [], project: [], session: [] }
      const muted = state?.muted === true
      return h(
        'div',
        { className: 'dsh-ai-pop' },
        h(
          'div',
          { className: 'dsh-ai-pop-head' },
          h('span', null, t.layersTitle),
          h('button', { type: 'button', className: 'dsh-ai-mini', onClick: onClose }, t.close),
        ),
        h('div', { className: 'dsh-ai-muted' }, t.layersHint),
        h(LayerGroup, {
          t,
          kind: 'global',
          title: t.layerGlobal,
          ids: layers.global,
          identities,
          busy,
          onToggle,
          onMove,
        }),
        state?.projectKey
          ? h(LayerGroup, {
              t,
              kind: 'project',
              title: t.layerProject,
              ids: layers.project,
              identities,
              busy,
              onToggle,
              onMove,
            })
          : null,
        h(LayerGroup, {
          t,
          kind: 'session',
          title: t.layerSession,
          ids: layers.session,
          identities,
          busy,
          onToggle,
          onMove,
        }),
        h(
          'label',
          { className: 'dsh-ai-check dsh-ai-mute' },
          h('input', { type: 'checkbox', checked: muted, disabled: busy, onChange: onMute }),
          h('span', null, t.mute),
        ),
        error ? h('div', { className: 'dsh-ai-error' }, error) : null,
      )
    }

    function Picker(props) {
      const t = props.t
      const sessionId = props.sessionId
      const { state, error, busy, apply } = useIdentityState(sessionId)
      const [open, setOpen] = useState(false)
      if (!sessionId) return null

      const identities = state?.identities ?? []
      const layers = state?.layers ?? { global: [], project: [], session: [] }
      const muted = state?.muted === true
      const active = state?.active ?? []
      const summary = muted ? t.mutedShort : active.map((item) => item.name).join(' + ') || t.native

      const toggle = (kind, id) => {
        const current = layers[kind] ?? []
        const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        apply(kind, next)
      }

      const move = (kind, index, delta) => {
        const current = [...(layers[kind] ?? [])]
        const target = index + delta
        if (target < 0 || target >= current.length) return
        const [item] = current.splice(index, 1)
        current.splice(target, 0, item)
        apply(kind, current)
      }

      return h(
        'div',
        { className: 'dsh-ai dsh-ai-bar', title: t.heroTitle },
        h(Style),
        h('span', { className: 'dsh-ai-label' }, t.label),
        h(
          'button',
          {
            type: 'button',
            className: `dsh-ai-trigger${muted ? ' is-muted' : ''}`,
            disabled: !state,
            onClick: () => setOpen((value) => !value),
          },
          h('span', { className: 'dsh-ai-trigger-text' }, state ? summary : t.loading),
          h('span', { className: 'dsh-ai-caret' }, open ? '▴' : '▾'),
        ),
        open
          ? h(LayersPanel, {
              t,
              state,
              busy,
              error,
              onToggle: toggle,
              onMove: move,
              onMute: () => apply('session', muted ? [] : 'none'),
              onClose: () => setOpen(false),
            })
          : null,
      )
    }

    /* ------------------------------------------------------------------ */
    /* settings section                                                    */
    /* ------------------------------------------------------------------ */

    function IdentityEditor(props) {
      const { t, draft, onCancel, onSaved } = props
      const [form, setForm] = useState(draft)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const patch = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))

      const save = async () => {
        setBusy(true)
        setError('')
        try {
          const data = await api('save', {
            identity: {
              id: form.id || undefined,
              name: form.name,
              description: form.description,
              body: form.body,
            },
          })
          onSaved(data)
        } catch (err) {
          setError(String(err?.message ?? err))
        } finally {
          setBusy(false)
        }
      }

      return h(
        'div',
        { className: 'dsh-ai dsh-ai-card' },
        h(Style),
        h(
          'div',
          { className: 'dsh-ai-field' },
          h('label', { className: 'dsh-ai-muted' }, t.name),
          h('input', {
            className: 'dsh-ai-input',
            value: form.name,
            maxLength: 64,
            placeholder: t.namePlaceholder,
            onChange: patch('name'),
          }),
        ),
        h(
          'div',
          { className: 'dsh-ai-field' },
          h('label', { className: 'dsh-ai-muted' }, t.description),
          h('input', {
            className: 'dsh-ai-input',
            value: form.description,
            maxLength: 280,
            placeholder: t.descriptionPlaceholder,
            onChange: patch('description'),
          }),
        ),
        h(
          'div',
          { className: 'dsh-ai-field' },
          h('label', { className: 'dsh-ai-muted' }, t.body),
          h('textarea', {
            className: 'dsh-ai-textarea',
            value: form.body,
            placeholder: t.bodyPlaceholder,
            spellCheck: false,
            onChange: patch('body'),
          }),
          h('span', { className: 'dsh-ai-muted' }, t.bodyHint),
        ),
        error ? h('div', { className: 'dsh-ai-error' }, error) : null,
        h(
          'div',
          { className: 'dsh-ai-row' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-ai-btn dsh-ai-btn-primary',
              disabled: busy || !form.name.trim(),
              onClick: save,
            },
            busy ? t.saving : t.save,
          ),
          h('button', { type: 'button', className: 'dsh-ai-btn', disabled: busy, onClick: onCancel }, t.cancel),
        ),
      )
    }

    function Preview(props) {
      const { t, sessionId, onClose } = props
      const [text, setText] = useState(null)
      useEffect(() => {
        let live = true
        api(`preview?sessionId=${encodeURIComponent(sessionId ?? '')}`)
          .then((data) => {
            if (live) setText(String(data.text ?? ''))
          })
          .catch(() => {
            if (live) setText('')
          })
        return () => {
          live = false
        }
      }, [sessionId])
      return h(
        'div',
        { className: 'dsh-ai dsh-ai-card' },
        h(Style),
        h(
          'div',
          { className: 'dsh-ai-row' },
          h('strong', null, t.preview),
          h('button', { type: 'button', className: 'dsh-ai-btn', onClick: onClose }, t.close),
        ),
        h('pre', { className: 'dsh-ai-preview' }, text === null ? t.loading : text || t.previewEmpty),
      )
    }

    function SettingsSection(props) {
      const { t, ctx } = props
      const [identities, setIdentities] = useState(null)
      const [draft, setDraft] = useState(null)
      const [error, setError] = useState('')
      const [notice, setNotice] = useState('')
      const [showPreview, setShowPreview] = useState(false)

      const reload = useCallback(async () => {
        try {
          const data = await api('state')
          setIdentities(data.identities ?? [])
          setError('')
        } catch (err) {
          setError(String(err?.message ?? err))
        }
      }, [])

      useEffect(() => {
        reload()
      }, [reload])

      const startNew = () => {
        setNotice('')
        setDraft({ id: '', name: '', description: '', body: '' })
      }

      const startEdit = async (item) => {
        setNotice('')
        try {
          const data = await api(`get?id=${encodeURIComponent(item.id)}`)
          setDraft({
            id: data.identity.id,
            name: data.identity.name,
            description: data.identity.description ?? '',
            body: data.identity.body ?? '',
          })
        } catch (err) {
          setError(String(err?.message ?? err))
        }
      }

      const remove = async (item) => {
        if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(t.confirmDelete(item.name))) {
          return
        }
        try {
          const data = await api('delete', { id: item.id })
          setIdentities(data.identities ?? [])
          setNotice(t.deleted)
          setError('')
          setDraft(null)
        } catch (err) {
          setError(String(err?.message ?? err))
        }
      }

      const onSaved = (data) => {
        setIdentities(data.identities ?? [])
        setDraft(null)
        setNotice(t.saved)
        setError('')
      }

      return h(
        'div',
        { className: 'dsh-ai dsh-ai-section' },
        h(Style),
        h('div', null, h('div', { className: 'dsh-ai-name' }, t.settingsTitle), h('div', { className: 'dsh-ai-hint' }, t.settingsHint)),
        h(
          'div',
          { className: 'dsh-ai-row' },
          h('button', { type: 'button', className: 'dsh-ai-btn dsh-ai-btn-primary', onClick: startNew }, t.newIdentity),
          h('button', { type: 'button', className: 'dsh-ai-btn', onClick: () => setShowPreview((value) => !value) }, t.preview),
          identities ? h('span', { className: 'dsh-ai-muted' }, t.count(identities.length)) : null,
          notice ? h('span', { className: 'dsh-ai-muted' }, notice) : null,
          error ? h('span', { className: 'dsh-ai-error' }, error) : null,
        ),
        showPreview ? h(Preview, { t, sessionId: '', onClose: () => setShowPreview(false) }) : null,
        draft
          ? h(IdentityEditor, {
              t,
              draft,
              onCancel: () => setDraft(null),
              onSaved,
            })
          : null,
        identities === null
          ? h('div', { className: 'dsh-ai-hint' }, t.loading)
          : identities.length === 0
            ? h('div', { className: 'dsh-ai-hint' }, t.empty)
            : identities.map((item) =>
                h(
                  'div',
                  { className: 'dsh-ai-card', key: item.id },
                  h(
                    'div',
                    { className: 'dsh-ai-card-head' },
                    h('span', { className: 'dsh-ai-name' }, item.name),
                    h('span', { className: 'dsh-ai-muted' }, `${item.id} · ${item.bodyBytes} B`),
                  ),
                  item.description ? h('div', { className: 'dsh-ai-hint' }, item.description) : null,
                  h(
                    'div',
                    { className: 'dsh-ai-row' },
                    h('button', { type: 'button', className: 'dsh-ai-btn', onClick: () => startEdit(item) }, t.edit),
                    h(
                      'button',
                      { type: 'button', className: 'dsh-ai-btn dsh-ai-btn-danger', onClick: () => remove(item) },
                      t.delete,
                    ),
                  ),
                ),
              ),
        )
    }

    /* ------------------------------------------------------------------ */
    /* icon                                                                */
    /* ------------------------------------------------------------------ */

    function Icon() {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 8.5, r: 3.4, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', {
          d: 'M4.8 20c0-3.4 3.2-5.6 7.2-5.6s7.2 2.2 7.2 5.6',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
        h('path', { d: 'M17.6 4.2l1 2.1 2.1 1-2.1 1-1 2.1-1-2.1-2.1-1 2.1-1z', fill: 'currentColor', opacity: 0.85 }),
      )
    }

    /* ------------------------------------------------------------------ */
    /* wiring                                                              */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots'],
      __test: { LayerGroup, LayersPanel, Picker, Style, detectCopy },
      apply(ctx) {
        const t = detectCopy(ctx)

        ctx.slots.inject('conversation.hero.options', () =>
          ctx.slots.register(
            {
              name: 'conversation.hero.options',
              id: 'agent-identity.hero',
              order: 30,
              label: () => t.heroTitle,
            },
            (props) => h(Picker, { ...(props ?? {}), t }),
          ),
        )

        ctx.slots.inject('conversation.input.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.input.dock',
              id: 'agent-identity.dock',
              order: 42,
            },
            (props) => h(Picker, { ...(props ?? {}), t }),
          ),
        )

        ctx.slots.inject('settings.section.icon', () =>
          ctx.slots.register(
            { name: 'settings.section.icon', id: 'agent-identity', order: 64 },
            Icon,
          ),
        )

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'agent-identity',
              order: 64,
              label: () => t.settingsLabel,
            },
            () => h(SettingsSection, { t, ctx }),
          ),
        )
      },
    }
  },
})
