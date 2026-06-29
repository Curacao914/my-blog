import assert from 'node:assert/strict'
import test from 'node:test'
import { createWorkerTextPackClient } from './textpack-client.mjs'

test('imports with Worker authentication', async () => {
  let captured
  const client = createWorkerTextPackClient({
    baseUrl: 'https://preview.example',
    secret: 'worker-secret',
    fetchImpl: async (url, options) => {
      captured = { url, options }
      return new Response(JSON.stringify({ ok: true, jobId: 'job-1', workflowStatus: 'outline_pending' }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      })
    }
  })
  const result = await client.importTextPack({ schemaVersion: 'course-textpack.v1' })
  assert.equal(result.jobId, 'job-1')
  assert.equal(captured.url, 'https://preview.example/api/courses/pipeline/textpack')
  assert.equal(captured.options.headers.authorization, 'Bearer worker-secret')
})
