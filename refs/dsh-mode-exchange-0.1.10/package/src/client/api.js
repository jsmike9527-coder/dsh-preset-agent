/**
 * 客户端到宿主的 HTTP 通道封装。
 *
 * 宿主在 src/host/routes.js 里用 connection.fetch.register() 注册同一个前缀下的
 * 固定路径，返回 { ok: true, value } 或 { ok: false, error: { code, message } }。
 */

export const ROUTE_PREFIX = '/api/mode-exchange'

const HEADERS = { 'content-type': 'application/json; charset=utf-8' }

/** 解析响应信封；无法解析时抛出带中文说明的错误。 */
async function parseEnvelope(response, t) {
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(t('error.badResponse'))
  }
  if (body && body.ok === true) return body.value
  const message = body && body.error && body.error.message
    ? String(body.error.message)
    : t('error.badResponse')
  const error = new Error(message)
  error.code = body && body.error ? body.error.code : undefined
  throw error
}

/** 发起一次调用。path 不带前缀，由本文件补上。 */
async function call(t, method, path, payload) {
  const init = {
    method,
    credentials: 'same-origin',
    headers: HEADERS,
    cache: 'no-store',
  }
  if (payload !== undefined) init.body = JSON.stringify(payload)
  let response
  try {
    response = await fetch(ROUTE_PREFIX + path, init)
  } catch (cause) {
    throw new Error(t('error.network', { reason: cause && cause.message ? cause.message : String(cause) }))
  }
  if (!response.ok && response.status !== 200) {
    // 宿主路由会自己编码业务错误；只有真正的传输层错误才走到这里。
    let text = ''
    try { text = await response.text() } catch { text = '' }
    const error = new Error(t('error.network', { reason: 'HTTP ' + response.status + (text ? ' ' + text.slice(0, 200) : '') }))
    error.status = response.status
    throw error
  }
  return parseEnvelope(response, t)
}

/** 构造 API 对象；t 是文案函数。 */
export function createApi(t) {
  const query = params => {
    const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    if (entries.length === 0) return ''
    return '?' + entries.map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value))).join('&')
  }

  return {
    /** 读取面板状态：当前模式、可切换性、模式清单、配置、能力、迁移历史。 */
    getState: sessionId => call(t, 'GET', '/state' + query({ sessionId })),
    /** 执行运行时模式切换。 */
    switchMode: (sessionId, mode) => call(t, 'POST', '/switch', { sessionId, mode }),
    /** 回退到切换前模式。 */
    revert: sessionId => call(t, 'POST', '/revert', { sessionId }),
    /** 启动迁移重建。 */
    migrate: request => call(t, 'POST', '/migrate', request),
    /** 查询迁移任务状态。 */
    jobStatus: jobId => call(t, 'GET', '/job' + query({ jobId })),
    /** 取消迁移任务。 */
    cancelJob: jobId => call(t, 'POST', '/cancel', { jobId }),
    /** 读取迁移历史。 */
    migrations: sessionId => call(t, 'GET', '/migrations' + query({ sessionId })),
    /** 读取某次迁移的报告。 */
    report: reportId => call(t, 'GET', '/report' + query({ reportId })),
    /** 仅归档旧会话（迁移最后一步的手动补救）。 */
    archiveOld: (sessionId, confirm, backup) => call(t, 'POST', '/archive-old', { sessionId, confirm, backup }),
    /** 保存插件配置。 */
    saveConfig: patch => call(t, 'POST', '/config', patch),
    /** 会话清单（带标题、所属工作区），供面板选择器。 */
    listSessions: () => call(t, 'GET', '/sessions'),
    /** 工作区清单，供面板选择器。 */
    listWorkspaces: () => call(t, 'GET', '/workspaces'),
  }
}
