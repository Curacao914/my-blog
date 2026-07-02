import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CoursePipelineClientError,
  createCoursePipelineClient
} from './pipeline-client.mjs'

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  })
}

test('discovers all replays with the worker secret', async () => {
  const calls = []
  const client = createCoursePipelineClient({
    baseUrl: 'https://preview.example',
    secret: 'worker-secret',
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return jsonResponse(201, {
        ok: true,
        received: 2,
        addedCount: 2
      })
    }
  })

  const result = await client.discover([
    {
      replayKey: 'r1',
      courseKey: 'c1',
      courseName: '课程一'
    },
    {
      replayKey: 'r2',
      courseKey: 'c2',
      courseName: '课程二'
    }
  ])

  assert.equal(result.addedCount, 2)
  assert.equal(calls.length, 1)
  assert.equal(
    calls[0].options.headers.authorization,
    'Bearer worker-secret'
  )
  assert.equal(
    Object.hasOwn(
      calls[0].options.headers,
      'x-law-tech-owner-id'
    ),
    false
  )
})

test('adds an explicit owner only when configured', async () => {
  let captured
  const client = createCoursePipelineClient({
    baseUrl: 'https://preview.example',
    secret: 'worker-secret',
    ownerId: 'profile-1',
    fetchImpl: async (_url, options) => {
      captured = options.headers
      return jsonResponse(200, {
        ok: true,
        tasks: [],
        summary: {}
      })
    }
  })

  await client.list()
  assert.equal(
    captured['x-law-tech-owner-id'],
    'profile-1'
  )
})

test('reports independent task stages', async () => {
  const calls = []
  const client = createCoursePipelineClient({
    baseUrl: 'https://preview.example',
    secret: 'worker-secret',
    fetchImpl: async (url, options) => {
      calls.push({
        url,
        method: options.method,
        body: JSON.parse(options.body)
      })
      return jsonResponse(200, {
        ok: true,
        task: {
          replay_key: 'r1',
          stage: 'transcript_ready'
        }
      })
    }
  })

  await client.report('r1', {
    stage: 'transcript_ready',
    artifacts: {
      transcriptObjectKey:
        'courses/c1/r1/transcript.md'
    }
  })

  assert.equal(calls[0].method, 'PATCH')
  assert.equal(
    calls[0].body.stage,
    'transcript_ready'
  )
})

test('surfaces retryable server errors', async () => {
  const client = createCoursePipelineClient({
    baseUrl: 'https://preview.example',
    secret: 'worker-secret',
    fetchImpl: async () =>
      jsonResponse(503, {
        ok: false,
        error: 'temporarily unavailable',
        code: 'temporary'
      })
  })

  await assert.rejects(
    () => client.list(),
    error => {
      assert.ok(
        error instanceof CoursePipelineClientError
      )
      assert.equal(error.status, 503)
      assert.equal(error.retryable, true)
      return true
    }
  )
})
