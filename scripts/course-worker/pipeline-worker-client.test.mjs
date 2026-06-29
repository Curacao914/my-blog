import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  })
}

test('claims a task with worker ID and lease', async () => {
  const calls = []
  const client = createCoursePipelineWorkerClient({
    baseUrl: 'https://preview.example',
    secret: 'worker-secret',
    fetchImpl: async (url, options) => {
      calls.push({
        url,
        body: JSON.parse(options.body)
      })
      return jsonResponse(200, {
        ok: true,
        idle: false,
        task: { replay_key: 'r1' }
      })
    }
  })

  const result = await client.claim({
    workerId: 'host:123',
    leaseSeconds: 900
  })

  assert.equal(result.task.replay_key, 'r1')
  assert.equal(
    calls[0].url,
    'https://preview.example/api/courses/pipeline/claim'
  )
  assert.deepEqual(calls[0].body, {
    workerId: 'host:123',
    leaseSeconds: 900
  })
})

test('heartbeats the claimed replay', async () => {
  let target = ''
  const client = createCoursePipelineWorkerClient({
    baseUrl: 'https://preview.example',
    secret: 'worker-secret',
    fetchImpl: async (url) => {
      target = url
      return jsonResponse(200, {
        ok: true,
        task: { replay_key: 'r1' }
      })
    }
  })

  await client.heartbeat('r1', {
    workerId: 'host:123',
    leaseSeconds: 900
  })

  assert.equal(
    target,
    'https://preview.example/api/courses/pipeline/r1/heartbeat'
  )
})
