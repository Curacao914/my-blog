import {
  validateCoursePipelineAdapter
} from './pipeline-adapter-contract.mjs'

const STEPS = Object.freeze([
  Object.freeze({
    method: 'download',
    begin: 'downloading',
    done: 'downloaded'
  }),
  Object.freeze({
    method: 'transcribe',
    begin: 'transcribing',
    done: 'transcript_ready'
  }),
  Object.freeze({
    method: 'buildTextpack',
    begin: 'building_textpack',
    done: 'textpack_ready'
  }),
  Object.freeze({
    method: 'upload',
    begin: 'uploading',
    done: 'uploaded'
  }),
  Object.freeze({
    method: 'cleanup',
    begin: 'cleanup',
    done: 'awaiting_llm_window'
  })
])

const START_INDEX = Object.freeze({
  queued: 0,
  failed: 0,
  downloading: 0,
  downloaded: 1,
  transcribing: 1,
  transcript_ready: 2,
  building_textpack: 2,
  textpack_ready: 3,
  uploading: 3,
  uploaded: 4,
  cleanup: 4
})

function mergeTask(current, next) {
  return next?.task || {
    ...current,
    ...next
  }
}

function cleanResult(value = {}) {
  return {
    artifacts:
      value.artifacts &&
      typeof value.artifacts === 'object'
        ? value.artifacts
        : {},
    runtime:
      value.runtime &&
      typeof value.runtime === 'object'
        ? value.runtime
        : {},
    reason: String(value.reason || '')
  }
}

function retryDelayMs(task, error) {
  const attempts = Object.values(
    task?.attempts || {}
  ).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  )
  const requested = Number(error?.retryAfterMs || 0)
  if (requested > 0) {
    return Math.max(60_000, requested)
  }
  return Math.min(
    6 * 60 * 60 * 1000,
    5 * 60 * 1000 * 2 ** Math.min(5, attempts)
  )
}

export function classifyPipelineRunnerError(error) {
  const message = String(
    error?.message || error || ''
  )
  const status = Number(error?.status || 0)

  if (
    error?.code === 'COURSE_ASR_DAILY_BUDGET_DEFERRED'
  ) {
    return {
      stage: 'queued',
      kind: 'asr_daily_budget',
      retryable: true,
      markAttempt: false
    }
  }

  if (
    error?.code === 'COURSE_ASR_TASK_BUDGET_EXCEEDED' ||
    error?.code === 'COURSE_ASR_PAID_DISABLED'
  ) {
    return {
      stage: 'needs_attention',
      kind: 'asr_budget',
      retryable: false,
      markAttempt: false
    }
  }

  if (
    error?.code === 'AUTH_EXPIRED' ||
    /password|credential|login|unauthori[sz]ed|forbidden/i.test(
      message
    ) ||
    status === 401 ||
    status === 403
  ) {
    return {
      stage: 'needs_attention',
      kind: 'authentication',
      retryable: false,
      markAttempt: false
    }
  }

  if (
    error?.code === 'COURSE_PIPELINE_ADAPTER_UNCONFIGURED'
  ) {
    return {
      stage: 'needs_attention',
      kind: 'adapter_unconfigured',
      retryable: false,
      markAttempt: false
    }
  }

  if (
    error?.retryable ||
    /timeout|network|socket|aborted|temporar|429|502|503|504/i.test(
      message
    ) ||
    status === 429 ||
    status >= 500
  ) {
    return {
      stage: 'queued',
      kind: 'transient_network',
      retryable: true,
      markAttempt: false
    }
  }

  return {
    stage: 'failed',
    kind: 'task_failure',
    retryable: true,
    markAttempt: true
  }
}

export function pipelineStepsForStage(stage) {
  const index = START_INDEX[stage]
  return Number.isInteger(index)
    ? STEPS.slice(index)
    : []
}

export async function runClaimedCourseTask(options = {}) {
  const client = options.client
  const adapter = validateCoursePipelineAdapter(
    options.adapter
  )
  const workerId = String(options.workerId || '')
  const leaseSeconds = Math.max(
    60,
    Number(options.leaseSeconds || 900)
  )
  const heartbeatEveryMs = Math.max(
    1_000,
    Number(
      options.heartbeatEveryMs ||
        Math.min(60_000, leaseSeconds * 400)
    )
  )
  const log = options.log || (() => {})
  let task = options.task

  if (!client || !task?.replay_key) {
    throw new Error(
      'client and claimed task are required'
    )
  }

  const steps = pipelineStepsForStage(task.stage)
  if (!steps.length) {
    return {
      task,
      status: 'noop',
      reason: `stage ${task.stage} is not worker-actionable`
    }
  }

  let heartbeatError = null
  const heartbeat = setInterval(() => {
    client
      .heartbeat(task.replay_key, {
        workerId,
        leaseSeconds
      })
      .catch(error => {
        heartbeatError = error
        log(
          `heartbeat failed: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        )
      })
  }, heartbeatEveryMs)
  heartbeat.unref?.()

  try {
    for (const step of steps) {
      if (heartbeatError?.code === 'course_pipeline_lease_lost') {
        throw heartbeatError
      }

      const resuming = task.stage === step.begin
      const started = await client.report(
        task.replay_key,
        {
          stage: step.begin,
          artifacts: task.artifacts || {},
          runtime: task.runtime || {},
          markAttempt: !resuming,
          reason: resuming
            ? `resume-${step.method}`
            : `begin-${step.method}`
        }
      )
      task = mergeTask(task, started)
      log(`${task.replay_key}: ${step.begin}`)

      const output = cleanResult(
        await adapter[step.method](
          task,
          {
            workerId,
            leaseSeconds,
            heartbeat: () =>
              client.heartbeat(
                task.replay_key,
                {
                  workerId,
                  leaseSeconds
                }
              ),
            log
          }
        )
      )

      const completed = await client.report(
        task.replay_key,
        {
          stage: step.done,
          artifacts: output.artifacts,
          runtime: output.runtime,
          markAttempt: false,
          reason:
            output.reason ||
            `complete-${step.method}`
        }
      )
      task = mergeTask(task, completed)
      log(`${task.replay_key}: ${step.done}`)
    }

    return {
      task,
      status: 'processed',
      reason: ''
    }
  } catch (error) {
    const classified =
      classifyPipelineRunnerError(error)
    const delayMs = classified.retryable
      ? retryDelayMs(task, error)
      : 0
    const nextAttemptAt = delayMs
      ? new Date(Date.now() + delayMs).toISOString()
      : null

    const reported = await client.report(
      task.replay_key,
      {
        stage: classified.stage,
        artifacts: task.artifacts || {},
        runtime: task.runtime || {},
        error: {
          kind: classified.kind,
          code: String(error?.code || ''),
          message:
            error instanceof Error
              ? error.message
              : String(error),
          retryable: classified.retryable
        },
        nextAttemptAt,
        markAttempt: classified.markAttempt,
        reason: `runner-${classified.kind}`
      }
    )

    return {
      task: mergeTask(task, reported),
      status: classified.stage,
      reason: classified.kind,
      error
    }
  } finally {
    clearInterval(heartbeat)
  }
}

export async function runCoursePipelineLoop(
  options = {}
) {
  const client = options.client
  const adapter = validateCoursePipelineAdapter(
    options.adapter
  )
  const workerId = String(options.workerId || '')
  const maxTasks = Math.max(
    1,
    Number(options.maxTasks || 20)
  )
  const leaseSeconds = Math.max(
    60,
    Number(options.leaseSeconds || 900)
  )
  const results = []

  for (let index = 0; index < maxTasks; index += 1) {
    const claimed = await client.claim({
      workerId,
      leaseSeconds
    })
    if (!claimed.task) {
      return {
        idle: true,
        processed: results.length,
        results
      }
    }

    const result = await runClaimedCourseTask({
      client,
      adapter,
      task: claimed.task,
      workerId,
      leaseSeconds,
      heartbeatEveryMs:
        options.heartbeatEveryMs,
      log: options.log
    })
    results.push(result)
  }

  return {
    idle: false,
    processed: results.length,
    results
  }
}
