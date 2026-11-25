// Fidelity test: validate this plugin's Tool definitions AND their runtime
// output with the REAL @deepseek-ai/dsh-tools validators, i.e. exactly what
// ToolsService.register() and the tool executor do. Must run under
// ELECTRON_RUN_AS_NODE so the app.asar bundle is importable:
//   pwsh -NoProfile -File scripts/test-real.ps1
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DSH = process.env.DSH_ASAR_MODULES ?? 'C:/Users/dhm/AppData/Local/Programs/DeepSeek Harness/resources/app.asar/dsh/node_modules'
const toolsModule = await import(pathToFileURL(`${DSH}/@deepseek-ai/dsh-tools/lib/index.js`).href)
const { assertObjectJsonSchema, assertSupportedJsonSchema, validateJsonSchemaValue } = toolsModule

const root = path.resolve(import.meta.dirname, '..')
const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ai-schema-'))
const mod = await import(pathToFileURL(path.join(root, 'index.js')).href)

const registered = new Map()
const ctx = {
  on() {
    return () => {}
  },
  systemPrompt: { section: () => () => {} },
  webServer: { register: () => () => {} },
  effect(fn) {
    return fn()
  },
  get() {
    return undefined
  },
  tools: {
    register(definition) {
      // Mirrors ToolsService.register(): parameters must be a supported object
      // schema, output.schema must be a supported JSON schema.
      assertObjectJsonSchema(definition.parameters)
      assertSupportedJsonSchema(definition.output.schema)
      assert.equal(typeof definition.output.render, 'function')
      assert.equal(typeof definition.execute, 'function')
      registered.set(definition.name, definition)
      return () => {}
    },
    get(name) {
      return registered.get(name)
    },
  },
}

mod.apply(ctx, { storeDir })
assert.deepEqual([...registered.keys()].sort(), [
  'agent_identities',
  'delegate_to_identity',
  'delete_identity',
  'save_identity',
  'switch_identity',
])

// ---- runtime output must satisfy the declared schema ------------------------
const store = (await import(pathToFileURL(path.join(root, 'lib', 'store.js')).href))
  .createStore({ dir: storeDir })
const saved = store.save({ name: 'Schema Persona', description: 'runtime output check', body: 'BODY' })
const exec = { agent: { id: 'session-tool' }, signal: undefined }

const run = async (name, args) => {
  const definition = registered.get(name)
  const value = await definition.execute(args, exec)
  const violations = validateJsonSchemaValue(definition.output.schema, value)
  assert.equal(violations.length, 0, `${name} output violates its schema: ${JSON.stringify(violations)}`)
  const blocks = definition.output.render(args, value)
  assert.ok(Array.isArray(blocks) && blocks.length > 0, `${name} render must return content blocks`)
  assert.equal(blocks[0].type, 'text')
  return value
}

const listed = await run('agent_identities', {})
assert.equal(listed.identities.length, 1)
assert.equal(listed.identities[0].bodyBytes, 4)
assert.deepEqual(listed.active, [])
assert.equal(listed.muted, false)
assert.deepEqual(listed.layers, { global: [], project: [], session: [] })

const switched = await run('switch_identity', { identity: 'Schema Persona' })
assert.deepEqual(switched.active, [{ name: 'Schema Persona', layer: 'session' }])
assert.equal(switched.muted, false)

const muted = await run('switch_identity', { identity: 'none' })
assert.deepEqual(muted.active, [])
assert.equal(muted.muted, true)

await assert.rejects(run('switch_identity', { identity: 'no such identity' }), /unknown identity/)
await assert.rejects(run('switch_identity', {}), /identity or identities is required/)
await assert.rejects(
  run('switch_identity', { identity: 'Schema Persona', layer: 'project' }),
  /cannot resolve the project directory/,
)
await assert.rejects(
  run('delegate_to_identity', { identity: saved.name, prompt: 'do the thing' }),
  /no subagent runtime available/,
)

// Chat-side CRUD: outputs of save_identity / delete_identity must satisfy their schemas too.
const created = await run('save_identity', { name: 'Fresh Persona', description: 'created from chat', body: 'FRESH' })
assert.equal(created.created, true)
assert.equal(created.bodyBytes, 5)
const renamed = await run('save_identity', { identity: created.id, name: 'Fresh Persona 2', body: 'FRESH BODY' })
assert.equal(renamed.created, false)
await assert.rejects(run('save_identity', { name: 'Fresh Persona 2', body: 'x' }), /already uses the name/)

// Stacking: several identities in one layer, broad to specific, plus a global entry.
const stacked = await run('switch_identity', {
  identities: ['Schema Persona', renamed.name],
  layer: 'session',
})
assert.deepEqual(
  stacked.active.filter((item) => item.layer === 'session'),
  [
    { name: 'Schema Persona', layer: 'session' },
    { name: renamed.name, layer: 'session' },
  ],
)
assert.equal(stacked.muted, false)
const globalLayer = await run('switch_identity', { identity: 'Schema Persona', layer: 'global' })
assert.deepEqual(globalLayer.active, [
  { name: 'Schema Persona', layer: 'global' },
  { name: 'Schema Persona', layer: 'session' },
  { name: renamed.name, layer: 'session' },
])
const stateViaList = await run('agent_identities', {})
assert.deepEqual(stateViaList.layers.global, [saved.id])
assert.deepEqual(stateViaList.layers.session, [saved.id, renamed.id])
await run('switch_identity', { identity: 'none' })
const removed = await run('delete_identity', { identity: renamed.id })
assert.deepEqual(removed, { deleted: true, name: 'Fresh Persona 2' })

console.log('tool schemas + runtime outputs validated by dsh-tools:', [...registered.keys()].sort().join(', '))
