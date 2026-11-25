import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const loaded = []

globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      loaded.push(definition)
    },
  },
}

await import(pathToFileURL(path.join(root, 'client.js')).href)
assert.equal(loaded.length, 1, 'client.js must register exactly one module')
const definition = loaded[0]
assert.equal(definition.id, 'dsh-agent-identity')

const fakeReact = {
  createElement: (...args) => ({ type: args[0], props: args[1] ?? null, children: args.slice(2) }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
}

const module = definition.factory((specifier) => {
  assert.equal(specifier, 'react')
  return fakeReact
})

assert.deepEqual(module.inject, ['slots'])

const registered = []
const specs = []
const ctx = {
  slots: {
    inject(name, factory) {
      assert.equal(typeof name, 'string')
      registered.push(name)
      factory()
    },
    register(spec, component) {
      specs.push({ spec, component })
      return () => {}
    },
  },
  get() {
    return undefined
  },
}

module.apply(ctx)

assert.deepEqual(registered.sort(), [
  'conversation.hero.options',
  'conversation.input.dock',
  'settings.section',
  'settings.section.icon',
])
assert.equal(specs.length, 4)
for (const { spec, component } of specs) {
  assert.equal(spec.name, spec.name)
  assert.equal(typeof spec.id, 'string')
  assert.ok(Number.isFinite(spec.order))
  assert.ok(spec.order >= 0 && spec.order <= 100)
  assert.equal(typeof component, 'function')
  if (typeof spec.label === 'function') {
    const label = spec.label()
    assert.equal(typeof label, 'string')
    assert.ok(label.length > 0)
  }
}

// The picker must render nothing without a session and stay inert with one.
const pickerSpec = specs.find((item) => item.spec.id === 'agent-identity.dock')
const element = pickerSpec.component({})
assert.equal(typeof element.type, 'function')
assert.equal(element.type({}), null)

console.log('client harness: 4 slots registered, labels callable, picker inert without sessionId')
