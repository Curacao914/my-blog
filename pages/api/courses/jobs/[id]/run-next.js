import crypto from 'crypto'

import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'
import { courseBatchDirective, runCourseWorkerBatch } from '@/lib/course/runBatch'
import { getTextPackCourseJobForOwner } from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

async function ownerIdFor(req) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return auth
  const candidate = await getAdminCandidate(req)
  const { profile } = await ensureProfile({ clerkUserId: candidate.userId || 'local-dev' })
  return { ok: true, ownerId: profile.id }
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
  try {
    await getTextPackCourseJobForOwner(owner.ownerId, jobId)
    const result = await runCourseWorkerBatch(jobId, { requestId, leaseSeconds: 240 })
    const directive = courseBatchDirective(result)
    const globalFailure = result.failures?.find(failure => !['write-node', 'review-node', 'revise-node'].includes(failure.task))
    if (globalFailure) return res.status(502).json({ ok: false, error: globalFailure.error, stage: globalFailure.task, retryable: true, workflow: result.workflow, failures: result.failures, ...directive, requestId })
    return res.status(200).json({
      ok: true, idle: result.idle, reason: result.reason, completedSteps: result.completedSteps || [],
      completedStep: result.completedSteps?.length === 1 ? result.completedSteps[0] : '',
      partialFailures: result.failures || [], workflow: result.workflow, ...directive, requestId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程处理失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message, stage: 'run-next', requestId })
  }
}
