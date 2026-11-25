/**
 * 通用工具。这一层不依赖任何其它模块，保证它永远可以被最先加载。
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, appendFile, writeFile, rename, stat } from 'node:fs/promises'
import { dirname, join, isAbsolute, resolve } from 'node:path'
import { homedir, tmpdir } from 'node:os'

/**
 * 解析命令参数行。
 * 支持 `--key value`、`--key=value`、`--flag`，以及单个位置参数。
 * @param {string} raw 命令原始输入（不含命令名）。
 * @returns {{ positional: string[], flags: Record<string, string | boolean> }}
 */
export function parseArgs(raw) {
  const positional = []
  const flags = {}
  const tokens = tokenize(String(raw ?? ''))
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }
    const body = token.slice(2)
    if (body.length === 0) continue
    const equals = body.indexOf('=')
    if (equals >= 0) {
      flags[body.slice(0, equals)] = body.slice(equals + 1)
      continue
    }
    const next = tokens[index + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags[body] = next
      index += 1
      continue
    }
    flags[body] = true
  }
  return { positional, flags }
}

/**
 * 按空白切分，但保留引号内的空白。
 * @param {string} input
 * @returns {string[]}
 */
function tokenize(input) {
  const out = []
  let buffer = ''
  let quote = null
  for (const character of input) {
    if (quote !== null) {
      if (character === quote) quote = null
      else buffer += character
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (/\s/.test(character)) {
      if (buffer.length > 0) {
        out.push(buffer)
        buffer = ''
      }
      continue
    }
    buffer += character
  }
  if (buffer.length > 0) out.push(buffer)
  return out
}

/**
 * 把 `true|false|on|off|yes|no|1|0` 解析为布尔值。
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['true', 'on', 'yes', 'y', '1'].includes(normalized)) return true
  if (['false', 'off', 'no', 'n', '0'].includes(normalized)) return false
  return fallback
}

/**
 * 计算字符串或 Buffer 的 sha256 十六进制摘要。
 * @param {string | Buffer | Uint8Array} input
 * @returns {string}
 */
export function sha256(input) {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * 会话 ID 的短形式，用于文件名。
 * `session-8f3a...` → `8f3a...`（取前 8 位）。
 * @param {string} sessionId
 * @returns {string}
 */
export function shortId(sessionId) {
  const text = String(sessionId ?? '')
  const stripped = text.startsWith('session-') ? text.slice('session-'.length) : text
  return stripped.replace(/-/g, '').slice(0, 8) || 'unknown'
}

/**
 * 生成本地时间戳 `YYYYMMDD-HHmmss`。
 * @param {number} [at]
 * @returns {string}
 */
export function timestamp(at = Date.now()) {
  const date = new Date(at)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

/**
 * 人类可读的耗时。
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const value = Math.max(0, Math.round(ms))
  if (value < 1000) return `${value} 毫秒`
  const seconds = value / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} 秒`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes} 分 ${rest} 秒`
}

/**
 * 确保目录存在（幂等）。
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function ensureDir(path) {
  await mkdir(path, { recursive: true })
}

/**
 * 文件是否存在。
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * 读取 JSON；文件不存在或解析失败时返回 fallback。
 * @template T
 * @param {string} path
 * @param {T} fallback
 * @returns {Promise<T>}
 */
export async function readJson(path, fallback) {
  try {
    const text = await readFile(path, 'utf8')
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/**
 * 原子写入 JSON（先写临时文件再 rename）。
 * @param {string} path
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function writeJsonAtomic(path, value) {
  await ensureDir(dirname(path))
  const temporary = `${path}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

/**
 * 读取 JSONL：逐行解析，空行跳过；解析失败会抛出带行号的错误。
 * @param {string} path
 * @returns {Promise<unknown[]>}
 */
export async function readJsonl(path) {
  const text = await readFile(path, 'utf8')
  const lines = text.split(/\r?\n/)
  const events = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim().length === 0) continue
    try {
      events.push(JSON.parse(line))
    } catch (error) {
      throw new Error(`第 ${index + 1} 行不是合法 JSON：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return events
}

/**
 * 追加若干事件为 JSONL。
 * @param {string} path
 * @param {readonly unknown[]} events
 * @returns {Promise<void>}
 */
export async function appendJsonl(path, events) {
  if (events.length === 0) return
  await ensureDir(dirname(path))
  const payload = events.map(event => `${JSON.stringify(event)}\n`).join('')
  await appendFile(path, payload, 'utf8')
}

/**
 * 覆盖写入 JSONL。
 * @param {string} path
 * @param {readonly unknown[]} events
 * @returns {Promise<void>}
 */
export async function writeJsonl(path, events) {
  await ensureDir(dirname(path))
  const payload = events.map(event => `${JSON.stringify(event)}\n`).join('')
  await writeFile(path, payload, 'utf8')
}

/**
 * 解析工作目录：优先用调用方给的，其次用 DSH_HOME，最后退到系统临时目录。
 * 这个函数只在「宿主没有提供 cwd」时兜底，正常路径都显式传 cwd。
 * @returns {string}
 */
export function fallbackDataRoot() {
  try {
    const home = process.env.DSH_HOME ?? process.env.DSH_PROFILE_DIR
    if (typeof home === 'string' && home.length > 0) return join(home, 'mode-exchange')
  } catch {
    // 忽略：环境变量不可用时走下一步
  }
  try {
    return join(homedir(), '.dsh', 'mode-exchange')
  } catch {
    return join(tmpdir(), 'dsh-mode-exchange')
  }
}

/**
 * 把可能是相对路径的目录解析为绝对路径。
 * @param {string} path
 * @param {string} base
 * @returns {string}
 */
export function absoluteFrom(path, base) {
  if (typeof path !== 'string' || path.length === 0) return base
  return isAbsolute(path) ? path : resolve(base, path)
}

/**
 * 惰性日志器：拿不到宿主 logger 时退到 console，且永不抛出。
 * @param {any} ctx
 * @returns {{ info: (m: string) => void, warn: (m: string) => void, error: (m: string, e?: unknown) => void }}
 */
export function createLogger(ctx) {
  const emit = (level, message, error) => {
    try {
      const logger = typeof ctx?.logger === 'function' ? ctx.logger('mode-exchange') : undefined
      if (logger && typeof logger[level] === 'function') {
        if (error === undefined) logger[level](message)
        else logger[level](`${message}: ${error instanceof Error ? error.message : String(error)}`)
        return
      }
    } catch {
      // 退到 console
    }
    const line = `[mode-exchange] ${message}`
    if (level === 'error') console.error(line, error ?? '')
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }
  return {
    info: message => emit('info', message),
    warn: message => emit('warn', message),
    error: (message, error) => emit('error', message, error),
  }
}

/**
 * 延迟让出事件循环，避免长任务阻塞。
 * @param {number} [ms]
 * @returns {Promise<void>}
 */
export function yieldToLoop(ms = 0) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms))
}

/**
 * 从会话事件数组中提取一条事件的消息 ID 前缀，用于合成 closers。
 * @param {unknown} event
 * @returns {string | undefined}
 */
export function messageIdOf(event) {
  if (event === null || typeof event !== 'object') return undefined
  const data = event.data
  if (data === null || typeof data !== 'object') return undefined
  const id = data.messageId ?? data.id
  return typeof id === 'string' ? id : undefined
}
