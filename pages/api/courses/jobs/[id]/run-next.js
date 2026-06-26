import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'
import { executeCourseTask } from '@/lib/course/onlineRunner'
import {
  applyCourseWorkflowActionForWorker,
  claimCourseWorkerTask,
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

export default async function handler(req, res) {
  const owner = await ownerIdFor(req)
  if (!owner.ok) return res.status(owner.status).json({ ok: false, error: owner.error })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const jobId = String(req.query?.id || '').trim()
  try {
    await getTextPackCourseJobForOwner(owner.ownerId, jobId)
    const claimed = await claimCourseWorkerTask(jobId, 240)
    const task = claimed.task
    if (!task || task.type === 'idle') {
      return res.status(200).json({ ok: true, idle: true, reason: task?.reason || 'no-pending-step', workflow: claimed.workflow })
    }
    try {
      const action = await executeCourseTask(task)
      const result = await applyCourseWorkflowActionForWorker(jobId, action)
      return res.status(200).json({ ok: true, idle: false, completedStep: task.type, workflow: result.workflow })
    } catch (error) {
      const failed = await applyCourseWorkflowActionForWorker(jobId, {
        type: 'fail-step',
        step: task.type,
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
        taskKey: `${task.taskKey || task.type}:failed`
      })
      return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : '课程处理失败', workflow: failed.workflow })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程处理失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message })
  }
}
