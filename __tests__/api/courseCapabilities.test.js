import handler from '@/pages/api/courses/capabilities'

jest.mock('@/lib/auth/serverAdmin', () => ({
  requireAdminRequest: jest.fn(() => ({ ok: true, via: 'local-dev' }))
}))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
      return this
    }
  }
}

describe('/api/courses/capabilities', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it('returns non-sensitive course writing capability state', async () => {
    process.env.COURSE_AI_API_KEY = 'secret-key'
    process.env.COURSE_AI_MODEL = 'course-model'
    process.env.COURSE_WORKER_TOKEN = 'worker-secret'
    process.env.OCR_SERVICE_URL = 'https://curacao914-law-ocr.hf.space'
    process.env.LAW_TECH_OCR_SIGNING_SECRET = 'ocr-signing-secret'

    const res = createRes()
    await handler({ method: 'GET' }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.courseWriting.configured).toBe(true)
    expect(res.body.courseWriting.models.writer).toBe('course-model')
    expect(res.body.onlineOcr.configured).toBe(true)
    expect(res.body.onlineOcr.serviceUrl).toBe('https://curacao914-law-ocr.hf.space')
    expect(JSON.stringify(res.body)).not.toContain('secret-key')
    expect(JSON.stringify(res.body)).not.toContain('worker-secret')
    expect(JSON.stringify(res.body)).not.toContain('ocr-signing-secret')
  })
})
