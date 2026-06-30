const LLM_STAGES = new Set([
  'awaiting_llm_window',
  'writing'
])

const AUTO_RESUMABLE_CONTENT_CODES = new Set([
  'waiting-node-human-review',
  'waiting-final-human-review',
  'node_human_review',
  'final_review_human',
  'final-review-current'
])

function isAutoResumableContentAttention(task = {}) {
  return (
    String(task.stage || '') === 'needs_attention' &&
    String(task.last_error?.kind || '') === 'llm_workflow_attention' &&
    AUTO_RESUMABLE_CONTENT_CODES.has(String(task.last_error?.code || ''))
  )
}

function text(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
}

function courseAllowed(task, allowlist) {
  return allowlist.some(item => {
    const target = text(item)
    return (
      target === text(task.course_key) ||
      target === text(task.course_name)
    )
  })
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(maximum, parsed)
}

export function llmDrainLimits(input = {}) {
  return {
    maxTasks: positiveInteger(input.maxTasks, 4, 20),
    maxBatchesPerTask: positiveInteger(input.maxBatchesPerTask, 80, 300),
    maxBatches: positiveInteger(input.maxBatches, 160, 600)
  }
}

export function selectCourseLlmTasks(tasks = [], options = {}) {
  const allowlist = Array.isArray(options.allowlist)
    ? options.allowlist.map(text).filter(Boolean)
    : []
  const allowAll = Boolean(options.allowAll)
  const maximum = positiveInteger(options.maximum, 4, 20)

  const eligible = [...tasks]
    .filter(task =>
      LLM_STAGES.has(String(task.stage || '')) ||
      isAutoResumableContentAttention(task)
    )
    .filter(task => Boolean(task.artifacts?.courseJobId))
    .filter(task => allowAll || courseAllowed(task, allowlist))
    .sort((left, right) =>
      String(left.first_seen_at || '').localeCompare(
        String(right.first_seen_at || '')
      )
    )

  const queues = new Map()
  for (const task of eligible) {
    const courseIdentity =
      text(task.course_key) ||
      text(task.course_name) ||
      `replay:${text(task.replay_key)}`
    if (!queues.has(courseIdentity)) {
      queues.set(courseIdentity, [])
    }
    queues.get(courseIdentity).push(task)
  }

  const selected = []
  const courseQueues = [...queues.values()]
  while (selected.length < maximum) {
    let advanced = false
    for (const queue of courseQueues) {
      if (!queue.length) continue
      selected.push(queue.shift())
      advanced = true
      if (selected.length >= maximum) break
    }
    if (!advanced) break
  }
  return selected
}

function taskResult(task, patch = {}) {
  return {
    task,
    status: String(task?.stage || patch.status || ''),
    reason: String(patch.reason || ''),
    batches: Number(patch.batches || 0),
    completedSteps: patch.completedSteps || []
  }
}

export async function drainCourseLlmTasks(options = {}) {
  const client = options.client
  if (!client) throw new Error('course pipeline client is required')
  const limits = llmDrainLimits(options)
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const log = options.log || (() => {})
  const listed = options.tasks
    ? { tasks: options.tasks }
    : await client.list({ limit: 200 })
  const selected = selectCourseLlmTasks(listed.tasks || [], {
    allowlist: options.allowlist || [],
    allowAll: options.allowAll,
    maximum: limits.maxTasks
  })

  const results = []
  let totalBatches = 0

  for (const original of selected) {
    let current = original
    let batches = 0
    let completedSteps = []
    let finalReason = ''

    while (
      batches < limits.maxBatchesPerTask &&
      totalBatches < limits.maxBatches
    ) {
      let data
      try {
        data = await client.runLlm(current.replay_key, {
          costMode: options.costMode || ''
        })
      } catch (error) {
        finalReason = error?.retryable
          ? 'llm-control-plane-retryable'
          : 'llm-control-plane-needs-attention'
        if (!error?.retryable) {
          current = (await client.report(current.replay_key, {
            stage: 'needs_attention',
            artifacts: current.artifacts || {},
            runtime: current.runtime || {},
            error: {
              kind: 'llm_control_plane',
              code: String(error?.code || ''),
              message: error instanceof Error ? error.message : String(error),
              retryable: false
            },
            markAttempt: false,
            reason: finalReason
          }).catch(() => ({ task: current }))).task || current
        }
        break
      }

      batches += 1
      totalBatches += 1
      current = data.task || current
      completedSteps = [
        ...completedSteps,
        ...(data.completedSteps || [])
      ]
      finalReason = String(data.reason || '')
      log(
        `${current.replay_key}: llm batch ${batches} ` +
        `${data.nextAction || 'unknown'} ` +
        `${finalReason || current.stage || ''}`
      )

      if (
        data.nextAction === 'done' ||
        data.nextAction === 'wait' ||
        finalReason === 'waiting-llm-window'
      ) {
        break
      }

      if (data.nextAction === 'busy') {
        const requested = Math.max(1000, Number(data.retryAfterMs || 5000))
        if (requested > 15_000) break
        await sleep(requested)
      }
    }

    if (
      (batches >= limits.maxBatchesPerTask ||
        totalBatches >= limits.maxBatches) &&
      !['completed', 'needs_attention', 'awaiting_llm_window'].includes(
        String(current.stage || '')
      )
    ) {
      finalReason = 'llm-batch-budget-exhausted'
    }

    results.push(taskResult(current, {
      reason: finalReason,
      batches,
      completedSteps
    }))

    if (totalBatches >= limits.maxBatches) break
  }

  return {
    selected: selected.length,
    batches: totalBatches,
    results
  }
}

export function buildLlmDrainSummary(input = {}) {
  const results = input.results || []
  const counts = {
    processed: results.length,
    batches: Number(input.batches || 0),
    completed: 0,
    awaitingWindow: 0,
    writing: 0,
    needsAttention: 0,
    other: 0
  }

  for (const result of results) {
    const stage = String(result.task?.stage || result.status || '')
    if (stage === 'completed') counts.completed += 1
    else if (stage === 'awaiting_llm_window') counts.awaitingWindow += 1
    else if (stage === 'writing') counts.writing += 1
    else if (stage === 'needs_attention') counts.needsAttention += 1
    else counts.other += 1
  }

  const status = counts.needsAttention
    ? 'attention'
    : counts.awaitingWindow || counts.writing
      ? 'partial'
      : 'ok'

  return {
    schemaVersion: 1,
    event: 'course_llm_drain',
    status,
    startedAt: input.startedAt || '',
    finishedAt: input.finishedAt || '',
    workerId: String(input.workerId || ''),
    discovery: {
      scannedCourses: 0,
      selectedReplays: Number(input.selected || 0),
      newlyAdded: 0
    },
    counts,
    tasks: results.map(result => ({
      replayKey: String(result.task?.replay_key || ''),
      courseName: String(result.task?.course_name || ''),
      title: String(result.task?.title || ''),
      stage: String(result.task?.stage || result.status || ''),
      reason: String(result.reason || ''),
      batches: Number(result.batches || 0),
      errorKind: String(result.task?.last_error?.kind || ''),
      errorMessage: String(result.task?.last_error?.message || ''),
      retryable: Boolean(result.task?.last_error?.retryable)
    }))
  }
}
