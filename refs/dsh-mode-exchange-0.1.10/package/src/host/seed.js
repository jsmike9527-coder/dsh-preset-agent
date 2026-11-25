/**
 * 原生事件序列的 seed 构造（FR-8 ④「真导入」的核心）。
 *
 * 宿主里「把一段历史变成新会话的活日志」只有一条被官方使用的通道：
 * `ctx.agents.create({ sessionId, seed, inheritedEventCount, meta })`。
 * 它内部走 `sessions.prepare()` → `Session` 构造函数，构造函数对 seed 有
 * 一组硬校验（见 `dsh-session/src/index.ts` 660-733 行）：
 *
 *   1. 每条事件必须是合法 envelope：只允许 type/seq/time/data/surfaceOp/
 *      sourceEventSeqs/ignorable 七个键，seq 必须从 0 开始连续；
 *   2. SurfaceEventType（system/developer/user/assistant message、tool/result）
 *      必须带 surfaceOp；
 *   3. isSeeded 时必须显式给 seed 与 inheritedEventCount；
 *   4. inheritedEventCount 必须正好落在一条 `session/end-seed{inherited:true}`
 *      marker 上（或者等于 seed 长度）。
 *
 * 官方的 seed 构造法只有 `dsh-session/src/fork.ts:21-30` 的 `buildForkSeed`：
 * 复制源事件前缀 → 追加 inherited marker → 用 `forked` 语义补齐未闭合回合。
 * 本文件就是它的等价重实现（插件不能 import 核心包，只能复刻规则）。
 */

/** 已记录调用开始、但落盘时没有结果时使用的错误码（与宿主 repair.ts 一致）。 */
export const TOOL_OUTCOME_UNKNOWN = 'TOOL_OUTCOME_UNKNOWN'

/** 助手请求了工具、但宿主还没记录到调用开始就中断时使用的错误码。 */
export const TOOL_NOT_STARTED = 'TOOL_NOT_STARTED'

/** 合成 tool/result 的模型可见文案，与宿主 `CLOSER_TEXT` 逐字一致。 */
const CLOSER_TEXT = {
  forked: {
    started:
      'The history inherited by this branch records this tool call starting but does not include its result. '
      + 'The parent session may have completed it after the fork point. Decide whether to retry from the tool '
      + 'semantics: retry only if the operation is read-only or idempotent; if it may have side effects, first '
      + 'verify external state or ask the user. Do not retry blindly.',
    notStarted:
      'The history inherited by this branch has no record of this tool call starting. The parent session may '
      + 'have executed it after the fork point. Decide whether to retry from the tool semantics: retry only if '
      + 'the operation is read-only or idempotent; if it may have side effects, first verify external state or '
      + 'ask the user. Do not retry blindly.',
  },
  interrupted: {
    started:
      'The tool call was interrupted after it was recorded, but no result was durably recorded. Its outcome is '
      + 'unknown. Decide whether to retry from the tool semantics: retry only if the operation is read-only or '
      + 'idempotent; if it may have side effects, first verify external state or ask the user. Do not retry blindly.',
    notStarted:
      'The tool call was interrupted before the Harness recorded it as started. Retry it if it is still needed.',
  },
}

/** 是否是 surface 事件（这些必须带 surfaceOp）。 */
const SURFACE_TYPES = new Set([
  'system/message',
  'developer/message',
  'user/message',
  'assistant/message',
  'tool/result',
])

/**
 * 事件类型是否属于 surface 事件。
 * @param {string} type
 * @returns {boolean}
 */
export function isSurfaceEvent(type) {
  return SURFACE_TYPES.has(type)
}

/**
 * 抽出事件里携带的消息体（surface 投影用）。
 * @param {any} event
 * @returns {any}
 */
function messageOf(event) {
  return event?.type === 'user/message' ? event.data : event?.data?.message
}

/**
 * 跟踪未被回应的工具请求，用于补齐合成结果。
 *
 * 规则与宿主 `ToolCallRecovery` 一致：
 *   · turn/start、turn/end、step/end 清空待决表；
 *   · assistant/message 里的 tool-call 块登记待决；
 *   · tool/call 补记 callSeq（表示「已开始」）；
 *   · 匹配 turn/step 的 append 型 tool/result 解除待决。
 */
class ToolCallRecovery {
  /** @param {'forked' | 'interrupted'} kind */
  constructor(kind) {
    this.kind = kind
    /** @type {Map<string, { turn: number, step: number, callSeq?: number }>} */
    this.pendingCalls = new Map()
    /** @type {{ seq: number, time: number } | undefined} */
    this.last = undefined
  }

  /** @param {any} event */
  observe(event) {
    if (event !== null && typeof event === 'object') {
      this.last = { seq: event.seq, time: event.time }
    }
    switch (event?.type) {
      case 'turn/start':
      case 'turn/end':
      case 'step/end':
        this.pendingCalls.clear()
        break
      case 'assistant/message': {
        const content = event?.data?.message?.content
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block?.type === 'tool-call' && typeof block.id === 'string') {
              this.pendingCalls.set(block.id, { turn: event.data.turn, step: event.data.step })
            }
          }
        }
        break
      }
      case 'tool/call': {
        const callId = event?.data?.callId
        const entry = typeof callId === 'string' ? this.pendingCalls.get(callId) : undefined
        if (entry !== undefined) entry.callSeq = event.seq
        break
      }
      case 'tool/result': {
        const callId = event?.data?.message?.source?.callId
        const entry = typeof callId === 'string' ? this.pendingCalls.get(callId) : undefined
        if (event.surfaceOp === 'append' && entry !== undefined
          && entry.turn === event.data.turn && entry.step === event.data.step) {
          this.pendingCalls.delete(callId)
        }
        break
      }
      default:
        break
    }
  }

  /**
   * 造出保守的错误结果（不改变自身状态）。
   * @returns {any[]}
   */
  results() {
    if (this.last === undefined) return []
    let seq = this.last.seq + 1
    const time = this.last.time
    const text = CLOSER_TEXT[this.kind] ?? CLOSER_TEXT.forked
    /** @type {any[]} */
    const results = []
    for (const [callId, entry] of this.pendingCalls) {
      const started = entry.callSeq !== undefined
      const message = {
        id: `${this.kind}-tool-result-${callId}-${seq}`,
        role: 'tool',
        toolCallId: callId,
        isError: true,
        source: { kind: 'tool', callId },
        content: [{ type: 'text', text: started ? text.started : text.notStarted }],
      }
      results.push({
        type: 'tool/result',
        seq: seq++,
        time,
        data: {
          turn: entry.turn,
          step: entry.step,
          message,
          error: started
            ? { name: 'ToolOutcomeUnknownError', code: TOOL_OUTCOME_UNKNOWN }
            : { name: 'ToolNotStartedError', code: TOOL_NOT_STARTED },
        },
        surfaceOp: 'append',
        ...(started ? { sourceEventSeqs: [entry.callSeq] } : {}),
      })
    }
    return results
  }
}

/**
 * 找出日志尾部的未闭合回合。
 * @param {readonly any[]} events
 * @returns {{ openTurn: number | null, openStep: number | null }}
 */
function openBoundaryOf(events) {
  let openTurn = null
  let openStep = null
  for (const event of events) {
    switch (event?.type) {
      case 'turn/start':
        openTurn = event.data.turn
        openStep = null
        break
      case 'turn/end':
        openTurn = null
        openStep = null
        break
      case 'step/start':
        openStep = event.data.step
        break
      case 'step/end':
        openStep = null
        break
      default:
        break
    }
  }
  return { openTurn, openStep }
}

/**
 * 合成把未闭合回合收尾所需的事件（宿主 `openTurnClosers` 的等价实现）。
 *
 * 顺序：未回应工具的错误结果 → 开着的 step/end → turn/end。
 * seq 从最后一条真实事件之后连续编号，time 复用最后一条真实事件的时间
 * （宿主刻意不发明「未来」的时间戳）。
 *
 * @param {readonly any[]} events
 * @param {'forked' | 'interrupted'} [kind]
 * @returns {any[]}
 */
export function openTurnClosers(events, kind = 'forked') {
  const { openTurn, openStep } = openBoundaryOf(events)
  const last = events.at(-1)
  if (openTurn === null || last === undefined) return []

  const recovery = new ToolCallRecovery(kind)
  for (const event of events) recovery.observe(event)

  const closers = recovery.results()
  let seq = last.seq + closers.length + 1
  const time = last.time

  if (openStep !== null) {
    closers.push({ type: 'step/end', seq: seq++, time, data: { turn: openTurn, step: openStep } })
  }
  closers.push({ type: 'turn/end', seq: seq++, time, data: { turn: openTurn, reason: { kind } } })
  return closers
}

/**
 * 日志尾部是否已经闭合（没有开着的回合）。
 * @param {readonly any[]} events
 * @returns {boolean}
 */
export function isBalanced(events) {
  return openBoundaryOf(events).openTurn === null
}

/**
 * 把导出的事件整理成可以喂给 `agents.create({ seed })` 的形态。
 *
 * 与宿主 `buildForkSeed` 一一对应：
 *   prefix = events.slice(0, boundary + 1)
 *   prefix.push({ type: 'session/end-seed', seq: boundary + 1, time: 最后事件时间, data: { inherited: true } })
 *   seed   = prefix.concat(openTurnClosers(prefix, 'forked'))
 *
 * @param {readonly any[]} events 源会话的完整事件序列（seq 从 0 连续）
 * @param {number} [boundary] 含入的最后一个源事件 seq；省略表示最后一条
 * @returns {{
 *   seed: any[],
 *   inheritedEventCount: number,
 *   boundary: number,
 *   closeCount: number,
 *   sourceCount: number,
 * }}
 */
export function buildSeed(events, boundary) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('源会话没有任何事件，无法构造 seed。')
  }
  const resolvedBoundary = boundary === undefined ? events.length - 1 : boundary
  if (!Number.isSafeInteger(resolvedBoundary) || resolvedBoundary < 0 || resolvedBoundary >= events.length) {
    throw new Error(`seed 边界 ${String(resolvedBoundary)} 超出事件范围 0..${events.length - 1}。`)
  }

  // 深拷贝一次：下面会往数组里 push，不能改调用方持有的对象。
  const prefix = events.slice(0, resolvedBoundary + 1).map(event => structuredClone(event))
  const inheritedEventCount = resolvedBoundary + 1
  prefix.push({
    type: 'session/end-seed',
    seq: inheritedEventCount,
    time: prefix[prefix.length - 1].time,
    data: { inherited: true },
  })

  const closers = openTurnClosers(prefix, 'forked')
  return {
    seed: prefix.concat(closers),
    inheritedEventCount,
    boundary: resolvedBoundary,
    closeCount: closers.length,
    sourceCount: inheritedEventCount,
  }
}

/**
 * 只补 closers（续跑写入已持久化的日志时用，例如导出后再补写）。
 * @param {readonly any[]} events
 * @param {'interrupted' | 'forked'} [kind]
 * @returns {any[]}
 */
export function tailClosers(events, kind = 'interrupted') {
  return openTurnClosers(events, kind)
}

/**
 * 给一份 seed 做自检，返回人能读懂的问题列表（空数组表示通过）。
 *
 * 这是 FR-8 ② 的「可解析性」之外的语义校验：宿主构造函数会再校验一遍，
 * 但提前报错能给出更容易定位的中文说明。
 *
 * @param {readonly any[]} seed
 * @param {number} inheritedEventCount
 * @returns {string[]}
 */
export function inspectSeed(seed, inheritedEventCount) {
  const problems = []
  if (!Array.isArray(seed) || seed.length === 0) {
    problems.push('seed 为空。')
    return problems
  }
  for (const [index, event] of seed.entries()) {
    if (event === null || typeof event !== 'object' || Array.isArray(event)) {
      problems.push(`第 ${index} 条事件不是对象。`)
      continue
    }
    if (event.seq !== index) {
      problems.push(`第 ${index} 条事件的 seq 是 ${String(event.seq)}，必须从 0 连续。`)
    }
    if (typeof event.type !== 'string' || event.type.length === 0) {
      problems.push(`第 ${index} 条事件缺少 type。`)
    }
    if (typeof event.time !== 'number' || !Number.isSafeInteger(event.time)) {
      problems.push(`第 ${index} 条事件的 time 不是安全整数。`)
    }
    if (event.data === undefined) {
      problems.push(`第 ${index} 条事件缺少 data。`)
    }
    if (isSurfaceEvent(event.type) && event.surfaceOp === undefined) {
      problems.push(`第 ${index} 条事件（${event.type}）是 surface 事件，必须带 surfaceOp。`)
    }
    if (!isSurfaceEvent(event.type) && event.surfaceOp !== undefined) {
      problems.push(`第 ${index} 条事件（${event.type}）不是 surface 事件，不能带 surfaceOp。`)
    }
    const message = messageOf(event)
    if (isSurfaceEvent(event.type) && (message === undefined || message === null)) {
      problems.push(`第 ${index} 条事件（${event.type}）没有可投影的消息。`)
    }
    if (problems.length >= 20) {
      problems.push('（后续问题已省略）')
      return problems
    }
  }
  const marker = seed[inheritedEventCount]
  if (marker === undefined) {
    problems.push(`inheritedEventCount=${inheritedEventCount} 没有落在任何事件上。`)
  } else if (marker.type !== 'session/end-seed' || marker.data?.inherited !== true) {
    problems.push(`inheritedEventCount=${inheritedEventCount} 处不是 inherited marker。`)
  }
  return problems
}
