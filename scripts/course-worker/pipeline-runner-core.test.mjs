import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyPipelineRunnerError,
  pipelineStepsForStage,
  runClaimedCourseTask,
  runCoursePipelineLoop
} from './pipeline-runner-core.mjs'

function task(stage = 'queued') {
  return {
    replay_key: 'replay-1',
    course_key: 'course-1',
    course_name: '国际法学',
    title: '第5-6节',
    stage,
    attempts: {},
    artifacts: {},
    runtime: {}
  }
}

function fullAdapter(events) {
  return {
    async download() {
      events.push('download')
      return {
        artifacts: {
          mediaScratchKey:
            'scratch/replay-1/media.mp4'
        }
      }
    },
    async transcribe() {
      events.push('transcribe')
      return {
        artifacts: {
          transcriptObjectKey:
            'courses/replay-1/transcript.md'
        }
      }
    },
    async buildTextpack() {
      events.push('buildTextpack')
      return {
        artifacts: {
          textpackObjectKey:
            'courses/replay-1/textpack.json'
        }
      }
    },
    async upload() {
      events.push('upload')
      return {
        artifacts: {
          courseJobId: 'job-1'
        }
      }
    },
    async cleanup() {
      events.push('cleanup')
      return {
        runtime: {
          mediaDeleted: true
        }
      }
    }
  }
}

test('maps resume stages to the remaining work', () => {
  assert.deepEqual(
    pipelineStepsForStage('transcript_ready')
      .map(step => step.method),
    ['buildTextpack', 'upload', 'cleanup']
  )
  assert.deepEqual(
    pipelineStepsForStage('awaiting_llm_window'),
    []
  )
})

test('runs one course through every acquisition stage', async () => {
  const events = []
  let current = task()
  const reports = []
  const client = {
    async heartbeat() {
      return { ok: true }
    },
    async report(_replayKey, patch) {
      reports.push(patch.stage)
      current = {
        ...current,
        stage: patch.stage,
        artifacts: {
          ...current.artifacts,
          ...(patch.artifacts || {})
        },
        runtime: {
          ...current.runtime,
          ...(patch.runtime || {})
        }
      }
      return { task: current }
    }
  }

  const result = await runClaimedCourseTask({
    client,
    adapter: fullAdapter(events),
    task: current,
    workerId: 'worker-1',
    leaseSeconds: 900,
    heartbeatEveryMs: 100_000
  })

  assert.equal(
    result.task.stage,
    'awaiting_llm_window'
  )
  assert.deepEqual(events, [
    'download',
    'transcribe',
    'buildTextpack',
    'upload',
    'cleanup'
  ])
  assert.deepEqual(reports, [
    'downloading',
    'downloaded',
    'transcribing',
    'transcript_ready',
    'building_textpack',
    'textpack_ready',
    'uploading',
    'uploaded',
    'cleanup',
    'awaiting_llm_window'
  ])
})

test('school network errors return to queued without attention', async () => {
  let current = task()
  const client = {
    async heartbeat() {},
    async report(_replayKey, patch) {
      current = {
        ...current,
        stage: patch.stage
      }
      return { task: current }
    }
  }
  const adapter = fullAdapter([])
  adapter.download = async () => {
    const error = new Error('school network timeout')
    error.retryable = true
    throw error
  }

  const result = await runClaimedCourseTask({
    client,
    adapter,
    task: current,
    workerId: 'worker-1',
    leaseSeconds: 900,
    heartbeatEveryMs: 100_000
  })

  assert.equal(result.status, 'queued')
  assert.equal(
    result.reason,
    'transient_network'
  )
})

test('loops one task at a time until the queue is empty', async () => {
  const events = []
  const queue = [task(), null]
  let current = queue[0]
  const client = {
    async claim() {
      return { task: queue.shift() }
    },
    async heartbeat() {},
    async report(_key, patch) {
      current = {
        ...current,
        stage: patch.stage,
        artifacts: {
          ...current.artifacts,
          ...(patch.artifacts || {})
        },
        runtime: {
          ...current.runtime,
          ...(patch.runtime || {})
        }
      }
      return { task: current }
    }
  }

  const result = await runCoursePipelineLoop({
    client,
    adapter: fullAdapter(events),
    workerId: 'worker-1',
    maxTasks: 5,
    leaseSeconds: 900,
    heartbeatEveryMs: 100_000
  })

  assert.equal(result.idle, true)
  assert.equal(result.processed, 1)
})

test('classifies missing adapter as human attention', () => {
  assert.deepEqual(
    classifyPipelineRunnerError({
      code: 'COURSE_PIPELINE_ADAPTER_UNCONFIGURED',
      message: 'missing'
    }),
    {
      stage: 'needs_attention',
      kind: 'adapter_unconfigured',
      retryable: false,
      markAttempt: false
    }
  )
})
