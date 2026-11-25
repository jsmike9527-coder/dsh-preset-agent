import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ai-host-'))
const mod = await import(pathToFileURL(path.join(root, 'index.js')).href)

assert.equal(mod.name, 'agent-identity')
assert.deepEqual(mod.inject, ['systemPrompt', 'tools', 'webServer'])
assert.equal(mod.SECTION_ORDER, -900)

const sections = []
const tools = new Map()
const routes = new Map()
const disposers = []
const listeners = new Map()

const ctx = {
  on(event, listener) {
    listeners.set(event, listener)
    return () => listeners.delete(event)
  },
  systemPrompt: {
    section(section) {
      sections.push(section)
      return () => {}
    },
  },
  tools: {
    register(definition) {
      tools.set(definition.name, definition)
      return () => {}
    },
    get(name) {
      return tools.get(name)
    },
  },
  webServer: {
    register(route) {
      routes.set(route.path, route)
      return () => disposers.push(route.path)
    },
  },
  effect(fn) {
    const dispose = fn()
    return () => {
      dispose?.()
    }
  },
  get(name) {
    if (name === 'workingDirectory') {
      return {
        get(target) {
          const id = target?.id ?? ''
          return id === 'session-multi' ? 'G:/ProJectCode/Tools/demo' : ''
        },
      }
    }
    return undefined
  },
}

mod.apply(ctx, { storeDir })

// ---- system prompt section ------------------------------------------------
assert.equal(sections.length, 1)
const section = sections[0]
assert.equal(section.name, mod.SECTION_NAME)
assert.equal(section.order, -900)
assert.equal(section.interpolate, false)
assert.equal(typeof section.text, 'function')

const session = { id: 'session-1' }
assert.equal(section.text({ agent: { session } }), '', 'native identity injects nothing')
assert.equal(section.text({}), '', 'no agent context injects nothing')

// ---- HTTP API -------------------------------------------------------------
function request(method, url, body) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) {
      this.headers[key] = value
    },
    end(payload) {
      this.body = payload
      this.json = payload ? JSON.parse(payload) : null
    },
  }
}

async function call(routePath, method, url, body) {
  const handler = routes.get(routePath).handler
  const res = response()
  await handler(request(method, url, body), res)
  return res
}

assert.deepEqual([...routes.keys()].sort(), [
  '/api/agent-identity/delete',
  '/api/agent-identity/get',
  '/api/agent-identity/preview',
  '/api/agent-identity/save',
  '/api/agent-identity/select',
  '/api/agent-identity/state',
])

let res = await call('/api/agent-identity/save', 'POST', '/api/agent-identity/save', {
  identity: { name: 'Rust reviewer', description: 'strict', body: 'Review carefully.' },
})
assert.equal(res.statusCode, 200)
assert.equal(res.json.ok, true)
const identityId = res.json.identity.id

res = await call('/api/agent-identity/save', 'POST', '/api/agent-identity/save', { identity: { name: '' } })
assert.equal(res.statusCode, 400)

res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', { sessionId: 'session-1', identityId })
assert.deepEqual(res.json.layers.session, [identityId])
assert.equal(res.json.active[0].name, 'Rust reviewer')
assert.equal(res.json.active[0].layer, 'session')

res = await call('/api/agent-identity/state', 'GET', '/api/agent-identity/state?sessionId=session-1')
assert.equal(res.json.identities.length, 1)
assert.equal(res.json.active[0].name, 'Rust reviewer')
assert.deepEqual(res.json.layers, { global: [], project: [], session: [identityId] })

res = await call('/api/agent-identity/preview', 'GET', '/api/agent-identity/preview?sessionId=session-1')
assert.match(res.json.text, /# Active Agent Identity — Rust reviewer/)
assert.match(res.json.text, /Review carefully\./)

// injection is per session
const rendered = section.text({ agent: { session } })
assert.match(rendered, /Rust reviewer/)
assert.equal(section.text({ agent: { session: { id: 'session-2' } } }), '')

// explicit native selection mutes every layer, even with a default configured
mod.apply(ctx, { storeDir: storeDir }) // second fiber, same store
res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', { sessionId: 'session-1', identityId: 'none' })
assert.deepEqual(res.json.layers.session, [])
assert.equal(res.json.muted, true)
assert.deepEqual(res.json.active, [])
assert.equal(section.text({ agent: { session } }), '')

// ---- tools ----------------------------------------------------------------
assert.deepEqual(
  [...tools.keys()].sort(),
  ['agent_identities', 'delegate_to_identity', 'delete_identity', 'save_identity', 'switch_identity'],
)

res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', { sessionId: 'session-1', identityId: 'rust reviewer' })
assert.deepEqual(res.json.layers.session, [identityId], 'selection accepts a case-insensitive name')

const exec = { agent: { session } }
const listTool = tools.get('agent_identities')
const listed = await listTool.execute({}, exec)
assert.deepEqual(listed.active, [{ name: 'Rust reviewer', layer: 'session' }])
assert.equal(listed.muted, false)
assert.equal(listed.identities.length, 1)
const blocks = listTool.output.render({}, listed)
assert.equal(blocks[0].type, 'text')
assert.match(blocks[0].text, /Rust reviewer \[session\]/)

const switchTool = tools.get('switch_identity')
assert.deepEqual(await switchTool.execute({ identity: 'none' }, exec), { active: [], muted: true })
const switched = await switchTool.execute({ identity: identityId }, exec)
assert.deepEqual(switched.active, [{ name: 'Rust reviewer', layer: 'session' }])
await assert.rejects(() => switchTool.execute({ identity: 'ghost' }, exec), /unknown identity "ghost"/)

const delegateTool = tools.get('delegate_to_identity')
await assert.rejects(
  () => delegateTool.execute({ identity: 'Rust reviewer', prompt: 'review this' }, exec),
  /no subagent runtime available/,
)
await assert.rejects(() => delegateTool.execute({ identity: 'Rust reviewer' }, exec), /prompt is required/)

// ---- identity CRUD from chat ---------------------------------------------
const saveTool = tools.get('save_identity')
await assert.rejects(() => saveTool.execute({ name: 'No body' }, exec), /body is required/)
await assert.rejects(() => saveTool.execute({ body: 'x' }, exec), /name is required/)
await assert.rejects(
  () => saveTool.execute({ name: 'X', body: 'x', identity: 'ghost' }, exec),
  /unknown identity "ghost"/,
)

const createdIdentity = await saveTool.execute(
  { name: 'Ops Partner', description: 'keeps the runbook honest', body: 'OPS-BODY v1' },
  exec,
)
assert.equal(createdIdentity.created, true)
assert.equal(createdIdentity.bodyBytes, Buffer.byteLength('OPS-BODY v1', 'utf8'))
assert.equal(saveTool.output.render({}, createdIdentity)[0].text.includes('Created identity "Ops Partner"'), true)

const updatedIdentity = await saveTool.execute({ identity: createdIdentity.id, name: 'Ops Partner', body: 'OPS-BODY v2' }, exec)
assert.equal(updatedIdentity.created, false)
assert.equal(updatedIdentity.description, 'keeps the runbook honest', 'description is preserved when omitted')

await switchTool.execute({ identity: 'Ops Partner' }, exec)
assert.match(section.text({ agent: { session } }), /OPS-BODY v2/, 'the saved body is what gets injected')

const deleteTool = tools.get('delete_identity')
await assert.rejects(() => deleteTool.execute({ identity: 'Ops Partner 2' }, exec), /unknown identity/)
await assert.rejects(() => deleteTool.execute({}, exec), /identity is required/)
assert.deepEqual(await deleteTool.execute({ identity: createdIdentity.id }, exec), {
  deleted: true,
  name: 'Ops Partner',
})
await switchTool.execute({ identity: 'none' }, exec)

// ---- delete cleans selections --------------------------------------------
res = await call('/api/agent-identity/delete', 'POST', '/api/agent-identity/delete', { id: identityId })
assert.equal(res.json.identities.length, 0)
assert.equal(section.text({ agent: { session } }), '')

// ---- layers: global / project / session ----------------------------------
const createIdentity = async (name, body) => {
  const saved = await call('/api/agent-identity/save', 'POST', '/api/agent-identity/save', { identity: { name, body } })
  return saved.json.identity.id
}
const baseId = await createIdentity('House style', 'BASE-BODY')
const projectId = await createIdentity('Project rules', 'PROJECT-BODY')
const stackId = await createIdentity('Stacked rules', 'STACK-BODY')
const projectKey = 'G:/ProJectCode/Tools/demo'

res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', { scope: 'global', ids: [baseId] })
assert.deepEqual(res.json.layers.global, [baseId])

res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', { scope: 'project', ids: [projectId] })
assert.equal(res.statusCode, 400, 'the project layer needs a project key')

res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', {
  scope: 'project',
  projectKey,
  ids: [projectId],
})
assert.deepEqual(res.json.layers.project, [projectId])

res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', {
  scope: 'session',
  sessionId: 'session-multi',
  projectKey,
  ids: [stackId, baseId],
})
if (!res.json.layers) console.log('DEBUG select', res.statusCode, res.body)
assert.deepEqual(res.json.layers.session, [stackId, baseId])
assert.deepEqual(
  res.json.active.map((item) => `${item.name}[${item.layer}]`),
  ['House style[global]', 'Project rules[project]', 'Stacked rules[session]', 'House style[session]'],
  'layers resolve broad to specific, session order preserved',
)

const multiText = section.text({ agent: { session: { id: 'session-multi' }, id: 'session-multi' } })
assert.match(multiText, /^# Active Agent Identities — /)
assert.match(multiText, /later one wins/)
assert.match(multiText, /## 1\. House style — global/)
assert.match(multiText, /## 2\. Project rules — project/)
assert.match(multiText, /## 3\. Stacked rules — session/)
assert.match(multiText, /## 4\. House style — session/)
assert.ok(multiText.indexOf('BASE-BODY') < multiText.indexOf('PROJECT-BODY'))

// muting the session drops the more specific layers but the global default still applies elsewhere
res = await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', {
  scope: 'session',
  sessionId: 'session-multi',
  ids: 'none',
})
assert.equal(res.json.muted, true)
assert.equal(section.text({ agent: { session: { id: 'session-multi' } } }), '')
assert.match(section.text({ agent: { session: { id: 'session-plain' } } }), /BASE-BODY/)

// clear the standing layers again so later assertions start from native
await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', { scope: 'global', ids: [] })
await call('/api/agent-identity/select', 'POST', '/api/agent-identity/select', { scope: 'project', projectKey, ids: [] })
assert.equal(section.text({ agent: { session } }), '')

// ---- per-agent scoped registration ---------------------------------------
const created = listeners.get('agent/created')
assert.equal(typeof created, 'function', 'listens for agent/created')

const scopedSections = []
const agentCtx = {
  systemPrompt: {
    section(entry) {
      scopedSections.push(entry)
      return () => {}
    },
  },
  effect(fn) {
    const dispose = fn()
    return () => dispose?.()
  },
}

assert.doesNotThrow(() => created(), 'nullish payload is tolerated')
assert.doesNotThrow(() => created({ agent: { id: 'session-no-ctx' } }), 'agent without ctx is tolerated')
assert.equal(scopedSections.length, 0)

created({ agent: { id: 'session-scoped', ctx: agentCtx } })
assert.equal(scopedSections.length, 1)
assert.equal(scopedSections[0].name, mod.SECTION_NAME)
assert.equal(scopedSections[0].order, -900)
assert.equal(scopedSections[0].interpolate, false)
assert.equal(scopedSections[0].text({}), '', 'no identity selected for the scoped session')

const storeMod = await import(pathToFileURL(path.join(root, 'lib/store.js')).href)
const scopedStore = storeMod.createStore({ dir: storeDir })
const scopedRec = scopedStore.save({ name: 'Scoped Kind', body: 'SCOPED-BODY text' })
scopedStore.setSelection('session-scoped', scopedRec.id)

const scopedText = scopedSections[0].text({})
assert.ok(scopedText.includes('# Active Agent Identity — Scoped Kind'), 'scoped section renders the identity')
assert.ok(scopedText.includes('SCOPED-BODY text'))
assert.equal(scopedSections[0].text({ agent: { id: 'somebody-else' } }), scopedText, 'scoped text ignores assembly context')
assert.ok(
  section.text({ agent: { id: 'session-scoped' } }).includes('SCOPED-BODY text'),
  'global section agrees when it can see the agent',
)

fs.rmSync(storeDir, { recursive: true, force: true })
console.log(`host harness: section order -900, 6 routes, ${tools.size} tools, per-session injection verified`)
