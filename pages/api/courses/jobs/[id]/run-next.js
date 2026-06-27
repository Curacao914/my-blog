import crypto from 'crypto'

import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'
import { executeCourseTask } from '@/lib/course/onlineRunner'
import {
  applyCourseWorkflowActionsForWorker,
  claimCourseWorkerTasks,
  getTextPackCourseJobForOwner
} from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

async function ownerIdFor(req) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return auth
  const candidate = await getAdminCandidate(req)
  const { profile } = await ensureProfile({ clerkUserId: candidate.userId || 'local-dev' })
  return { ok: true, ownerId: profile.id }
}

function failureAction(task, error, requestId) {
  const message = error instanceof Error ? error.message : String(error)
  if (['write-node', 'review-node', 'revise-node'].includes(task.type)) {
    return {
      type: 'fail-node-task',
      lessonKey: task.lessonKey,
      nodeId: task.node?.id,
      taskType: task.type,
      error: message,
      retryable: true,
      taskKey: task.taskKey
    }
  }
  return {
    type: 'fail-step',
    step: task.type,
    error: message,
    retryable: true,
    taskKey: `${task.taskKey || task.type}:failed:${requestId}`
  }
}

export default async function handler(req, res) {
  const requestId = crypto.randomUUID()
  const owner = await ownerIdFor(req)
  if (!owner.ok) return res.status(owner.status).json({ ok: false, error: owner.error, stage: 'authorize', requestId })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed', stage: 'run-next', requestId })
  }
  const jobId = String(req.query?.id || '').trim()
  let tasks = []
  try {
    await getTextPackCourseJobForOwner(owner.ownerId, jobId)
    const claimed = await claimCourseWorkerTasks(jobId, 240)
    tasks = claimed.tasks || []
    if (!tasks.length || tasks[0]?.type === 'idle') {
      const idle = tasks[0] || { reason: 'no-pending-step' }
      return res.status(200).json({ ok: true, idle: true, reason: idle.reason || 'no-pending-step', workflow: claimed.workflow, requestId })
    }

    const settled = await Promise.allSettled(tasks.map(task => executeCourseTask(task)))
    const actions = settled.map((result, index) => result.status === 'fulfilled'
      ? result.value
      : failureAction(tasks[index], result.reason, requestId)).filter(Boolean)
    const result = await applyCourseWorkflowActionsForWorker(jobId, actions)
    const failures = settled.flatMap((item, index) => item.status === 'rejected' ? [{ task: tasks[index].type, nodeId: tasks[index].node?.id || null, error: item.reason instanceof Error ? item.reason.message : String(item.reason) }] : [])
    const globalFailure = failures.find(failure => !['write-node', 'review-node', 'revise-node'].includes(failure.task))

    if (globalFailure) {
      return res.status(502).json({ ok: false, error: globalFailure.error, stage: globalFailure.task, retryable: true, workflow: result.workflow, failures, requestId })
    }
    return res.status(200).json({
      ok: true,
      idle: false,
      completedSteps: tasks.filter((_, index) => settled[index].status === 'fulfilled').map(task => task.type),
      completedStep: tasks.length === 1 && settled[0].status === 'fulfilled' ? tasks[0].type : '',
      partialFailures: failures,
      workflow: result.workflow,
      requestId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程处理失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({
      ok: false,
      error: message,
      stage: tasks[0]?.type || 'run-next',
      requestId
    })
  }
}
