import handler from '@/pages/api/courses/pipeline/textpack'
import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import { applyCourseWorkflowAction, importCourseTextPack, workflowFromJob } from '@/lib/courseRepository'
import { signalCourseOrchestrator } from '@/lib/course/orchestrator'
import { validateTextPack } from '@/lib/course/textpack'

jest.mock('@/lib/auth/coursePipelineAccess', () => ({ requireCoursePipelineAccess: jest.fn() }))
jest.mock('@/lib/courseRepository', () => ({
  applyCourseWorkflowAction: jest.fn(),
  importCourseTextPack: jest.fn(),
  workflowFromJob: jest.fn()
}))
jest.mock('@/lib/course/orchestrator', () => ({ signalCourseOrchestrator: jest.fn() }))
jest.mock('@/lib/course/textpack', () => ({ validateTextPack: jest.fn() }))

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('worker TextPack import', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireCoursePipelineAccess.mockResolvedValue({ ok: true, ownerId: 'owner-1', via: 'course-worker' })
    importCourseTextPack.mockResolvedValue({ job: { id: 'job-1' }, existing: false, summary: { lessonCount: 1 } })
    workflowFromJob.mockReturnValue({ status: 'preflight_required' })
    applyCourseWorkflowAction.mockResolvedValue({ workflow: { status: 'outline_pending' } })
  })

  test('imports and automatically starts the note workflow', async () => {
    const req = {
      method: 'POST',
      body: { textPack: { schemaVersion: 'course-textpack.v1', manifest: { sourceHash: 'hash-1' } } },
      headers: {}
    }
    const res = response()
    await handler(req, res)
    expect(res.statusCode).toBe(201)
    expect(validateTextPack).toHaveBeenCalled()
    expect(applyCourseWorkflowAction).toHaveBeenCalledWith(
      'owner-1',
      'job-1',
      expect.objectContaining({ type: 'save-course-spec' })
    )
    expect(signalCourseOrchestrator).toHaveBeenCalledWith('job-1', expect.any(Object))
    expect(res.body.workflowStatus).toBe('outline_pending')
  })
})
