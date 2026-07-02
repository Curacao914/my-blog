import handler from '@/pages/api/courses/jobs/[id]/supplement'
import { supplementCourseTextPack } from '@/lib/courseRepository'

jest.mock('@/lib/auth/courseAccess', () => ({
  requireCourseWorkspace: jest.fn(async (_req, options = {}) => ({ ok: true, profile: { id: 'profile-course-1', role: 'member', status: 'active' }, ...(options.ai ? { modelConfig: { apiKey: 'member-key', baseUrl: 'https://api.example/v1', models: { default: 'member-model', outline: 'member-model', writer: 'member-model', reviewer: 'member-model', revision: 'member-model', finalReview: 'member-model' } } } : {}) }))
}))

jest.mock('@/lib/courseRepository', () => ({
  supplementCourseTextPack: jest.fn()
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

describe('/api/courses/jobs/[id]/supplement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('supplements the server-owned course and returns the updated workflow', async () => {
    supplementCourseTextPack.mockResolvedValue({
      job: { id: 'job-1' },
      workflow: { status: 'outline_pending' },
      summary: { lessonCount: 2 }
    })
    const textPack = { schemaVersion: 'course-textpack.v1', course: { name: '国际法' }, lessons: [], ppt_text: [] }
    const req = { method: 'POST', query: { id: 'job-1' }, body: { textPack, ownerId: 'client-owner' } }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(supplementCourseTextPack).toHaveBeenCalledWith('profile-course-1', 'job-1', textPack)
    expect(JSON.stringify(supplementCourseTextPack.mock.calls[0])).not.toContain('client-owner')
    expect(res.body.workflow.status).toBe('outline_pending')
    expect(res.body.requestId).toBeTruthy()
  })
})
