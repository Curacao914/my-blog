import { CourseApiError, readCourseJsonResponse } from '@/lib/course/clientApi'

function response({ ok, status, contentType, body }) {
  return {
    ok,
    status,
    headers: { get: name => name.toLowerCase() === 'content-type' ? contentType : '' },
    text: async () => body
  }
}

describe('course client API response reader', () => {
  it('reports an HTML error page instead of exposing a JSON parse error', async () => {
    await expect(readCourseJsonResponse(response({
      ok: false,
      status: 504,
      contentType: 'text/html',
      body: '<!DOCTYPE html><html><head><title>Function timed out</title></head></html>'
    }), '大纲生成失败')).rejects.toMatchObject({
      name: 'CourseApiError',
      status: 504,
      message: expect.stringContaining('Function timed out')
    })
  })

  it('preserves structured stage and request identifiers', async () => {
    await expect(readCourseJsonResponse(response({
      ok: false,
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'provider timeout', stage: 'generate-outline', requestId: 'req-1' })
    }))).rejects.toEqual(expect.objectContaining({
      stage: 'generate-outline',
      requestId: 'req-1'
    }))
  })

  it('returns valid JSON responses', async () => {
    await expect(readCourseJsonResponse(response({ ok: true, status: 200, contentType: 'application/json', body: '{"ok":true,"value":1}' }))).resolves.toEqual({ ok: true, value: 1 })
  })
})
