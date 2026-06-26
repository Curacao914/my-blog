import handler from '@/pages/api/courses/jobs/[id]/workflow'
import {
  applyCourseWorkflowAction,
  getTextPackCourseJobForOwner
} from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

jest.mock('@/lib/auth/serverAdmin', () => ({
  getAdminCandidate: jest.fn(() => ({ userId: 'clerk-course-owner' })),
  requireAdminRequest: jest.fn(() => ({ ok: true, via: 'clerk' }))
}))

jest.mock('@/lib/server/supabase', () => ({
  ensureProfile: jest.fn()
}))

jest.mock('@/lib/courseRepository', () => ({
  applyCourseWorkflowAction: jest.fn(),
  getTextPackCourseJobForOwner: jest.fn()
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

describe('/api/courses/jobs/[id]/workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ensureProfile.mockResolvedValue({ profile: { id: 'profile-course-1' } })
  })

  it('reads workflow only for the server-derived owner', async () => {
    getTextPackCourseJobForOwner.mockResolvedValue({
      id: 'job-1',
      preprocess_result: { workflow: { status: 'preflight_required' } }
    })
    const req = { method: 'GET', query: { id: 'job-1' }, body: { ownerId: 'client-owner' } }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(getTextPackCourseJobForOwner).toHaveBeenCalledWith('profile-course-1', 'job-1')
    expect(JSON.stringify(getTextPackCourseJobForOwner.mock.calls[0])).not.toContain('client-owner')
  })

  it('applies workflow actions through repository gates', async () => {
    applyCourseWorkflowAction.mockResolvedValue({
      workflow: { status: 'outline_approved' },
      job: { id: 'job-1' }
    })
    const req = {
      method: 'PATCH',
      query: { id: 'job-1' },
      body: { type: 'approve-outline', lessonKey: 'lesson-01', ownerId: 'client-owner' }
    }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(applyCourseWorkflowAction).toHaveBeenCalledWith(
      'profile-course-1',
      'job-1',
      expect.objectContaining({ type: 'approve-outline', lessonKey: 'lesson-01' })
    )
  })

  it('rejects reviewer scores submitted by the browser', async () => {
    const req = {
      method: 'PATCH',
      query: { id: 'job-1' },
      body: {
        type: 'save-node-draft',
        lessonKey: 'lesson-01',
        nodeId: 'node-1',
        markdown: '正文',
        reviewerReport: { coverage: 100, decision: 'approve' }
      }
    }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res.body.error).toContain('审查结果')
    expect(applyCourseWorkflowAction).not.toHaveBeenCalled()
  })

})
