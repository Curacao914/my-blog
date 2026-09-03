import { COURSE_PIPELINE_STAGES } from '@/lib/course/pipelineQueue'

const SECRET_KEY_PATTERN =
  /(password|passwd|pwd|secret|token|cookie|authorization|signed[_-]?url|access[_-]?key|private[_-]?key)/i
const URL_PATTERN = /https?:\/\//i
const BEARER_PATTERN = /^Bearer\s+\S+/i
const JWT_PATTERN =
  /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?$/

const MAX_TEXT = 500
const MAX_JSON_BYTES = 64 * 1024
const MAX_HISTORY = 200

function cleanText(value, max = MAX_TEXT) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function cleanIdentifier(value, name) {
  const result = cleanText(value, 180)
  if (!result) throw new Error(`${name} is required`)
  if (!/^[A-Za-z0-9._:-]+$/.test(result)) {
    throw new Error(`${name} contains unsupported characters`)
  }
  return result
}

function sanitizeValue(value, path = '$', depth = 0) {
  if (depth > 6) throw new Error(`${path} is too deeply nested`)
  if (value == null || typeof value === 'boolean') return value

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} must be finite`)
    return value
  }

  if (typeof value === 'string') {
    const text = value.slice(0, 4000)
    if (URL_PATTERN.test(text)) {
      throw new Error(`${path} must store an object key, not a URL`)
    }
    if (BEARER_PATTERN.test(text) || JWT_PATTERN.test(text)) {
      throw new Error(`${path} contains a credential-like value`)
    }
    return text
  }

  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item, index) =>
      sanitizeValue(item, `${path}[${index}]`, depth + 1)
    )
  }

  if (typeof value === 'object') {
    const result = {}
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        throw new Error(`${path}.${key} is a forbidden field`)
      }
      result[key] = sanitizeValue(child, `${path}.${key}`, depth + 1)
    }
    return result
  }

  throw new Error(`${path} contains an unsupported value`)
}

function assertJsonSize(value, name) {
  const bytes = Buffer.byteLength(JSON.stringify(value || {}), 'utf8')
  if (bytes > MAX_JSON_BYTES) {
    throw new Error(`${name} exceeds ${MAX_JSON_BYTES} bytes`)
  }
}

export function normalizeCoursePipelineReplay(input = {}) {
  return {
    replay_key: cleanIdentifier(
      input.replayKey ?? input.replay_key,
      'replayKey'
    ),
    course_key: cleanIdentifier(
      input.courseKey ?? input.course_key,
      'courseKey'
    ),
    course_name: cleanText(
      input.courseName ?? input.course_name,
      240
    ),
    title: cleanText(input.title, 240),
    starts_at_text: cleanText(
      input.startsAtText ?? input.starts_at_text,
      120
    ),
    teacher: cleanText(input.teacher, 160)
  }
}

export function normalizeCoursePipelineDiscovery(input = {}) {
  const source = Array.isArray(input) ? input : input.replays
  if (!Array.isArray(source) || !source.length) {
    throw new Error('replays must contain at least one item')
  }
  if (source.length > 200) {
    throw new Error('a discovery batch may contain at most 200 replays')
  }

  const unique = new Map()
  for (const replay of source) {
    const normalized = normalizeCoursePipelineReplay(replay)
    if (!normalized.course_name) {
      throw new Error('courseName is required')
    }
    unique.set(normalized.replay_key, normalized)
  }
  return [...unique.values()]
}

export function normalizeCoursePipelineStagePatch(input = {}) {
  const stage = cleanText(input.stage, 80)
  if (!COURSE_PIPELINE_STAGES.includes(stage)) {
    throw new Error(`unsupported course pipeline stage: ${stage}`)
  }

  const artifacts = sanitizeValue(input.artifacts || {}, '$.artifacts')
  const runtime = sanitizeValue(input.runtime || {}, '$.runtime')
  assertJsonSize(artifacts, 'artifacts')
  assertJsonSize(runtime, 'runtime')

  let nextAttemptAt = null
  if (input.nextAttemptAt || input.next_attempt_at) {
    const parsed = new Date(
      input.nextAttemptAt || input.next_attempt_at
    )
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('nextAttemptAt must be a valid date')
    }
    nextAttemptAt = parsed.toISOString()
  }

  const errorSource = input.error || input.lastError || null
  const lastError = errorSource
    ? {
        kind: cleanText(errorSource.kind || 'task_failure', 80),
        code: cleanText(errorSource.code, 120) || null,
        message: cleanText(
          errorSource.message || errorSource,
          1000
        ),
        retryable: Boolean(errorSource.retryable)
      }
    : null

  return {
    stage,
    artifacts,
    runtime,
    nextAttemptAt,
    lastError,
    markAttempt: input.markAttempt !== false,
    reason: cleanText(input.reason, 240)
  }
}

export function mergeCoursePipelineTaskPatch(
  current,
  patch,
  now = new Date()
) {
  const at = now instanceof Date ? now.toISOString() : String(now)
  const attempts = {
    ...(current.attempts || {})
  }

  if (patch.markAttempt) {
    attempts[patch.stage] =
      Number(attempts[patch.stage] || 0) + 1
  }

  const history = [
    ...(Array.isArray(current.history) ? current.history : []),
    {
      stage: patch.stage,
      at,
      reason: patch.reason || '',
      errorKind: patch.lastError?.kind || null
    }
  ].slice(-MAX_HISTORY)

  return {
    stage: patch.stage,
    attempts,
    artifacts: {
      ...(current.artifacts || {}),
      ...(patch.artifacts || {})
    },
    runtime: {
      ...(current.runtime || {}),
      ...(patch.runtime || {})
    },
    last_error: patch.lastError,
    next_attempt_at: patch.nextAttemptAt,
    history,
    updated_at: at
  }
}

export function normalizeCoursePipelineRetry(
  current,
  reason = '',
  now = new Date()
) {
  const at = now instanceof Date ? now.toISOString() : String(now)
  return {
    stage: 'queued',
    next_attempt_at: null,
    last_error: null,
    history: [
      ...(Array.isArray(current.history) ? current.history : []),
      {
        stage: 'queued',
        at,
        reason: cleanText(reason, 240) || 'manual-retry',
        errorKind: null
      }
    ].slice(-MAX_HISTORY),
    updated_at: at
  }
}

export function summarizeCoursePipelineTasks(tasks = []) {
  const stages = {}
  for (const task of tasks) {
    stages[task.stage] = (stages[task.stage] || 0) + 1
  }
  return {
    total: tasks.length,
    stages,
    active: tasks.filter(task =>
      !['completed', 'needs_attention'].includes(task.stage)
    ).length
  }
}

export function assertCoursePipelineStorageSafe(value) {
  sanitizeValue(value)
  return true
}
