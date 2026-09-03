import assert from 'node:assert/strict'
import test from 'node:test'

let runClaimedCourseTask = null
try {
  ({
    runClaimedCourseTask
  } = await import(
    './pipeline-runner-core.mjs'
  ))
} catch {
  // The packaged delta does not duplicate the existing runner.
  // The apply script runs this test again inside the real repository.
}

function fakeClient() {
  return {
    async report(
      replayKey,
      patch
    ) {
      return {
        task: {
          replay_key:
            replayKey,
          stage:
            patch.stage,
          artifacts:
            patch.artifacts || {},
          runtime:
            patch.runtime || {}
        }
      }
    },
    async heartbeat() {
      return {
        ok: true
      }
    }
  }
}

function recordingAdapter(calls) {
  const method = name =>
    async task => {
      calls.push(
        `${task.replay_key}:${name}`
      )
      return {
        artifacts:
          task.artifacts || {},
        runtime:
          task.runtime || {}
      }
    }

  return {
    download:
      method('download'),
    transcribe:
      method('transcribe'),
    buildTextpack:
      method('buildTextpack'),
    upload:
      method('upload'),
    cleanup:
      method('cleanup')
  }
}

test(
  'two tasks resume from their own stages without cross-processing',
  {
    skip:
      !runClaimedCourseTask &&
      'pipeline-runner-core is provided by the target repository'
  },
  async () => {
  const calls = []
  const client =
    fakeClient()
  const adapter =
    recordingAdapter(calls)

  const first =
    await runClaimedCourseTask({
      client,
      adapter,
      task: {
        replay_key:
          'replay-resume',
        stage:
          'transcribing',
        artifacts: {},
        runtime: {}
      },
      workerId:
        'test-worker',
      leaseSeconds: 900
    })

  const second =
    await runClaimedCourseTask({
      client,
      adapter,
      task: {
        replay_key:
          'replay-fresh',
        stage:
          'queued',
        artifacts: {},
        runtime: {}
      },
      workerId:
        'test-worker',
      leaseSeconds: 900
    })

  assert.equal(
    first.task.stage,
    'awaiting_llm_window'
  )
  assert.equal(
    second.task.stage,
    'awaiting_llm_window'
  )

  assert.deepEqual(
    calls.filter(item =>
      item.startsWith(
        'replay-resume:'
      )
    ),
    [
      'replay-resume:transcribe',
      'replay-resume:buildTextpack',
      'replay-resume:upload',
      'replay-resume:cleanup'
    ]
  )

  assert.deepEqual(
    calls.filter(item =>
      item.startsWith(
        'replay-fresh:'
      )
    ),
    [
      'replay-fresh:download',
      'replay-fresh:transcribe',
      'replay-fresh:buildTextpack',
      'replay-fresh:upload',
      'replay-fresh:cleanup'
    ]
  )
  }
)
