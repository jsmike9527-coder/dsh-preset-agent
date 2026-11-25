/**
 * dsh-agent-identity — named agent identities for DeepSeek Harness.
 *
 * Host half: owns the identity store, injects the selected identity as a
 * system-prompt section (which lands before every project instruction file,
 * because DSH delivers those as a user message), serves the picker/editor API,
 * and exposes the identity tools (list / switch / delegate).
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

import { LAYERS, NONE, createStore, normalizeProjectKey, resolveStoreDir, DEFAULT_MAX_BODY_BYTES } from './lib/store.js'

export const name = 'agent-identity'

export const inject = ['systemPrompt', 'tools', 'webServer']

/** Section order: after HARNESS_IDENTITY (-1000), before every other section. */
export const SECTION_ORDER = -900
export const SECTION_NAME = 'agent-identity:identity'

const MAX_HTTP_BODY = 512 * 1024
const NATIVE_ALIASES = new Set(['none', 'native', 'default', 'off', ''])
const MAX_PROMPT_FOR_LABEL = 60

/** Load Schemastery from the running profile, like a published bundle does. */
function loadSchema() {
  try {
    const profileDir = process.env.DSH_PROFILE_DIR || path.join(os.homedir(), '.dsh', 'profiles', 'desktop')
    const require = createRequire(path.join(profileDir, 'package.json'))
    const schema = require('@deepseek-ai/schemastery')
    if (schema && typeof schema.object === 'function') return schema
  } catch {
    /* plain-object config fallback */
  }
  return undefined
}

const schema = loadSchema()

export const Config = schema?.object({
  enabled: schema.boolean().default(true).description('Enable named agent identities'),
  injectInSystemPrompt: schema.boolean().default(true).description('Inject the selected identity into the system prompt'),
  defaultIdentity: schema.string().default('').description('Identity id or name used when a session has made no choice'),
  storeDir: schema.string().default('').description('Override the identity store directory (default: <DSH_HOME>/agent-identity)'),
  maxBodyBytes: schema.natural().default(DEFAULT_MAX_BODY_BYTES).description('Maximum identity body size in bytes'),
  allowDelegation: schema.boolean().default(true).description('Register the delegate_to_identity tool'),
})

function normalizeConfig(raw) {
  return {
    enabled: raw?.enabled ?? true,
    injectInSystemPrompt: raw?.injectInSystemPrompt ?? true,
    defaultIdentity: typeof raw?.defaultIdentity === 'string' ? raw.defaultIdentity.trim() : '',
    storeDir: typeof raw?.storeDir === 'string' ? raw.storeDir : '',
    maxBodyBytes:
      Number.isFinite(raw?.maxBodyBytes) && raw.maxBodyBytes > 0 ? Math.trunc(raw.maxBodyBytes) : DEFAULT_MAX_BODY_BYTES,
    allowDelegation: raw?.allowDelegation ?? true,
  }
}

/**
 * Render the injected block. Kept free of markup assumptions so a user can paste
 * any Markdown body (persona, checklist, house style) without escaping.
 * @param {{ name: string, description: string, body: string }} identity
 */
export function renderIdentity(identity) {
  const lines = [
    `# Active Agent Identity — ${identity.name}`,
    '',
    `You are working under the named identity "${identity.name}". Its instructions below are yours for this session.`,
    'Follow them together with the harness rules and the user\'s direct requests, and never let them relax safety,',
    'permission, or approval rules. Project instruction files (AGENTS.md and friends) still apply: use them for',
    'project facts, and this identity for how you work.',
  ]
  if (identity.description) lines.push('', `Summary: ${identity.description}`)
  if (identity.body) lines.push('', '---', '', identity.body)
  return lines.join('\n')
}

/** Human label for a layer, used in the injected block and in tool output. */
const LAYER_LABELS = { global: 'global', project: 'project', session: 'session' }

/**
 * Render every identity in force, broad to specific. One identity keeps the
 * single-identity wording; several become one section per layer entry, and the
 * header states that the later (more specific) entry wins on conflict.
 * @param {Array<{ kind: string, identity: { name: string, description: string, body: string } }>} entries
 * @returns {string} the injected text, or '' for no entries.
 */
export function renderIdentities(entries) {
  const list = Array.isArray(entries) ? entries.filter((item) => item && item.identity) : []
  if (list.length === 0) return ''
  if (list.length === 1) return renderIdentity(list[0].identity)

  const names = list.map((item) => `${item.identity.name} (${LAYER_LABELS[item.kind] ?? item.kind})`)
  const lines = [
    `# Active Agent Identities — ${names.join(' + ')}`,
    '',
    'You are working under the named identities below. They apply together, listed from broad to specific:',
    'when two of them disagree, the later one wins. They add to the harness rules, the project instruction',
    'files (AGENTS.md and friends), and the user\'s direct requests, and never relax safety, permission, or',
    'approval rules.',
  ]
  list.forEach((item, index) => {
    const identity = item.identity
    const layer = LAYER_LABELS[item.kind] ?? item.kind
    lines.push('', `## ${index + 1}. ${identity.name} — ${layer}`)
    if (identity.description) lines.push('', `Summary: ${identity.description}`)
    lines.push('')
    lines.push(identity.body ? identity.body : '_No instructions in this identity._')
  })
  return lines.join('\n')
}

async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_HTTP_BODY) {
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

const textBlocks = (value) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }]

/** Append one line to <store dir>/boot.log; never throws. */
function bootLog(line) {
  try {
    const dir = resolveStoreDir()
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'boot.log'), new Date().toISOString() + ' ' + line + '\n')
  } catch {
    /* diagnostics never break loading */
  }
}

bootLog('module-load')

export function apply(ctx, rawConfig) {
  bootLog('apply-enter')
  try {
    applyInner(ctx, rawConfig)
    bootLog('apply-ok')
  } catch (error) {
    bootLog('apply-error ' + (error && (error.stack || error.message || error)))
    throw error
  }
}

function applyInner(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)
  if (!config.enabled) return

  const store = createStore({ dir: resolveStoreDir(config.storeDir), maxBodyBytes: config.maxBodyBytes })

  const sessionOf = (exec) => exec?.agent?.session?.id ?? exec?.agent?.id ?? ''

  /** Working directory per session, remembered so HTTP callers can edit the project layer. */
  const projectKeys = new Map()

  /** @returns {string} the project-layer key for this agent, or ''. */
  function projectKeyFor(agent) {
    if (!agent) return ''
    try {
      const workingDirectory = ctx.get('workingDirectory')
      if (workingDirectory && typeof workingDirectory.get === 'function') {
        const session = agent.session
        if (session) {
          const cwd = workingDirectory.get(session)
          if (typeof cwd === 'string' && cwd) return normalizeProjectKey(cwd)
        }
      }
    } catch {
      /* an absent or failing working directory just means "no project layer" */
    }
    return ''
  }

  function rememberProject(sessionId, agent) {
    if (!sessionId) return ''
    const key = projectKeyFor(agent)
    if (key) projectKeys.set(sessionId, key)
    return key
  }

  /**
   * Every identity in force for one session, broad to specific.
   * @param {{ sessionId?: string, agent?: object, projectKey?: string }} scope
   */
  function resolutionFor(scope = {}) {
    const sessionId = typeof scope.sessionId === 'string' ? scope.sessionId.trim() : ''
    const projectKey =
      (typeof scope.projectKey === 'string' && scope.projectKey ? normalizeProjectKey(scope.projectKey) : '')
      || projectKeys.get(sessionId)
      || projectKeyFor(scope.agent)
    return store.effectiveFor({ sessionId, projectKey, defaultIdentity: config.defaultIdentity })
  }

  /** @returns {string} the text injected for one session. */
  function injectionText(scope = {}) {
    if (!config.injectInSystemPrompt) return ''
    const resolution = resolutionFor(scope)
    return renderIdentities(resolution.entries)
  }

  /**
   * Resolve identity names/ids to canonical ids. `none` maps to the session
   * mute sentinel and disappears in the other layers.
   */
  function resolveIdentityIds(values, layer = 'session') {
    const list = Array.isArray(values) ? values : [values]
    return list
      .map((raw) => {
        const value = typeof raw === 'string' ? raw.trim() : ''
        if (!value) return ''
        if (NATIVE_ALIASES.has(value.toLowerCase())) return layer === 'session' ? NONE : ''
        const identity = store.get(value)
        if (!identity) {
          const names = store.list().map((item) => item.name).join(', ') || '(none defined)'
          throw new Error(`unknown identity "${value}". Available: ${names}`)
        }
        return identity.id
      })
      .filter(Boolean)
  }

  function stateFor(sessionId, scope = {}) {
    const key = typeof sessionId === 'string' ? sessionId.trim() : ''
    const projectKey =
      (typeof scope.projectKey === 'string' && scope.projectKey ? normalizeProjectKey(scope.projectKey) : '')
      || projectKeys.get(key)
      || projectKeyFor(scope.agent)
    const resolution = store.effectiveFor({ sessionId: key, projectKey, defaultIdentity: config.defaultIdentity })
    const layers = {
      global: store.layerIds('global'),
      project: projectKey ? store.layerIds('project', { projectKey }) : [],
      session: store.layerIds('session', { sessionId: key }).filter((id) => id !== NONE),
    }
    return {
      identities: store.list(),
      layers,
      projectKey,
      muted: resolution.muted,
      active: resolution.entries.map((entry) => ({ id: entry.identity.id, name: entry.identity.name, layer: entry.kind })),
      missing: resolution.missing,
      defaultIdentity: config.defaultIdentity,
      storeDir: store.dir,
    }
  }

  // Temporary diagnostic: when <store dir>/debug.flag exists, record what the
  // assembly context really carries so section scoping can be verified live.
  function debugAssembly(context, source) {
    try {
      const flag = path.join(store.dir, 'debug.flag')
      if (!fs.existsSync(flag)) return
      const agent = context?.agent
      const record = {
        at: new Date().toISOString(),
        source,
        contextKeys: context && typeof context === 'object' ? Object.keys(context) : null,
        agentKeys: agent && typeof agent === 'object' ? Object.keys(agent) : null,
        agentId: agent?.id === undefined ? null : String(agent.id),
        agentSessionId: agent?.session?.id === undefined ? null : String(agent.session.id),
        scope: context?.scope === undefined ? null : String(context.scope),
        signal: context?.signal ? String(context.signal) : null,
      }
      fs.appendFileSync(path.join(store.dir, 'debug.log'), JSON.stringify(record) + '\n')
    } catch {
      /* diagnostics never break assembly */
    }
  }

  // ---- system prompt -----------------------------------------------------
  ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: SECTION_ORDER,
    interpolate: false,
    text: (context) => {
      debugAssembly(context, 'global')
      if (!config.injectInSystemPrompt) return ''
      const agent = context?.agent
      const sessionId = agent?.session?.id ?? agent?.id
      return injectionText({ sessionId: sessionId === undefined ? '' : String(sessionId), agent })
    },
  })

  // Per-agent registration: the text closes over the session id, so it does
  // not depend on what the assembly context happens to carry. The scoped
  // section shadows the global one for that agent (same name, same layer rules).
  ctx.on('agent/created', ({ agent } = {}) => {
    const sessionId = agent?.id === undefined ? '' : String(agent.id)
    if (!sessionId) return
    rememberProject(sessionId, agent)
    const scopedPrompt = agent?.ctx?.systemPrompt
    if (!scopedPrompt || typeof scopedPrompt.section !== 'function') return
    const dispose = scopedPrompt.section({
      name: SECTION_NAME,
      order: SECTION_ORDER,
      interpolate: false,
      text: () => injectionText({ sessionId, agent }),
    })
    if (typeof dispose === 'function' && typeof agent.ctx.effect === 'function') {
      agent.ctx.effect(() => dispose)
    }
  })

  // ---- HTTP API ----------------------------------------------------------
  const auth = (req, res) => {
    const connection = ctx.get('connection')
    if (!connection || typeof connection.requestRejection !== 'function') return true
    const rejection = connection.requestRejection(req)
    if (rejection === undefined) return true
    sendJson(res, rejection, { ok: false, error: rejection === 401 ? 'Unauthorized' : 'Forbidden' })
    return false
  }

  const fail = (err) => {
    const message = String(err?.message ?? err)
    const status = /not found|unknown identity/i.test(message)
      ? 404
      : /required|longer than|larger than|already|must be|cannot/i.test(message)
        ? 400
        : 500
    return { status, message }
  }

  const jsonRoute = (fn) => async (req, res) => {
    if (!auth(req, res)) return
    if (req.method === 'GET') {
      const url = new URL(String(req.url), 'http://localhost')
      try {
        return sendJson(res, 200, { ok: true, ...(await fn({ query: url.searchParams, body: {} })) })
      } catch (err) {
        const { status, message } = fail(err)
        return sendJson(res, status, { ok: false, error: message })
      }
    }
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    try {
      const raw = await readBoundedBody(req)
      if (raw === null) return sendJson(res, 413, { ok: false, error: 'request body too large' })
      const body = raw ? JSON.parse(raw) : {}
      if (body === null || typeof body !== 'object') throw new Error('body must be a JSON object')
      sendJson(res, 200, { ok: true, ...(await fn({ query: new URLSearchParams(), body })) })
    } catch (err) {
      const { status, message } = fail(err)
      sendJson(res, status, { ok: false, error: message })
    }
  }

  const routes = [
    [
      '/api/agent-identity/state',
      async ({ query }) =>
        stateFor(String(query.get('sessionId') ?? ''), { projectKey: String(query.get('project') ?? '') }),
    ],
    [
      '/api/agent-identity/get',
      async ({ query, body }) => {
        const identity = store.get(String(query.get('id') ?? body.id ?? ''))
        if (!identity) throw new Error('identity not found')
        return { identity }
      },
    ],
    [
      '/api/agent-identity/preview',
      async ({ query, body }) =>
        ({
          text: injectionText({
            sessionId: String(query.get('sessionId') ?? body.sessionId ?? ''),
            projectKey: String(query.get('project') ?? body.projectKey ?? ''),
          }),
        }),
    ],
    [
      '/api/agent-identity/select',
      async ({ body }) => {
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
        const projectKey = typeof body.projectKey === 'string' ? body.projectKey.trim() : ''
        const scope =
          body.scope === 'global' || body.scope === 'project' || body.scope === 'session' ? body.scope : ''
        const ids = body.ids ?? body.identities ?? body.identityIds ?? body.identityId ?? body.identity
        if (scope) {
          if (scope === 'session' && !sessionId) throw new Error('sessionId is required')
          if (scope === 'project' && !projectKey) throw new Error('projectKey is required')
          store.setLayerIds(scope, { sessionId, projectKey }, resolveIdentityIds(ids, scope))
        } else {
          if (!sessionId) throw new Error('sessionId is required')
          store.setSelection(sessionId, ids ?? null)
        }
        return stateFor(sessionId, { projectKey })
      },
    ],
    [
      '/api/agent-identity/save',
      async ({ body }) => {
        const identity = store.save(body.identity ?? body)
        return { identity, identities: store.list() }
      },
    ],
    [
      '/api/agent-identity/delete',
      async ({ body }) => {
        const removed = store.remove(body.id ?? body.identityId ?? body.name ?? '')
        if (!removed) throw new Error('identity not found')
        return { identities: store.list() }
      },
    ],
  ]

  ctx.effect(() => {
    const disposers = routes.map(([routePath, fn]) =>
      ctx.webServer.register({ kind: 'exact', path: routePath, handler: jsonRoute(fn) }),
    )
    return () => {
      for (const dispose of disposers) dispose?.()
    }
  })

  // ---- tools -------------------------------------------------------------
  const activeSchema = {
    type: 'array',
    description: 'Identities in force, broad to specific',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        layer: { type: 'string', description: 'global, project, or session' },
      },
      required: ['name', 'layer'],
      additionalProperties: false,
    },
  }

  ctx.tools.register({
    name: 'agent_identities',
    description:
      'List the named agent identities available here, plus which identities the current session runs under, layer by '
      + 'layer (global, project, session). Identities are reusable system-prompt personas managed by the '
      + 'dsh-agent-identity plugin.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: {
        type: 'object',
        properties: {
          active: activeSchema,
          muted: { type: 'boolean', description: 'True when the session opted out of every identity' },
          layers: {
            type: 'object',
            properties: {
              global: { type: 'array', items: { type: 'string' } },
              project: { type: 'array', items: { type: 'string' } },
              session: { type: 'array', items: { type: 'string' } },
            },
            required: ['global', 'project', 'session'],
            additionalProperties: false,
          },
          identities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                bodyBytes: { type: 'number' },
              },
            },
          },
        },
        required: ['active', 'muted', 'layers', 'identities'],
      },
      render: (_args, value) => {
        const rows = (value?.identities ?? []).map(
          (item) => `- ${item.name} (${item.id})${item.description ? ` — ${item.description}` : ''}`,
        )
        const activeRows = (value?.active ?? []).map((item) => `- ${item.name} [${item.layer}]`)
        const head = value?.muted
          ? 'Active identities: muted for this session (nothing injected)'
          : activeRows.length
            ? `Active identities (broad → specific):\n${activeRows.join('\n')}`
            : 'Active identities: native (nothing injected)'
        return textBlocks([head, rows.length ? `Available identities:\n${rows.join('\n')}` : 'No identities defined yet.'].join('\n\n'))
      },
    },
    execute: async (_args, exec) => {
      const state = stateFor(sessionOf(exec), { agent: exec.agent })
      return {
        active: state.active.map(({ name, layer }) => ({ name, layer })),
        muted: state.muted,
        layers: state.layers,
        identities: state.identities.map(({ id, name, description, bodyBytes }) => ({
          id,
          name,
          description: description ?? '',
          bodyBytes: bodyBytes ?? 0,
        })),
      }
    },
  })

  ctx.tools.register({
    name: 'switch_identity',
    description:
      'Change which named identities apply to the current session. Pass one "identity" name/id, or "identities" to '
      + 'stack several (broad to specific). Pass "none" to mute every identity for this session. Use "layer" to edit '
      + 'the standing global or project layer instead of this session. The change applies from the next step of this '
      + 'turn on.',
    parameters: {
      type: 'object',
      properties: {
        identity: { type: 'string', description: 'Identity name or id, or "none" to mute every identity' },
        identities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Several identities to stack, broad to specific',
        },
        layer: {
          type: 'string',
          enum: ['session', 'global', 'project'],
          description: 'Layer to change; defaults to session',
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          active: activeSchema,
          muted: { type: 'boolean' },
        },
        required: ['active', 'muted'],
      },
      render: (_args, value) => {
        if (value?.muted) return textBlocks('Active identities: muted for this session (nothing injected)')
        const rows = (value?.active ?? []).map((item) => `- ${item.name} [${item.layer}]`)
        return textBlocks(rows.length ? `Active identities (broad → specific):\n${rows.join('\n')}` : 'Active identities: native (nothing injected)')
      },
    },
    execute: async (args, exec) => {
      const sessionId = sessionOf(exec)
      if (!sessionId) throw new Error('cannot resolve the current session')
      const layer = args?.layer === 'global' || args?.layer === 'project' ? args.layer : 'session'
      const requested = Array.isArray(args?.identities) ? args.identities : undefined
      const single = typeof args?.identity === 'string' ? args.identity.trim() : ''
      const ids = requested
        ? resolveIdentityIds(requested, layer)
        : single
          ? resolveIdentityIds(single, layer)
          : (() => {
              throw new Error('identity or identities is required')
            })()
      const projectKey = projectKeys.get(sessionId) || projectKeyFor(exec.agent)
      if (layer === 'project' && !projectKey) throw new Error('cannot resolve the project directory for this session')
      store.setLayerIds(layer, { sessionId, projectKey }, ids)
      const state = stateFor(sessionId, { agent: exec.agent })
      return { active: state.active.map(({ name, layer: kind }) => ({ name, layer: kind })), muted: state.muted }
    },
  })

  ctx.tools.register({
    name: 'save_identity',
    description:
      'Create a named agent identity, or update an existing one. An identity is a reusable persona whose body is '
      + 'injected into the system prompt ahead of the project instructions. Pass "identity" (name or id) to update; '
      + 'omit it to create a new one.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Identity name, unique and case-insensitive (max 64 characters)' },
        body: { type: 'string', description: 'Markdown instructions injected verbatim while this identity is active' },
        description: {
          type: 'string',
          description: 'One-line summary for the pickers and settings list (max 280 characters)',
        },
        identity: { type: 'string', description: 'Existing identity name or id to update instead of creating one' },
      },
      required: ['name', 'body'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          bodyBytes: { type: 'number' },
          created: { type: 'boolean' },
        },
      },
      render: (_args, value) =>
        textBlocks(
          `${value?.created ? 'Created' : 'Updated'} identity "${value?.name}" (${value?.id}, ${value?.bodyBytes} bytes of instructions).`,
        ),
    },
    execute: async (args) => {
      const name = typeof args?.name === 'string' ? args.name : ''
      const body = typeof args?.body === 'string' ? args.body : ''
      if (!name.trim()) throw new Error('name is required')
      if (!body.trim()) throw new Error('body is required')
      const requested = typeof args?.identity === 'string' ? args.identity.trim() : ''
      const target = requested ? store.get(requested) : undefined
      if (requested && !target) {
        const names = store.list().map((item) => item.name).join(', ') || '(none defined)'
        throw new Error(`unknown identity "${requested}". Available: ${names}`)
      }
      const saved = store.save({
        id: target?.id,
        name,
        description: typeof args?.description === 'string' ? args.description : target?.description ?? '',
        body,
      })
      return {
        id: saved.id,
        name: saved.name,
        description: saved.description ?? '',
        bodyBytes: Buffer.byteLength(saved.body ?? '', 'utf8'),
        created: !target,
      }
    },
  })

  ctx.tools.register({
    name: 'delete_identity',
    description:
      'Delete a named agent identity. Sessions that selected it fall back to the native identity (or to the '
      + 'configured default identity).',
    parameters: {
      type: 'object',
      properties: {
        identity: { type: 'string', description: 'Identity name or id to delete' },
      },
      required: ['identity'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          deleted: { type: 'boolean' },
          name: { type: 'string' },
        },
      },
      render: (_args, value) =>
        textBlocks(value?.deleted ? `Deleted identity "${value.name}".` : 'No identity was deleted.'),
    },
    execute: async (args) => {
      const raw = typeof args?.identity === 'string' ? args.identity.trim() : ''
      if (!raw) throw new Error('identity is required')
      const target = store.get(raw)
      if (!target) {
        const names = store.list().map((item) => item.name).join(', ') || '(none defined)'
        throw new Error(`unknown identity "${raw}". Available: ${names}`)
      }
      store.remove(target.id)
      return { deleted: true, name: target.name }
    },
  })

  if (config.allowDelegation) {
    ctx.tools.register({
      name: 'delegate_to_identity',
      description:
        'Delegate a task to a subagent that runs under one of the named agent identities. Prefer this over the plain '
        + 'subagent tool when the delegated work needs a distinct persona, house style, or role.',
      parameters: {
        type: 'object',
        properties: {
          identity: { type: 'string', description: 'Identity name or id the child should run under' },
          prompt: { type: 'string', description: 'The complete, self-contained task for the child' },
          description: { type: 'string', description: 'Short (3-5 word) display label for the delegation' },
          name: {
            type: 'string',
            description: 'Optional child name: lower-case letters, digits, hyphens; at most 32 characters',
          },
        },
        required: ['identity', 'prompt'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            identity: { type: 'string' },
            status: { type: 'string' },
            result: { type: 'object', additionalProperties: true },
          },
        },
        render: (args, value) =>
          textBlocks(
            `[${value?.identity ?? args?.identity} subagent · ${value?.status ?? 'done'}]\n${
              typeof value?.result === 'string' ? value.result : JSON.stringify(value?.result ?? null, null, 2)
            }`,
          ),
      },
      execute: async (args, exec) => {
        const identity = store.get(args?.identity)
        if (!identity) {
          const names = store.list().map((item) => item.name).join(', ') || '(none defined)'
          throw new Error(`unknown identity "${args?.identity}". Available: ${names}`)
        }
        const task = typeof args?.prompt === 'string' ? args.prompt.trim() : ''
        if (!task) throw new Error('prompt is required')
        const prompt = [`${renderIdentity(identity)}`, '', '# Delegated task', '', task].join('\n')
        const label = (
          typeof args?.description === 'string' && args.description.trim()
            ? args.description.trim()
            : `${identity.name}: ${task.slice(0, MAX_PROMPT_FOR_LABEL)}`
        ).slice(0, 120)
        const childName = typeof args?.name === 'string' ? args.name.trim() : ''

        const subagentTool = ctx.tools.get('subagent')
        if (subagentTool && typeof subagentTool.execute === 'function') {
          const payload = { prompt, description: label }
          if (childName && subagentTool.parameters?.properties?.name) payload.name = childName
          const result = await subagentTool.execute(payload, exec)
          return { identity: identity.name, status: 'delegated', result }
        }

        const subagents = ctx.get('subagents')
        if (!subagents || typeof subagents.startActivation !== 'function') {
          throw new Error('no subagent runtime available: neither the subagent tool nor the subagents service is present')
        }
        const started = await subagents.startActivation({
          provider: 'spawn',
          label,
          ...(childName ? { name: childName } : {}),
          prompt: [{ type: 'text', text: prompt }],
          parent: exec?.agent,
          signal: exec?.signal,
          delivery: 'parent',
        })
        return { identity: identity.name, status: 'delegated', result: { kind: 'activation', name: started?.name } }
      },
    })
  }
}
