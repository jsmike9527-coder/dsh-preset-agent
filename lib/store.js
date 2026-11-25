/**
 * Identity store for dsh-agent-identity.
 *
 * Pure filesystem code — no Cordis, no DSH services — so it can be exercised
 * from plain Node in tests. Everything is synchronous and write-behind-free:
 * a save is on disk before the call returns, which keeps the plugin readable
 * from a single process without a lock.
 *
 * Selections are layered, broad to specific:
 *
 *   global  — the user's own standing preference, every session
 *   project — everything run from one working directory
 *   session — this conversation only, and it may stack several identities
 *
 * Each layer holds an ordered list of identity ids. Later layers are more
 * specific, so `effectiveFor()` reports them in that order and the caller
 * renders them in the order given.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Sentinel stored at the session layer for "use no identity at all". */
export const NONE = 'none'

/** Layer names, broad to specific. */
export const LAYERS = ['global', 'project', 'session']

/** Upper bound for a human-readable identity name. */
export const MAX_NAME = 64
/** Upper bound for the one-line summary. */
export const MAX_DESCRIPTION = 280
/** Default cap for the identity body injected into the system prompt. */
export const DEFAULT_MAX_BODY_BYTES = 256 * 1024

/**
 * Resolve the directory that holds identities and selections.
 * @param {string | undefined} configured - explicit directory from the plugin config.
 * @returns {string} absolute directory path.
 */
export function resolveStoreDir(configured) {
  const explicit = typeof configured === 'string' ? configured.trim() : ''
  if (explicit) return path.resolve(explicit)
  const home = (process.env.DSH_HOME ?? '').trim() || path.join(os.homedir(), '.dsh')
  return path.join(home, 'agent-identity')
}

/**
 * Fold a working directory into the key used by the project layer, so the same
 * project matches regardless of drive-letter case or separator style.
 * @param {string | undefined} value
 * @returns {string} normalised key, or '' when unknown.
 */
export function normalizeProjectKey(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  let resolved = text
  try {
    resolved = path.resolve(text)
  } catch {
    resolved = text
  }
  const slashed = resolved.replace(/\\/g, '/').replace(/\/+$/, '')
  return process.platform === 'win32' ? slashed.toLowerCase() : slashed
}

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  fs.renameSync(tmp, file)
}

function newId() {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function byteLength(text) {
  return Buffer.byteLength(text, 'utf8')
}

function normalizeText(value, field, max) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error(`${field} must be a string`)
  const text = value.replace(/\r\n/g, '\n').trim()
  if (text.length > max) throw new Error(`${field} is longer than ${max} characters`)
  return text
}

/**
 * Coerce one layer value into a deduplicated, order-preserving list of ids.
 * Accepts an array, a comma separated string, a bare id, or the mute sentinel.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeIds(value) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const out = []
  for (const item of raw) {
    const id = typeof item === 'string' ? item.trim() : ''
    if (!id) continue
    const normalized = id.toLowerCase() === NONE ? NONE : id
    if (!out.includes(normalized)) out.push(normalized)
  }
  return out
}

function emptySelections() {
  return { global: [], projects: {}, sessions: {} }
}

/** Identity summary shared with pickers: no body. */
function summarize(record) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    bodyBytes: byteLength(record.body ?? ''),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function byName(a, b) {
  return a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' })
}

/**
 * Open the store in a directory (created on first write).
 * @param {{ dir: string, maxBodyBytes?: number }} options
 */
export function createStore(options) {
  const dir = path.resolve(options.dir)
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  const identitiesFile = path.join(dir, 'identities.json')
  const selectionsFile = path.join(dir, 'selections.json')

  const readIdentities = () => {
    const data = readJson(identitiesFile, { version: 1, identities: [] })
    const list = Array.isArray(data.identities) ? data.identities : []
    return list.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
  }

  const writeIdentities = (identities) => {
    writeJsonAtomic(identitiesFile, { version: 1, identities })
  }

  /**
   * Read the layered selections, upgrading the v1 single-selection map in
   * place so an older profile keeps working.
   * @returns {{ global: string[], projects: Record<string, string[]>, sessions: Record<string, string[]> }}
   */
  const readSelections = () => {
    const data = readJson(selectionsFile, null)
    const state = emptySelections()
    if (!data) return state
    let migrated = false

    if (data.selections !== null && typeof data.selections === 'object' && !Array.isArray(data.selections)) {
      for (const [sessionId, value] of Object.entries(data.selections)) {
        const key = typeof sessionId === 'string' ? sessionId.trim() : ''
        const ids = normalizeIds([value])
        if (key && ids.length) state.sessions[key] = ids
      }
      migrated = true
    }
    if (Array.isArray(data.global)) state.global = normalizeIds(data.global)
    if (data.projects !== null && typeof data.projects === 'object' && !Array.isArray(data.projects)) {
      for (const [key, value] of Object.entries(data.projects)) {
        const projectKey = normalizeProjectKey(key)
        const ids = normalizeIds(value)
        if (projectKey && ids.length) state.projects[projectKey] = ids
      }
    }
    if (data.sessions !== null && typeof data.sessions === 'object' && !Array.isArray(data.sessions)) {
      for (const [sessionId, value] of Object.entries(data.sessions)) {
        const key = typeof sessionId === 'string' ? sessionId.trim() : ''
        const ids = normalizeIds(value)
        if (key && ids.length) state.sessions[key] = ids
      }
    }
    if (migrated) writeSelections(state)
    return state
  }

  const writeSelections = (state) => {
    writeJsonAtomic(selectionsFile, {
      version: 2,
      global: state.global,
      projects: state.projects,
      sessions: state.sessions,
    })
  }

  const store = {
    dir,

    /** @returns {Array<object>} summaries sorted by name. */
    list() {
      return readIdentities().map(summarize).sort(byName)
    },

    /**
     * Resolve one identity by id (exact) or by name (case-insensitive).
     * @param {string | undefined} idOrName
     * @returns {object | undefined} the full record.
     */
    get(idOrName) {
      const key = typeof idOrName === 'string' ? idOrName.trim() : ''
      if (!key) return undefined
      const all = readIdentities()
      const exact = all.find((item) => item.id === key)
      if (exact) return { ...exact }
      const folded = key.toLowerCase()
      const named = all.find((item) => item.name.toLowerCase() === folded)
      return named ? { ...named } : undefined
    },

    /**
     * Create or update an identity.
     * @param {{ id?: string, name: string, description?: string, body?: string }} input
     * @returns {object} the stored record.
     */
    save(input) {
      const name = normalizeText(input?.name, 'name', MAX_NAME)
      if (!name) throw new Error('name is required')
      const description = normalizeText(input?.description, 'description', MAX_DESCRIPTION)
      const body = normalizeText(input?.body, 'body', Math.max(1, maxBodyBytes))
      if (body && byteLength(body) > maxBodyBytes) {
        throw new Error(`body is larger than ${maxBodyBytes} bytes`)
      }
      const requestedId = normalizeText(input?.id, 'id', 128)
      const all = readIdentities()
      const now = new Date().toISOString()
      const clash = all.find((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== requestedId)

      if (clash) throw new Error(`another identity already uses the name "${clash.name}"`)

      const index = requestedId ? all.findIndex((item) => item.id === requestedId) : -1
      if (index >= 0) {
        const updated = {
          ...all[index],
          name,
          description,
          body,
          updatedAt: now,
        }
        all[index] = updated
        writeIdentities(all)
        return { ...updated }
      }

      const created = {
        id: requestedId || newId(),
        name,
        description,
        body,
        createdAt: now,
        updatedAt: now,
      }
      if (all.some((item) => item.id === created.id)) throw new Error(`identity id ${created.id} already exists`)
      all.push(created)
      writeIdentities(all)
      return { ...created }
    },

    /**
     * Delete one identity and drop it from every layer that referenced it.
     * @param {string} idOrName
     * @returns {boolean} whether a record was removed.
     */
    remove(idOrName) {
      const target = store.get(idOrName)
      if (!target) return false
      writeIdentities(readIdentities().filter((item) => item.id !== target.id))
      const state = readSelections()
      let changed = false
      const keep = (ids) => ids.filter((id) => id !== target.id)
      const nextGlobal = keep(state.global)
      if (nextGlobal.length !== state.global.length) changed = true
      state.global = nextGlobal
      for (const [key, ids] of Object.entries(state.projects)) {
        const next = keep(ids)
        if (next.length !== ids.length) changed = true
        if (next.length) state.projects[key] = next
        else delete state.projects[key]
      }
      for (const [key, ids] of Object.entries(state.sessions)) {
        const next = keep(ids)
        if (next.length !== ids.length) changed = true
        if (next.length) state.sessions[key] = next
        else delete state.sessions[key]
      }
      if (changed) writeSelections(state)
      return true
    },

    /**
     * @param {'global' | 'project' | 'session'} kind
     * @param {{ sessionId?: string, projectKey?: string }} [scope]
     * @returns {string[]} the ordered ids stored for that layer.
     */
    layerIds(kind, scope = {}) {
      const state = readSelections()
      if (kind === 'global') return [...state.global]
      if (kind === 'project') {
        const key = normalizeProjectKey(scope.projectKey)
        return key ? [...(state.projects[key] ?? [])] : []
      }
      if (kind === 'session') {
        const key = typeof scope.sessionId === 'string' ? scope.sessionId.trim() : ''
        return key ? [...(state.sessions[key] ?? [])] : []
      }
      throw new Error(`unknown layer "${kind}"`)
    },

    /**
     * Replace one layer's ordered selection.
     * @param {'global' | 'project' | 'session'} kind
     * @param {{ sessionId?: string, projectKey?: string }} scope
     * @param {string | string[] | null | undefined} ids
     * @returns {string[]} the stored ids.
     */
    setLayerIds(kind, scope = {}, ids) {
      const list = normalizeIds(ids ?? [])
      for (const id of list) {
        if (id !== NONE && !store.get(id)) throw new Error(`unknown identity "${id}"`)
      }
      const state = readSelections()
      if (kind === 'global') {
        state.global = list
      } else if (kind === 'project') {
        const key = normalizeProjectKey(scope.projectKey)
        if (!key) throw new Error('projectKey is required for the project layer')
        if (list.length) state.projects[key] = list
        else delete state.projects[key]
      } else if (kind === 'session') {
        const key = typeof scope.sessionId === 'string' ? scope.sessionId.trim() : ''
        if (!key) throw new Error('sessionId is required for the session layer')
        if (list.length) state.sessions[key] = list
        else delete state.sessions[key]
      } else {
        throw new Error(`unknown layer "${kind}"`)
      }
      writeSelections(state)
      return list
    },

    /**
     * @param {string | undefined} sessionId
     * @returns {boolean} whether the session opted out of every identity.
     */
    mutedFor(sessionId) {
      return store.layerIds('session', { sessionId }).includes(NONE)
    },

    /**
     * Resolve every identity in force, broad to specific.
     * @param {{ sessionId?: string, projectKey?: string, defaultIdentity?: string }} [scope]
     * @returns {{ muted: boolean, entries: Array<{ kind: string, identity: object }>, missing: Array<{ kind: string, id: string }> }}
     */
    effectiveFor(scope = {}) {
      const state = readSelections()
      const sessionKey = typeof scope.sessionId === 'string' ? scope.sessionId.trim() : ''
      const projectKey = normalizeProjectKey(scope.projectKey)
      const sessionIds = sessionKey ? [...(state.sessions[sessionKey] ?? [])] : []
      const muted = sessionIds.includes(NONE)

      const layerIds = {
        global: [...state.global],
        project: projectKey ? [...(state.projects[projectKey] ?? [])] : [],
        session: sessionIds.filter((id) => id !== NONE),
      }
      if (!layerIds.global.length && scope.defaultIdentity) layerIds.global = [scope.defaultIdentity]

      const entries = []
      const missing = []
      if (!muted) {
        for (const kind of LAYERS) {
          for (const id of layerIds[kind]) {
            const identity = store.get(id)
            if (identity) entries.push({ kind, identity })
            else missing.push({ kind, id })
          }
        }
      }
      return { muted, entries, missing, layerIds }
    },

    /**
     * Legacy single-session reader.
     * @param {string | undefined} sessionId
     * @returns {string | undefined} the first session-layer id, `none`, or undefined.
     */
    selectionOf(sessionId) {
      const ids = store.layerIds('session', { sessionId })
      return ids[0]
    },

    /**
     * Legacy single-session writer: replaces the session layer with one value.
     * @param {string} sessionId
     * @param {string | null | undefined} idOrName - identity id/name, `none`, or null to clear.
     * @returns {string | undefined} the stored value.
     */
    setSelection(sessionId, idOrName) {
      const key = typeof sessionId === 'string' ? sessionId.trim() : ''
      if (!key) throw new Error('sessionId is required')
      const raw = typeof idOrName === 'string' ? idOrName.trim() : ''
      if (!raw) {
        store.setLayerIds('session', { sessionId: key }, [])
        return undefined
      }
      if (raw.toLowerCase() === NONE) {
        store.setLayerIds('session', { sessionId: key }, [NONE])
        return NONE
      }
      const identity = store.get(raw)
      if (!identity) throw new Error(`unknown identity "${raw}"`)
      store.setLayerIds('session', { sessionId: key }, [identity.id])
      return identity.id
    },
  }

  return store
}
