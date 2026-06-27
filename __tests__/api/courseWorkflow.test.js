import handler from '@/pages/api/courses/jobs/[id]/workflow'
import {
  applyCourseWorkflowAction,
  getTextPackCourseJobForOwner,
  getTextPackCourseRuntimeForOwner
} from '@/lib/courseRepository'
import { signalCourseOrchestrator } from '@/lib/course/orchestrator'
import { ensureProfile } from '@/lib/server/supabase'

jest.mock('@/lib/auth/serverAdmin', () => ({
  getAdminCandidate: jest.fn(async () => ({ userId: 'clerk-course-owner' })),
  requireAdminRequest: jest.fn(async () => ({ ok: true, via: 'clerk' }))
}))

jest.mock('@/lib/server/supabase', () => ({
  ensureProfile: jest.fn()
}))

jest.mock('@/lib/course/orchestrator', () => ({
  signalCourseOrchestrator: jest.fn()
}))

jest.mock('@/lib/courseRepository', () => ({
  applyCourseWorkflowAction: jest.fn(),
  getTextPackCourseJobForOwner: jest.fn(),
  getTextPackCourseRuntimeForOwner: jest.fn()
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
    signalCourseOrchestrator.mockResolvedValue({ resumed: true, runId: 'run-1' })
  })

  it('returns only the lightweight runtime summary when requested', async () => {
    getTextPackCourseRuntimeForOwner.mockResolvedValue({
      job: { id: 'job-1', course_name: '国际法', current_node: 'node_review' },
      runtime: { status: 'node_review', workflowVersion: 8, counts: { total: 10, approved: 4 } },
      orchestrator: { runId: 'run-1', state: 'running' }
    })
    const req = { method: 'GET', query: { id: 'job-1', summary: '1' }, body: { ownerId: 'client-owner' } }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(getTextPackCourseRuntimeForOwner).toHaveBeenCalledWith('profile-course-1', 'job-1')
    expect(getTextPackCourseJobForOwner).not.toHaveBeenCalled()
    expect(res.body.runtime.workflowVersion).toBe(8)
    expect(res.headers['Cache-Control']).toBe('private, no-store')
  })

  it('reads the full workflow only for the server-derived owner', async () => {
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

  it('applies a human action and wakes the durable workflow', async () => {
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
    expect(signalCourseOrchestrator).toHaveBeenCalledWith('job-1', { action: 'approve-outline' })
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
    expect(signalCourseOrchestrator).not.toHaveBeenCalled()
  })
})
