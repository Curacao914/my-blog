import handler from '@/pages/api/courses/textpack'
import {
  deleteTextPackCourseJob,
  importCourseTextPack,
  listTextPackCourseJobs
} from '@/lib/courseRepository'
import { buildTextPack } from '@/lib/course/textpack'

jest.mock('@/lib/auth/courseAccess', () => ({
  requireCourseWorkspace: jest.fn(async (_req, options = {}) => ({ ok: true, profile: { id: 'profile-course-1', role: 'member', status: 'active' }, ...(options.ai ? { modelConfig: { apiKey: 'member-key', baseUrl: 'https://api.example/v1', models: { default: 'member-model', outline: 'member-model', writer: 'member-model', reviewer: 'member-model', revision: 'member-model', finalReview: 'member-model' } } } : {}) }))
}))

jest.mock('@/lib/courseRepository', () => ({
  deleteTextPackCourseJob: jest.fn(),
  importCourseTextPack: jest.fn(),
  listTextPackCourseJobs: jest.fn()
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

function samplePack() {
  return buildTextPack({
    course: { name: '证据法' },
    lessons: [{ order: 1, title: '第1课', transcript: '证据规则正文' }],
    decks: []
  })
}

describe('/api/courses/textpack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('imports TextPack for the server-side owner only', async () => {
    const pack = samplePack()
    importCourseTextPack.mockResolvedValue({
      job: { id: 'job-1' },
      existing: false,
      summary: { courseName: '证据法' }
    })
    const req = {
      method: 'POST',
      body: { ownerId: 'client-owner', textPack: pack }
    }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(201)
    expect(importCourseTextPack).toHaveBeenCalledWith('profile-course-1', pack)
    expect(JSON.stringify(importCourseTextPack.mock.calls[0])).not.toContain('client-owner')
  })

  it('lists and deletes only through the server-derived owner', async () => {
    listTextPackCourseJobs.mockResolvedValue([{ id: 'job-1' }])
    const listReq = { method: 'GET', body: {}, query: {} }
    const listRes = createRes()

    await handler(listReq, listRes)
    expect(listTextPackCourseJobs).toHaveBeenCalledWith('profile-course-1')
    expect(listRes.body.jobs).toHaveLength(1)

    deleteTextPackCourseJob.mockResolvedValue({ ok: true })
    const deleteReq = { method: 'DELETE', query: { id: 'job-1' }, body: { ownerId: 'other' } }
    const deleteRes = createRes()

    await handler(deleteReq, deleteRes)
    expect(deleteTextPackCourseJob).toHaveBeenCalledWith('profile-course-1', 'job-1')
    expect(JSON.stringify(deleteTextPackCourseJob.mock.calls[0])).not.toContain('other')
  })
})
