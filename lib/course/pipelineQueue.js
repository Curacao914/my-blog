export const COURSE_PIPELINE_SCHEMA_VERSION = 1

export const COURSE_PIPELINE_STAGES = Object.freeze([
  'discovered',
  'queued',
  'downloading',
  'downloaded',
  'transcribing',
  'transcript_ready',
  'building_textpack',
  'textpack_ready',
  'uploading',
  'uploaded',
  'awaiting_llm_window',
  'writing',
  'cleanup',
  'completed',
  'failed',
  'needs_attention'
])

const TERMINAL = new Set(['completed', 'needs_attention'])
const INTERRUPTIBLE = new Set([
  'downloading',
  'transcribing',
  'building_textpack',
  'uploading',
  'writing',
  'cleanup'
])

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function asIso(value = new Date()) {
  return value instanceof Date ? value.toISOString() : String(value)
}

function parseTime(value) {
  const timestamp = Date.parse(String(value || '').replace(' ', 'T'))
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

export function createCoursePipelineQueue(now = new Date()) {
  const at = asIso(now)
  return {
    schemaVersion: COURSE_PIPELINE_SCHEMA_VERSION,
    createdAt: at,
    updatedAt: at,
    tasks: {}
  }
}

export function upsertDiscoveredCourseReplays(
  queue,
  replays = [],
  now = new Date()
) {
  const next = clone(queue || createCoursePipelineQueue(now))
  const at = asIso(now)
  const added = []

  for (const replay of replays) {
    const replayKey = String(replay?.replayKey || '').trim()
    if (!replayKey || next.tasks[replayKey]) continue

    next.tasks[replayKey] = {
      replayKey,
      courseKey: String(replay.courseKey || ''),
      courseName: String(replay.courseName || ''),
      title: String(replay.title || ''),
      startsAtText: String(replay.startsAtText || ''),
      teacher: String(replay.teacher || ''),
      stage: 'queued',
      attempts: {},
      firstSeenAt: at,
      updatedAt: at,
      nextAttemptAt: null,
      lastError: null,
      artifacts: {},
      history: [{ stage: 'queued', at, reason: 'discovered' }]
    }
    added.push(replayKey)
  }

  next.updatedAt = at
  return { queue: next, added }
}

export function recoverCoursePipelineQueue(queue, now = new Date()) {
  const next = clone(queue)
  const at = asIso(now)
  const recovered = []

  for (const task of Object.values(next.tasks || {})) {
    if (!INTERRUPTIBLE.has(task.stage)) continue
    task.stage = 'queued'
    task.updatedAt = at
    task.lastError = {
      type: 'interrupted',
      message: 'Worker stopped before the previous stage completed.'
    }
    task.history = [
      ...(task.history || []),
      { stage: 'queued', at, reason: 'interrupted-recovery' }
    ]
    recovered.push(task.replayKey)
  }

  next.updatedAt = at
  return { queue: next, recovered }
}

export function transitionCoursePipelineTask(
  queue,
  replayKey,
  stage,
  patch = {},
  now = new Date()
) {
  if (!COURSE_PIPELINE_STAGES.includes(stage)) {
    throw new Error(`Unsupported course pipeline stage: ${stage}`)
  }

  const next = clone(queue)
  const task = next.tasks?.[replayKey]
  if (!task) throw new Error(`Unknown course pipeline task: ${replayKey}`)

  const at = asIso(now)
  task.stage = stage
  task.updatedAt = at
  Object.assign(task, patch)
  task.history = [
    ...(task.history || []),
    { stage, at, reason: String(patch.reason || '') }
  ]
  next.updatedAt = at
  return next
}

export function nextCoursePipelineTask(queue, now = new Date()) {
  const timestamp = now instanceof Date ? now.getTime() : Date.parse(now)
  return Object.values(queue?.tasks || {})
    .filter(task => !TERMINAL.has(task.stage))
    .filter(task => task.stage !== 'awaiting_llm_window')
    .filter(task => {
      if (!task.nextAttemptAt) return true
      const nextAttempt = Date.parse(task.nextAttemptAt)
      return !Number.isFinite(nextAttempt) || nextAttempt <= timestamp
    })
    .sort((left, right) => {
      const byLesson = parseTime(left.startsAtText) - parseTime(right.startsAtText)
      if (byLesson !== 0) return byLesson
      return String(left.firstSeenAt).localeCompare(String(right.firstSeenAt))
    })[0] || null
}

export function releaseCourseLlmWaitingTasks(
  queue,
  decision,
  now = new Date()
) {
  if (!decision?.allowed) return { queue: clone(queue), released: [] }
  const next = clone(queue)
  const at = asIso(now)
  const released = []

  for (const task of Object.values(next.tasks || {})) {
    if (task.stage !== 'awaiting_llm_window') continue
    task.stage = 'queued'
    task.nextAttemptAt = null
    task.updatedAt = at
    task.history = [
      ...(task.history || []),
      { stage: 'queued', at, reason: 'llm-window-open' }
    ]
    released.push(task.replayKey)
  }

  next.updatedAt = at
  return { queue: next, released }
}

export function classifyCoursePipelineFailure(error = {}) {
  const message = String(error?.message || error || '')
  const status = Number(error?.status || error?.meta?.status || 0)

  if (
    error?.code === 'COURSE_LLM_WINDOW_CLOSED'
  ) {
    return {
      kind: 'llm_window',
      retryable: true,
      consumesAttempt: false,
      stage: 'awaiting_llm_window'
    }
  }

  if (
    error?.code === 'AUTH_EXPIRED' ||
    /password|credential|login|unauthori[sz]ed|forbidden/i.test(message) ||
    status === 401 ||
    status === 403
  ) {
    return {
      kind: 'authentication',
      retryable: false,
      consumesAttempt: false,
      stage: 'needs_attention'
    }
  }

  if (
    /timeout|network|socket|aborted|temporar|429|502|503|504/i.test(message) ||
    status === 429 ||
    status >= 500
  ) {
    return {
      kind: 'transient_network',
      retryable: true,
      consumesAttempt: false,
      stage: 'queued'
    }
  }

  return {
    kind: 'task_failure',
    retryable: true,
    consumesAttempt: true,
    stage: 'failed'
  }
}

export function summarizeCoursePipelineQueue(queue) {
  const stages = {}
  for (const task of Object.values(queue?.tasks || {})) {
    stages[task.stage] = (stages[task.stage] || 0) + 1
  }
  return {
    total: Object.keys(queue?.tasks || {}).length,
    stages,
    active: Object.values(queue?.tasks || {})
      .filter(task => !TERMINAL.has(task.stage))
      .length
  }
}
