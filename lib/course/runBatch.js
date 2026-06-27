import crypto from 'crypto'

import { executeCourseTask } from '@/lib/course/onlineRunner'
import {
  applyCourseWorkflowActionsForWorker,
  claimCourseWorkerTasks
} from '@/lib/courseRepository'

function failureAction(task, error, requestId) {
  const message = error instanceof Error ? error.message : String(error)
  if (['write-node', 'review-node', 'revise-node'].includes(task.type)) {
    return {
      type: 'fail-node-task', lessonKey: task.lessonKey, nodeId: task.node?.id,
      taskType: task.type, error: message, retryable: true, taskKey: task.taskKey
    }
  }
  return {
    type: 'fail-step', step: task.type, error: message, retryable: true,
    taskKey: `${task.taskKey || task.type}:failed:${requestId}`
  }
}

export async function runCourseWorkerBatch(jobId, options = {}) {
  const requestId = options.requestId || crypto.randomUUID()
  const claimed = await claimCourseWorkerTasks(jobId, options.leaseSeconds || 240)
  const tasks = claimed.tasks || []
  if (!tasks.length || tasks[0]?.type === 'idle') {
    return { requestId, idle: true, reason: tasks[0]?.reason || 'no-pending-step', workflow: claimed.workflow, tasks: [], failures: [] }
  }

  const settled = await Promise.allSettled(tasks.map(task => executeCourseTask(task)))
  const actions = settled.map((result, index) => result.status === 'fulfilled'
    ? result.value
    : failureAction(tasks[index], result.reason, requestId)).filter(Boolean)
  const result = await applyCourseWorkflowActionsForWorker(jobId, actions)
  const failures = settled.flatMap((item, index) => item.status === 'rejected' ? [{
    task: tasks[index].type,
    nodeId: tasks[index].node?.id || null,
    error: item.reason instanceof Error ? item.reason.message : String(item.reason)
  }] : [])

  return {
    requestId, idle: false, reason: '', workflow: result.workflow, tasks, failures,
    completedSteps: tasks.filter((_, index) => settled[index].status === 'fulfilled').map(task => task.type)
  }
}

export function courseBatchDirective(result = {}) {
  const reason = result.reason || ''
  const workflow = result.workflow || {}
  const status = workflow.status || ''
  if (['completed', 'cancelled'].includes(status) || ['completed', 'cancelled'].includes(reason)) {
    return { nextAction: 'done', reason: reason || status, retryAfterMs: 0 }
  }
  if (['waiting-preflight', 'waiting-outline-approval', 'waiting-final-human-review', 'waiting-node-human-review', 'waiting-node-retry', 'paused', 'failed'].includes(reason) || ['preflight_required', 'outline_review', 'final_review_human', 'node_human_review', 'paused', 'failed'].includes(status)) {
    return { nextAction: 'wait', reason: reason || status, retryAfterMs: 0 }
  }
  if (reason === 'task-leased') return { nextAction: 'busy', reason, retryAfterMs: 5000 }
  if (result.idle) return { nextAction: 'wait', reason: reason || 'no-pending-step', retryAfterMs: 0 }
  return { nextAction: 'run', reason: '', retryAfterMs: 0 }
}
