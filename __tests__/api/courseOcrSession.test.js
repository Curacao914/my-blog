import handler from '@/pages/api/courses/ocr/session'

jest.mock('@/lib/auth/courseAccess', () => ({
  requireCourseWorkspace: jest.fn(async (_req, options = {}) => ({ ok: true, profile: { id: 'profile-course-1', role: 'member', status: 'active' }, ...(options.ai ? { modelConfig: { apiKey: 'member-key', baseUrl: 'https://api.example/v1', models: { default: 'member-model', outline: 'member-model', writer: 'member-model', reviewer: 'member-model', revision: 'member-model', finalReview: 'member-model' } } } : {}) }))
}))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/courses/ocr/session', () => {
  const original = { ...process.env }
  afterEach(() => { process.env = { ...original } })

  it('returns a short-lived signed upload token without exposing the secret', async () => {
    process.env.OCR_SERVICE_URL = 'https://curacao914-law-ocr.hf.space'
    process.env.LAW_TECH_OCR_SIGNING_SECRET = 'hidden-secret'
    const res = createRes()
    await handler({ method: 'POST', body: { maxBytes: 1234 } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.serviceUrl).toBe('https://curacao914-law-ocr.hf.space')
    expect(res.body.token.split('.')).toHaveLength(2)
    expect(JSON.stringify(res.body)).not.toContain('hidden-secret')
  })
})
