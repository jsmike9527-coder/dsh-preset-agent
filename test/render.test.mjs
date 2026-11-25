// Client-side render test: loads client.js through the same
// window.__ModuleLoader__ contract the host page uses, then server-renders every
// registered component with real React. This catches render-time crashes
// (bad props, hooks misuse, undefined helpers) before a DSH restart.
//
//   node test/render.test.mjs   (needs the react/react-dom devDependencies)
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = path.resolve(import.meta.dirname, '..')

// --- host page globals ------------------------------------------------------
globalThis.navigator ??= { language: 'zh-CN' }
let loaded
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      loaded = definition
    },
  },
}

// Every API call the components make resolves to an empty, successful payload.
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ ok: true, identities: [], selection: 'none', active: null, text: '' }),
})

await import(pathToFileURL(path.join(root, 'client.js')).href)

assert.ok(loaded, 'client.js must register itself through window.__ModuleLoader__')
assert.equal(loaded.id, 'dsh-agent-identity')
assert.equal(typeof loaded.factory, 'function')

const exported = loaded.factory((id) => {
  if (id === 'react') return React
  throw new Error(`client.js required an unexpected module: ${id}`)
})
assert.deepEqual(exported.inject, ['slots'])
assert.equal(typeof exported.apply, 'function')

// --- fake slots service -----------------------------------------------------
const registered = []
const ctx = {
  slots: {
    inject(name, register) {
      assert.equal(typeof register, 'function')
      register()
    },
    register(spec, component) {
      registered.push({ spec, component })
      return () => {}
    },
  },
  get: () => undefined,
  effect: (fn) => (typeof fn === 'function' ? fn() : undefined),
}

exported.apply(ctx)

const byId = new Map(registered.map((entry) => [entry.spec.id, entry]))
assert.deepEqual([...byId.keys()].sort(), [
  'agent-identity',
  'agent-identity.dock',
  'agent-identity.hero',
])
assert.equal(registered.length, 4, 'two slots share the agent-identity settings id (section + icon)')
for (const { spec } of registered) {
  assert.equal(typeof spec.order, 'number')
  assert.ok(spec.name)
  if (spec.label) assert.equal(typeof spec.label(), 'string')
}

const render = (entry, props) => renderToStaticMarkup(React.createElement(entry.component, props))
const settings = registered.filter((entry) => entry.spec.name === 'settings.section')[0]
const icon = registered.filter((entry) => entry.spec.name === 'settings.section.icon')[0]
const dock = byId.get('agent-identity.dock')

// --- picker: inert until the slot hands it a session ------------------------
assert.equal(render(dock, {}), '', 'pickers stay out of the layout when the host passes no sessionId')

const pickerMarkup = render(dock, { sessionId: 'session-test' })
assert.match(pickerMarkup, /身份|Identity/, 'picker shows its label in the host locale')
assert.match(pickerMarkup, /加载中|Loading/, 'picker renders its loading state before the first fetch')

// --- settings section ------------------------------------------------------
const settingsMarkup = render(settings, {})
assert.match(settingsMarkup, /Agent 身份|Agent identit/, 'settings section renders its title')
assert.match(settingsMarkup, /加载中|Loading/)

// --- icon ------------------------------------------------------------------
const iconMarkup = render(icon, {})
assert.match(iconMarkup, /^<svg/, 'settings icon renders as an svg')

// --- layered panel ---------------------------------------------------------
const { LayersPanel, LayerGroup } = exported.__test
const t = exported.__test.detectCopy(undefined)
const identities = [
  { id: 'ai-1', name: 'Alpha', description: 'first persona' },
  { id: 'ai-2', name: 'Beta', description: '' },
]
const state = {
  identities,
  layers: { global: ['ai-1'], project: [], session: ['ai-2', 'ai-1'] },
  projectKey: 'g/projectcode/demo',
  muted: false,
  active: [
    { id: 'ai-1', name: 'Alpha', layer: 'global' },
    { id: 'ai-2', name: 'Beta', layer: 'session' },
    { id: 'ai-1', name: 'Alpha', layer: 'session' },
  ],
}
const panelMarkup = renderToStaticMarkup(
  React.createElement(LayersPanel, {
    t,
    state,
    busy: false,
    error: '',
    onToggle: () => {},
    onMove: () => {},
    onMute: () => {},
    onClose: () => {},
  }),
)
assert.match(panelMarkup, /全局/, 'panel renders the global group')
assert.match(panelMarkup, /项目/, 'panel renders the project group when a project key resolves')
assert.match(panelMarkup, /会话/, 'panel renders the session group')
assert.equal(
  (panelMarkup.match(/type="checkbox"/g) ?? []).length,
  7,
  'panel renders one checkbox per identity per layer plus the mute toggle',
)
assert.equal(
  (panelMarkup.match(/<input[^>]*checked=""/g) ?? []).length,
  3,
  'checked boxes follow the layers (1 global + 2 session); mute stays unchecked',
)
assert.match(panelMarkup, /↑/, 'selected entries expose reordering controls')
assert.match(panelMarkup, /first persona/, 'identity descriptions become hover titles')

const mutedMarkup = renderToStaticMarkup(
  React.createElement(LayersPanel, {
    t,
    state: { ...state, muted: true },
    busy: false,
    error: 'boom',
    onToggle: () => {},
    onMove: () => {},
    onMute: () => {},
    onClose: () => {},
  }),
)
assert.match(mutedMarkup, /本会话静音/, 'panel still renders the mute toggle when muted')
assert.match(mutedMarkup, /boom/, 'panel surfaces the last error')

assert.equal(
  renderToStaticMarkup(
    React.createElement(LayerGroup, {
      t,
      kind: 'global',
      title: t.layerGlobal,
      ids: [],
      identities: [],
      busy: false,
      onToggle: () => {},
      onMove: () => {},
    }),
  ).includes('checkbox'),
  false,
  'empty groups render no checkboxes',
)

console.log(
  'render harness: 4 slots, picker inert without session, layered panel + settings + icon render under real React',
)
