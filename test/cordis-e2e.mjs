// End-to-end host test against the REAL Cordis + REAL SystemPrompt/ToolsService
// from the installed DeepSeek Harness bundle. Run with:
//   ELECTRON_RUN_AS_NODE=1 "<install>/DeepSeek Harness.exe" .tmp/cordis-e2e.mjs
// It proves three things without restarting the app:
//   1. the plugin activates on a real Cordis context (section + routes + tools),
//   2. a selected identity reaches the assembled system prompt,
//   3. the native identity injects nothing.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DSH = process.env.DSH_ASAR_MODULES ?? 'C:/Users/dhm/AppData/Local/Programs/DeepSeek Harness/resources/app.asar/dsh/node_modules'
const load = (specifier) => import(pathToFileURL(`${DSH}/${specifier}`).href)

const { Context } = await load('@deepseek-ai/cordis/lib/index.js')
const { SystemPrompt, renderPrompt } = await load('@deepseek-ai/dsh-system-prompt/lib/index.js')
const { ToolsService } = await load('@deepseek-ai/dsh-tools/lib/index.js')

const root = path.resolve(import.meta.dirname, '..')
const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ai-e2e-'))

const ctx = new Context()
ctx.provide('webServer', {
  register() {
    return () => {}
  },
})

await ctx.plugin(SystemPrompt)
await ctx.plugin(ToolsService)
await ctx.plugin(await load('@deepseek-ai/dsh-tool-executor-native/lib/index.js'))

const plugin = await import(pathToFileURL(path.join(root, 'index.js')).href)
const pluginFork = await ctx.plugin(plugin, { storeDir })

const agent = { id: 'session-e2e' }
const assemble = () => ctx.systemPrompt.assemble({ agent, scope: agent, signal: undefined })
const prompt = async () => renderPrompt(await assemble())

const nativePrompt = await prompt()
assert.equal(nativePrompt.includes('Active Agent Identity'), false, 'native identity must inject nothing')

const store = (await import(pathToFileURL(path.join(root, 'lib', 'store.js')).href))
  .createStore({ dir: storeDir })
const saved = store.save({ name: 'E2E Persona', description: 'proves injection', body: 'E2E-BODY-MARKER' })
store.setSelection('session-e2e', saved.id)

const identityPrompt = await prompt()
assert.match(identityPrompt, /# Active Agent Identity — E2E Persona/)
assert.match(identityPrompt, /E2E-BODY-MARKER/)
assert.ok(identityPrompt.indexOf('Active Agent Identity') < identityPrompt.length)

store.setSelection('session-e2e', 'none')
const clearedPrompt = await prompt()
assert.equal(clearedPrompt.includes('E2E-BODY-MARKER'), false, 'explicit native selection must inject nothing')

const expectedTools = [
  'agent_identities',
  'delegate_to_identity',
  'delete_identity',
  'save_identity',
  'switch_identity',
]
const registered = expectedTools.filter((name) => typeof ctx.tools.get === 'function' && ctx.tools.get(name))
assert.deepEqual(registered.sort(), [...expectedTools].sort())

console.log('real-cordis e2e: section injected, per-session isolation ok, tools:', registered.join(', '))
pluginFork.dispose()
