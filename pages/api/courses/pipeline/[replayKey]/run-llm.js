import crypto from 'crypto'

import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import {
  getCoursePipelineTask,
  updateCoursePipelineTaskStage
} from '@/lib/course/pipelineRepository'
import {
  courseBatchDirective,
  runCourseWorkerBatch
} from '@/lib/course/runBatch'
import {
  getCurrentCourseError,
  formatCourseWorkflowError
} from '@/lib/course/errorState'
import {
  applyCourseWorkflowAction,
  getTextPackCourseJobForOwner
} from '@/lib/courseRepository'

export const config = {
  maxDuration: 300
}

const MAX_WORKFLOW_AUTO_RETRIES = 3
const NODE_TASK_TYPES = new Set([
  'write-node',
  'review-node',
  'revise-node'
])

function authError(res, auth) {
  return res.status(auth.status || 401).json({
    ok: false,
    error: auth.error || 'Unauthorized',
    code: auth.code || 'unauthorized'
  })
}

function workflowFailure(result = {}) {
  const current = getCurrentCourseError(result.workflow)
  const globalFailure = (result.failures || []).find(
    failure => !NODE_TASK_TYPES.has(String(failure?.task || ''))
  )

  if (!current && !globalFailure) return null

  const step = String(
    current?.step ||
    globalFailure?.task ||
    ''
  )
  const rawMessage = current?.message ||
    globalFailure?.error ||
    '课程工作流技术任务失败'
  const message = current
    ? formatCourseWorkflowError(
        current,
        '课程工作流技术任务失败'
      )
    : [
        String(rawMessage),
        step ? `阶段：${step}` : ''
      ].filter(Boolean).join(' · ')

  return {
    step,
    rawMessage: String(rawMessage),
    message,
    retryable: current
      ? current.retryable !== false
      : true
  }
}

function isTransientWorkflowFailure(failure) {
  if (!failure?.retryable) return false
  return (
    /timeout|timed out|network|socket|temporar|overload|rate.?limit/i.test(
      failure.rawMessage
    ) ||
    /\b429\b|\b5\d\d\b/i.test(failure.rawMessage) ||
    /ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|fetch failed|connection reset|aborted/i.test(
      failure.rawMessage
    )
  )
}

function legacyRecoveryAllowed(task = {}) {
  return (
    String(task.stage || '') === 'needs_attention' &&
    String(task.last_error?.kind || '') === 'llm_workflow_attention' &&
    String(task.last_error?.code || '') === 'failed'
  )
}

function attentionMessage(reason, workflow = {}, result = {}) {
  const failure = workflowFailure({
    ...result,
    workflow
  })
  if (failure?.message) return failure.message

  const lesson = (workflow.lessons || []).find(
    item => item.status !== 'completed'
  )
  if (lesson?.finalReviewAttention?.message) {
    return lesson.finalReviewAttention.message
  }
  const node = (lesson?.nodes || []).find(item =>
    ['node_human_review', 'node_failed'].includes(item.status)
  )
  if (node?.taskError?.message) return node.taskError.message
  const latestIssue =
    node?.reviewerReports?.at?.(-1)?.value?.issues?.[0]
  if (latestIssue?.message) return latestIssue.message
  return ({
    'waiting-final-human-review':
      '最终检查发现无法自动处理的重大异常。',
    'waiting-node-human-review':
      '节点审查发现需要人工判断的来源冲突或实质异常。',
    'waiting-node-retry':
      '节点技术任务已达到自动重试边界。',
    'waiting-preflight':
      '课程偏好尚未形成，自动流程无法继续。',
    'waiting-outline-approval':
      '大纲未按自动化设置批准。',
    paused: '课程工作流被暂停。',
    failed: '课程工作流处理失败。'
  })[reason] || `课程工作流停止于 ${reason || 'unknown'}。`
}

function retryableError(error) {
  const status = Number(error?.status || 0)
  const message = String(error?.message || error || '')
  return (
    error?.retryable === true ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    /timeout|network|socket|temporar|429|502|503|504/i.test(message)
  )
}

export default async function handler(req, res) {
  const requestId = crypto.randomUUID()
  const auth = await requireCoursePipelineAccess(
    req,
    { workerOnly: true }
  )
  if (!auth.ok) return authError(res, auth)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
      code: 'method_not_allowed',
      requestId
    })
  }

  const replayKey = String(req.query?.replayKey || '').trim()
  let task = null
  try {
    task = await getCoursePipelineTask(auth.ownerId, replayKey)
    if (!task) {
      return res.status(404).json({
        ok: false,
        error: 'Course pipeline task not found',
        code: 'course_pipeline_task_not_found',
        requestId
      })
    }

    if (task.stage === 'completed') {
      return res.status(200).json({
        ok: true,
        task,
        nextAction: 'done',
        reason: 'completed',
        retryAfterMs: 0,
        requestId
      })
    }

    const jobId = String(
      task.artifacts?.courseJobId || ''
    ).trim()
    if (!jobId) {
      const updated = await updateCoursePipelineTaskStage(
        auth.ownerId,
        replayKey,
        {
          stage: 'needs_attention',
          artifacts: task.artifacts || {},
          runtime: task.runtime || {},
          error: {
            kind: 'llm_handoff',
            code: 'course_job_missing',
            message:
              'TextPack 已上传，但课程任务标识缺失，无法启动后半段整理。',
            retryable: false
          },
          markAttempt: false,
          reason: 'llm-course-job-missing'
        }
      )
      return res.status(409).json({
        ok: false,
        error: 'Course job id is missing',
        code: 'course_job_missing',
        task: updated,
        nextAction: 'wait',
        reason: 'course-job-missing',
        requestId
      })
    }

    await getTextPackCourseJobForOwner(
      auth.ownerId,
      jobId
    )

    const recoveryRequested =
      req.body?.recoverFailedWorkflow === true
    if (recoveryRequested) {
      if (!legacyRecoveryAllowed(task)) {
        return res.status(409).json({
          ok: false,
          error:
            'The task is not an eligible failed LLM workflow',
          code: 'llm_workflow_recovery_not_allowed',
          task,
          nextAction: 'wait',
          reason: 'recovery-not-allowed',
          retryAfterMs: 0,
          requestId
        })
      }
      await applyCourseWorkflowAction(
        auth.ownerId,
        jobId,
        { type: 'retry' }
      )
    }

    const batchNumber =
      Number(task.runtime?.llmBatchCount || 0) + 1
    task = await updateCoursePipelineTaskStage(
      auth.ownerId,
      replayKey,
      {
        stage: 'writing',
        artifacts: task.artifacts || {},
        runtime: {
          ...(task.runtime || {}),
          llmBatchCount: batchNumber,
          llmLastStartedAt: new Date().toISOString(),
          llmRecoveryRequestedAt: recoveryRequested
            ? new Date().toISOString()
            : (
                task.runtime?.llmRecoveryRequestedAt ||
                ''
              )
        },
        markAttempt: false,
        reason: recoveryRequested
          ? 'begin-recovered-llm-batch'
          : 'begin-llm-batch'
      }
    )

    const result = await runCourseWorkerBatch(
      jobId,
      {
        requestId,
        leaseSeconds: 240,
        costMode: String(req.body?.costMode || '')
      }
    )
    const directive = courseBatchDirective(result)
    const workflowStatus = String(
      result.workflow?.status || ''
    )
    const previousWorkflowRetryCount = Number(
      task.runtime?.llmWorkflowRetryCount || 0
    )
    const technicalFailure = workflowFailure(result)
    let responseWorkflow = result.workflow
    const runtime = {
      ...(task.runtime || {}),
      llmBatchCount: batchNumber,
      llmLastRequestId: requestId,
      llmLastReason: String(
        directive.reason || result.reason || ''
      ),
      llmLastCompletedSteps:
        result.completedSteps || [],
      llmLastFinishedAt: new Date().toISOString(),
      noteWorkflowStatus: workflowStatus,
      llmLastFailureStep:
        technicalFailure?.step || ''
    }

    let stage = 'writing'
    let error = null
    let nextAttemptAt = null
    let reason = 'continue-llm'
    let nextAction = directive.nextAction
    let retryAfterMs = directive.retryAfterMs || 0

    if (directive.nextAction === 'done') {
      stage = 'completed'
      reason = 'llm-completed'
    } else if (
      directive.reason === 'waiting-llm-window'
    ) {
      stage = 'awaiting_llm_window'
      nextAttemptAt =
        directive.nextAllowedAt || null
      reason = 'llm-window-closed'
    } else if (
      directive.nextAction === 'wait' &&
      directive.reason === 'failed' &&
      isTransientWorkflowFailure(
        technicalFailure
      ) &&
      previousWorkflowRetryCount <
        MAX_WORKFLOW_AUTO_RETRIES
    ) {
      const retryCount =
        previousWorkflowRetryCount + 1
      const resumed =
        await applyCourseWorkflowAction(
          auth.ownerId,
          jobId,
          { type: 'retry' }
        )
      responseWorkflow =
        resumed?.workflow || result.workflow
      stage = 'writing'
      reason = 'llm-workflow-auto-retry'
      nextAction = 'busy'
      retryAfterMs = 5000
      nextAttemptAt = new Date(
        Date.now() + retryAfterMs
      ).toISOString()
      runtime.llmWorkflowRetryCount =
        retryCount
      runtime.noteWorkflowStatus = String(
        responseWorkflow?.status || 'retrying'
      )
      error = {
        kind: 'llm_transient',
        code: technicalFailure.step
          ? `workflow_${technicalFailure.step}`
          : 'workflow_failed',
        message: technicalFailure.message,
        retryable: true
      }
    } else if (
      directive.nextAction === 'wait'
    ) {
      stage = 'needs_attention'
      reason =
        `llm-${directive.reason ||
          workflowStatus ||
          'attention'}`
      runtime.llmWorkflowRetryCount =
        directive.reason === 'failed'
          ? previousWorkflowRetryCount
          : 0
      error = {
        kind: 'llm_workflow_attention',
        code: String(
          directive.reason ||
          workflowStatus ||
          'llm_attention'
        ),
        message: attentionMessage(
          directive.reason || workflowStatus,
          result.workflow,
          result
        ),
        retryable: false
      }
    } else if (
      directive.nextAction === 'busy'
    ) {
      reason =
        directive.reason || 'llm-busy'
      if (directive.retryAfterMs) {
        nextAttemptAt = new Date(
          Date.now() +
            Math.max(
              1000,
              Number(
                directive.retryAfterMs
              )
            )
        ).toISOString()
      }
    }

    if (directive.reason !== 'failed') {
      runtime.llmWorkflowRetryCount = 0
    }

    const updated =
      await updateCoursePipelineTaskStage(
        auth.ownerId,
        replayKey,
        {
          stage,
          artifacts: task.artifacts || {},
          runtime,
          error,
          nextAttemptAt,
          markAttempt: false,
          reason
        }
      )

    return res.status(200).json({
      ok: true,
      task: updated,
      workflow: responseWorkflow,
      completedSteps:
        result.completedSteps || [],
      partialFailures:
        result.failures || [],
      nextAction,
      reason:
        reason === 'llm-workflow-auto-retry'
          ? reason
          : (directive.reason || ''),
      retryAfterMs,
      nextAllowedAt:
        directive.nextAllowedAt || null,
      requestId
    })
  } catch (error) {
    const retryable = retryableError(error)
    const message = error instanceof Error
      ? error.message
      : 'Course LLM worker failed'
    let updated = task
    if (task) {
      updated =
        await updateCoursePipelineTaskStage(
          auth.ownerId,
          replayKey,
          {
            stage: retryable
              ? 'writing'
              : 'needs_attention',
            artifacts:
              task.artifacts || {},
            runtime: {
              ...(task.runtime || {}),
              llmLastRequestId: requestId,
              llmLastFinishedAt:
                new Date().toISOString()
            },
            error: {
              kind: retryable
                ? 'llm_transient'
                : 'llm_execution',
              code: String(
                error?.code || ''
              ),
              message,
              retryable
            },
            nextAttemptAt: retryable
              ? new Date(
                  Date.now() +
                    5 * 60 * 1000
                ).toISOString()
              : null,
            markAttempt: false,
            reason: retryable
              ? 'llm-transient-retry'
              : 'llm-execution-needs-attention'
          }
        ).catch(() => task)
    }
    return res.status(
      retryable ? 503 : 500
    ).json({
      ok: false,
      error: message,
      code: String(
        error?.code ||
        'course_llm_worker_failed'
      ),
      retryable,
      task: updated,
      nextAction: retryable
        ? 'busy'
        : 'wait',
      reason: retryable
        ? 'llm-transient-retry'
        : 'llm-execution-needs-attention',
      retryAfterMs: retryable
        ? 5 * 60 * 1000
        : 0,
      requestId
    })
  }
}
