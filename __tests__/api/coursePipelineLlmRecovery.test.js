import handler from '@/pages/api/courses/pipeline/[replayKey]/run-llm'
import {
  requireCoursePipelineAccess
} from '@/lib/auth/coursePipelineAccess'
import {
  getCoursePipelineTask,
  updateCoursePipelineTaskStage
} from '@/lib/course/pipelineRepository'
import {
  courseBatchDirective,
  runCourseWorkerBatch
} from '@/lib/course/runBatch'
import {
  applyCourseWorkflowAction,
  getTextPackCourseJobForOwner
} from '@/lib/courseRepository'

jest.mock('@/lib/auth/coursePipelineAccess', () => ({
  requireCoursePipelineAccess: jest.fn()
}))

jest.mock('@/lib/course/pipelineRepository', () => ({
  getCoursePipelineTask: jest.fn(),
  updateCoursePipelineTaskStage: jest.fn()
}))

jest.mock('@/lib/course/runBatch', () => ({
  courseBatchDirective: jest.fn(),
  runCourseWorkerBatch: jest.fn()
}))

jest.mock('@/lib/courseRepository', () => ({
  applyCourseWorkflowAction: jest.fn(),
  getTextPackCourseJobForOwner: jest.fn()
}))

function response() {
  return {
    statusCode: 200,
    body: null,
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

function pipelineTask(
  runtime = {},
  patch = {}
) {
  return {
    replay_key: 'replay-a',
    stage: 'awaiting_llm_window',
    artifacts: {
      courseJobId: 'job-a'
    },
    runtime,
    last_error: null,
    ...patch
  }
}

function failedWorkflow({
  retryable = true,
  message = 'Course model call failed: 503',
  step = 'generate-outline'
} = {}) {
  return {
    status: 'failed',
    currentStep: step,
    activeErrorId: 'error-1',
    errors: [{
      id: 'error-1',
      step,
      message,
      retryable
    }],
    lessons: [{
      key: 'lesson-01',
      status: 'outline_pending',
      nodes: []
    }]
  }
}

function resultFor(
  workflow,
  failures = []
) {
  return {
    workflow,
    failures,
    completedSteps: []
  }
}

describe(
  'course pipeline LLM recovery',
  () => {
    beforeEach(() => {
      jest.clearAllMocks()
      requireCoursePipelineAccess
        .mockResolvedValue({
          ok: true,
          ownerId: 'owner-a',
          via: 'course-worker'
        })
      getTextPackCourseJobForOwner
        .mockResolvedValue({
          id: 'job-a',
          owner_id: 'owner-a'
        })
      updateCoursePipelineTaskStage
        .mockImplementation(
          async (
            _ownerId,
            _replayKey,
            patch
          ) => ({
            ...pipelineTask(
              patch.runtime
            ),
            stage: patch.stage,
            last_error: patch.error
          })
        )
    })

    it(
      'auto-resumes a transient course-level failure, returns the resumed workflow, and preserves the real error',
      async () => {
        const task = pipelineTask()
        const failed = failedWorkflow()
        const resumedWorkflow = {
          ...failed,
          status: 'outline_pending',
          activeErrorId: null
        }
        getCoursePipelineTask
          .mockResolvedValue(task)
        runCourseWorkerBatch
          .mockResolvedValue(
            resultFor(
              failed,
              [{
                task: 'generate-outline',
                nodeId: null,
                error:
                  'Course model call failed: 503'
              }]
            )
          )
        courseBatchDirective
          .mockReturnValue({
            nextAction: 'wait',
            reason: 'failed',
            retryAfterMs: 0
          })
        applyCourseWorkflowAction
          .mockResolvedValue({
            workflow: resumedWorkflow
          })

        const res = response()
        await handler({
          method: 'POST',
          query: {
            replayKey: 'replay-a'
          },
          body: {
            costMode: 'economy'
          }
        }, res)

        expect(res.statusCode).toBe(200)
        expect(res.body.nextAction).toBe(
          'busy'
        )
        expect(res.body.reason).toBe(
          'llm-workflow-auto-retry'
        )
        expect(res.body.workflow).toBe(
          resumedWorkflow
        )
        expect(
          applyCourseWorkflowAction
        ).toHaveBeenCalledWith(
          'owner-a',
          'job-a',
          { type: 'retry' }
        )

        const finalPatch =
          updateCoursePipelineTaskStage
            .mock.calls.at(-1)[2]
        expect(finalPatch.stage).toBe(
          'writing'
        )
        expect(
          finalPatch.runtime
            .llmWorkflowRetryCount
        ).toBe(1)
        expect(
          finalPatch.runtime
            .noteWorkflowStatus
        ).toBe('outline_pending')
        expect(
          finalPatch.error.retryable
        ).toBe(true)
        expect(
          finalPatch.error.message
        ).toContain(
          'Course model call failed: 503'
        )
        expect(
          finalPatch.error.message
        ).toContain('生成大纲')
      }
    )

    it(
      'does not auto-resume a permanent format failure even when the stored workflow flag is retryable',
      async () => {
        const task = pipelineTask()
        const failed = failedWorkflow({
          message:
            '模型返回格式异常，自动修复后仍无法读取'
        })
        getCoursePipelineTask
          .mockResolvedValue(task)
        runCourseWorkerBatch
          .mockResolvedValue(
            resultFor(
              failed,
              [{
                task: 'generate-outline',
                nodeId: null,
                error:
                  '模型返回格式异常，自动修复后仍无法读取'
              }]
            )
          )
        courseBatchDirective
          .mockReturnValue({
            nextAction: 'wait',
            reason: 'failed',
            retryAfterMs: 0
          })

        const res = response()
        await handler({
          method: 'POST',
          query: {
            replayKey: 'replay-a'
          },
          body: {}
        }, res)

        expect(res.statusCode).toBe(200)
        expect(res.body.nextAction).toBe(
          'wait'
        )
        expect(
          applyCourseWorkflowAction
        ).not.toHaveBeenCalled()

        const finalPatch =
          updateCoursePipelineTaskStage
            .mock.calls.at(-1)[2]
        expect(finalPatch.stage).toBe(
          'needs_attention'
        )
        expect(
          finalPatch.error.message
        ).toContain('模型返回格式异常')
        expect(
          finalPatch.error.retryable
        ).toBe(false)
      }
    )

    it(
      'stops after the bounded retry limit and keeps the actual failure message',
      async () => {
        const task = pipelineTask({
          llmWorkflowRetryCount: 3
        })
        const failed = failedWorkflow()
        getCoursePipelineTask
          .mockResolvedValue(task)
        runCourseWorkerBatch
          .mockResolvedValue(
            resultFor(
              failed,
              [{
                task: 'generate-outline',
                nodeId: null,
                error:
                  'Course model call failed: 503'
              }]
            )
          )
        courseBatchDirective
          .mockReturnValue({
            nextAction: 'wait',
            reason: 'failed',
            retryAfterMs: 0
          })

        const res = response()
        await handler({
          method: 'POST',
          query: {
            replayKey: 'replay-a'
          },
          body: {}
        }, res)

        expect(res.statusCode).toBe(200)
        expect(res.body.nextAction).toBe(
          'wait'
        )
        expect(
          applyCourseWorkflowAction
        ).not.toHaveBeenCalled()

        const finalPatch =
          updateCoursePipelineTaskStage
            .mock.calls.at(-1)[2]
        expect(finalPatch.stage).toBe(
          'needs_attention'
        )
        expect(
          finalPatch.error.message
        ).toContain(
          'Course model call failed: 503'
        )
      }
    )

    it(
      'explicitly recovers one legacy failed LLM task without returning it to the media queue',
      async () => {
        const task = pipelineTask(
          {},
          {
            stage: 'needs_attention',
            last_error: {
              kind:
                'llm_workflow_attention',
              code: 'failed',
              message:
                '课程工作流处理失败。',
              retryable: false
            }
          }
        )
        const resumedWorkflow = {
          status: 'outline_pending',
          lessons: [{
            key: 'lesson-01',
            status: 'outline_pending',
            nodes: []
          }]
        }
        const runningWorkflow = {
          status: 'outline_review',
          lessons: [{
            key: 'lesson-01',
            status: 'outline_review',
            nodes: []
          }]
        }
        getCoursePipelineTask
          .mockResolvedValue(task)
        applyCourseWorkflowAction
          .mockResolvedValue({
            workflow: resumedWorkflow
          })
        runCourseWorkerBatch
          .mockResolvedValue(
            resultFor(runningWorkflow)
          )
        courseBatchDirective
          .mockReturnValue({
            nextAction: 'run',
            reason: '',
            retryAfterMs: 0
          })

        const res = response()
        await handler({
          method: 'POST',
          query: {
            replayKey: 'replay-a'
          },
          body: {
            recoverFailedWorkflow: true
          }
        }, res)

        expect(res.statusCode).toBe(200)
        expect(
          applyCourseWorkflowAction
        ).toHaveBeenCalledTimes(1)
        expect(
          runCourseWorkerBatch
        ).toHaveBeenCalledTimes(1)
        expect(
          updateCoursePipelineTaskStage
            .mock.calls[0][2].stage
        ).toBe('writing')
        expect(res.body.workflow).toBe(
          runningWorkflow
        )
      }
    )

    it(
      'rejects explicit recovery for a task that is not the legacy failed LLM state',
      async () => {
        getCoursePipelineTask
          .mockResolvedValue(
            pipelineTask()
          )

        const res = response()
        await handler({
          method: 'POST',
          query: {
            replayKey: 'replay-a'
          },
          body: {
            recoverFailedWorkflow: true
          }
        }, res)

        expect(res.statusCode).toBe(409)
        expect(res.body.code).toBe(
          'llm_workflow_recovery_not_allowed'
        )
        expect(
          runCourseWorkerBatch
        ).not.toHaveBeenCalled()
      }
    )

    it(
      'does not auto-resume a genuine content attention gate',
      async () => {
        const task = pipelineTask()
        const workflow = {
          status: 'final_review_human',
          errors: [],
          lessons: [{
            key: 'lesson-01',
            status:
              'final_review_human',
            finalReviewAttention: {
              message:
                '课堂材料存在无法自动判断的冲突。'
            },
            nodes: []
          }]
        }
        getCoursePipelineTask
          .mockResolvedValue(task)
        runCourseWorkerBatch
          .mockResolvedValue(
            resultFor(workflow)
          )
        courseBatchDirective
          .mockReturnValue({
            nextAction: 'wait',
            reason:
              'waiting-final-human-review',
            retryAfterMs: 0
          })

        const res = response()
        await handler({
          method: 'POST',
          query: {
            replayKey: 'replay-a'
          },
          body: {}
        }, res)

        expect(res.statusCode).toBe(200)
        expect(
          applyCourseWorkflowAction
        ).not.toHaveBeenCalled()

        const finalPatch =
          updateCoursePipelineTaskStage
            .mock.calls.at(-1)[2]
        expect(finalPatch.stage).toBe(
          'needs_attention'
        )
        expect(
          finalPatch.error.message
        ).toBe(
          '课堂材料存在无法自动判断的冲突。'
        )
      }
    )
  }
)
