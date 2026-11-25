import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const { createStore, NONE, LAYERS, normalizeProjectKey } = await import(
  pathToFileURL(path.join(root, 'lib/store.js')).href
)

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ai-'))
const store = createStore({ dir, maxBodyBytes: 1024 })

// empty store
assert.deepEqual(store.list(), [])
assert.equal(store.get('nope'), undefined)
assert.equal(store.selectionOf('s1'), undefined)
assert.deepEqual(LAYERS, ['global', 'project', 'session'])

// create
const created = store.save({ name: 'Rust reviewer', description: 'strict', body: '# Role\nreview carefully' })
assert.match(created.id, /^ai-/)
assert.equal(store.list().length, 1)
assert.equal(store.list()[0].bodyBytes, Buffer.byteLength('# Role\nreview carefully'))

// lookup by id and case-insensitive name
assert.equal(store.get(created.id).name, 'Rust reviewer')
assert.equal(store.get('rust REVIEWER').id, created.id)

// update keeps createdAt
const updated = store.save({ id: created.id, name: 'Rust reviewer', description: 'stricter', body: 'v2' })
assert.equal(updated.createdAt, created.createdAt)
assert.equal(store.get(created.id).description, 'stricter')
assert.equal(store.list().length, 1)

// duplicate name rejected
assert.throws(() => store.save({ name: 'rust reviewer' }), /already uses the name/)
// blank name rejected
assert.throws(() => store.save({ name: '   ' }), /name is required/)
// oversized body rejected
assert.throws(() => store.save({ name: 'big', body: 'x'.repeat(2048) }), /larger than|longer than/)

// legacy single selection still maps onto the session layer
assert.equal(store.setSelection('s1', created.id), created.id)
assert.equal(store.selectionOf('s1'), created.id)
assert.equal(store.setSelection('s2', 'none'), NONE)
assert.equal(store.selectionOf('s2'), NONE)
assert.equal(store.layerIds('session', { sessionId: 's2' })[0], NONE)
assert.throws(() => store.setSelection('s3', 'ghost'), /unknown identity/)
assert.equal(store.setSelection('s1', null), undefined)
assert.equal(store.selectionOf('s1'), undefined)

// layered multi-selection, broad to specific
const alpha = store.save({ name: 'Alpha', body: 'alpha body' })
const beta = store.save({ name: 'Beta', body: 'beta body' })
const gamma = store.save({ name: 'Gamma', body: 'gamma body' })
const projectKey = normalizeProjectKey('G:/ProJectCode/Tools/demo')

assert.deepEqual(store.setLayerIds('global', {}, [alpha.id]), [alpha.id])
assert.deepEqual(store.setLayerIds('project', { projectKey }, [beta.id]), [beta.id])
assert.deepEqual(store.setLayerIds('session', { sessionId: 's4' }, [gamma.id, alpha.id]), [gamma.id, alpha.id])
assert.deepEqual(store.layerIds('global'), [alpha.id])
assert.deepEqual(store.layerIds('project', { projectKey }), [beta.id])
assert.deepEqual(store.layerIds('session', { sessionId: 's4' }), [gamma.id, alpha.id])

const effective = store.effectiveFor({ sessionId: 's4', projectKey })
assert.deepEqual(
  effective.entries.map((entry) => `${entry.kind}:${entry.identity.name}`),
  ['global:Alpha', 'project:Beta', 'session:Gamma', 'session:Alpha'],
)
assert.equal(effective.muted, false)
assert.deepEqual(effective.missing, [])

// project key is normalised: separators and (on Windows) case do not matter
assert.deepEqual(store.layerIds('project', { projectKey: '' }), [])
assert.deepEqual(store.layerIds('project', { projectKey: 'G:/ProJectCode/Tools/demo/' }), [beta.id])

// a session layer of "none" mutes every layer, and the mute never leaks out
store.setLayerIds('session', { sessionId: 's5' }, [NONE])
assert.equal(store.effectiveFor({ sessionId: 's5', projectKey }).muted, true)
assert.deepEqual(store.effectiveFor({ sessionId: 's5', projectKey }).entries, [])
assert.equal(store.mutedFor('s5'), true)
assert.equal(store.mutedFor('s4'), false)
assert.deepEqual(store.effectiveFor({ sessionId: 's4', projectKey }).entries.length, 4)

// the configured default only fills an empty global layer
store.setLayerIds('global', {}, [])
assert.deepEqual(
  store.effectiveFor({ sessionId: 's6', defaultIdentity: beta.id }).entries.map((entry) => entry.identity.name),
  ['Beta'],
)
store.setLayerIds('global', {}, [alpha.id])
assert.deepEqual(
  store.effectiveFor({ sessionId: 's4', projectKey, defaultIdentity: beta.id }).entries.map((entry) => entry.identity.name),
  ['Alpha', 'Beta', 'Gamma', 'Alpha'],
)

// stale ids (an identity deleted behind the plugin's back) are reported, not silently dropped
const handEdited = JSON.parse(fs.readFileSync(path.join(dir, 'selections.json'), 'utf8'))
handEdited.global = [alpha.id, 'ai-gone']
fs.writeFileSync(path.join(dir, 'selections.json'), JSON.stringify(handEdited))
assert.deepEqual(store.effectiveFor({ sessionId: 's7' }).missing, [{ kind: 'global', id: 'ai-gone' }])
store.setLayerIds('global', {}, [alpha.id])

// deleting an identity purges it from every layer
assert.equal(store.remove(alpha.id), true)
assert.deepEqual(store.layerIds('global'), [])
assert.deepEqual(store.layerIds('session', { sessionId: 's4' }), [gamma.id])
assert.deepEqual(store.layerIds('project', { projectKey }), [beta.id])
assert.equal(store.remove('Gamma'), true)
assert.deepEqual(
  store.list().map((item) => item.name),
  ['Beta', 'Rust reviewer'],
)

// persistence survives a reopen, with the layered shape on disk
const reopened = createStore({ dir })
assert.equal(reopened.list().length, 2)
assert.equal(reopened.selectionOf('s2'), NONE)
assert.deepEqual(reopened.layerIds('project', { projectKey }), [beta.id])

const identities = JSON.parse(fs.readFileSync(path.join(dir, 'identities.json'), 'utf8'))
const selections = JSON.parse(fs.readFileSync(path.join(dir, 'selections.json'), 'utf8'))
assert.equal(identities.version, 1)
assert.ok(Array.isArray(identities.identities))
assert.equal(selections.version, 2)
assert.deepEqual(selections.sessions.s2, [NONE])
assert.deepEqual(selections.projects[projectKey], [beta.id])
assert.ok(Array.isArray(selections.global))

// v1 selections files are migrated in place
const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ai-v1-'))
const legacyIdentity = createStore({ dir: legacyDir }).save({ name: 'Legacy', body: 'old body' })
fs.writeFileSync(
  path.join(legacyDir, 'selections.json'),
  JSON.stringify({ version: 1, selections: { 'session-old': legacyIdentity.id, 'session-none': 'none' } }),
)
const migrated = createStore({ dir: legacyDir })
assert.deepEqual(migrated.layerIds('session', { sessionId: 'session-old' }), [legacyIdentity.id])
assert.equal(migrated.mutedFor('session-none'), true)
const migratedDisk = JSON.parse(fs.readFileSync(path.join(legacyDir, 'selections.json'), 'utf8'))
assert.equal(migratedDisk.version, 2)
assert.deepEqual(migratedDisk.sessions['session-old'], [legacyIdentity.id])

fs.rmSync(dir, { recursive: true, force: true })
fs.rmSync(legacyDir, { recursive: true, force: true })
console.log('store tests: layered selections, migration and legacy API verified')
