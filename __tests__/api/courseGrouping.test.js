import handler from '@/pages/api/courses/group-materials'
import { callCourseModel } from '@/lib/course/aiAdapter'

jest.mock('@/lib/auth/courseAccess', () => ({
  requireCourseWorkspace: jest.fn(async (_req, options = {}) => ({ ok: true, profile: { id: 'profile-course-1', role: 'member', status: 'active' }, ...(options.ai ? { modelConfig: { apiKey: 'member-key', baseUrl: 'https://api.example/v1', models: { default: 'member-model', outline: 'member-model', writer: 'member-model', reviewer: 'member-model', revision: 'member-model', finalReview: 'member-model' } } } : {}) }))
}))

jest.mock('@/lib/course/aiAdapter', () => ({
  buildPrompt: jest.fn(value => value),
  callCourseModel: jest.fn()
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

describe('/api/courses/group-materials', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns lesson and range suggestions without replacing existing lesson keys', async () => {
    callCourseModel.mockResolvedValue({
      parsed: {
        lessons: [{ key: 'lesson-2', title: '第二课', order: 2, confidence: 'medium', reason: '内容变化' }],
        assignments: [{ materialKey: 'deck', lessonKey: 'lesson-1', scope: 'lesson', range: { unit: 'page', start: 1, end: 8 }, confidence: 'high', reason: '主题对应' }]
      },
      trace: { model: 'test' }
    })
    const req = {
      method: 'POST',
      body: {
        courseName: '国际法',
        existingLessons: [{ key: 'lesson-1', title: '第一课', order: 1, existing: true }],
        materials: [{ clientKey: 'deck', sourceFile: '课件.pptx', unit: 'page', extent: 20, chunks: [] }]
      }
    }
    const res = createRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.lessons.map(item => item.key)).toEqual(['lesson-1', 'lesson-2'])
    expect(res.body.assignments[0]).toEqual(expect.objectContaining({ materialKey: 'deck', lessonKey: 'lesson-1' }))
    expect(callCourseModel).toHaveBeenCalledWith(expect.objectContaining({ config: expect.objectContaining({ apiKey: 'member-key' }) }))
  })
})
