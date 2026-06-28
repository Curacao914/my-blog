import crypto from 'crypto'

import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { courseBatchDirective, runCourseWorkerBatch } from '@/lib/course/runBatch'
import { getTextPackCourseJobForOwner } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const requestId = crypto.randomUUID()
  const auth = await requireCourseWorkspace(req, { ai: true })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code, stage: 'authorize', requestId })
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed', stage: 'run-next', requestId }) }
  const jobId = String(req.query?.id || '').trim()
  try {
    await getTextPackCourseJobForOwner(auth.profile.id, jobId)
    const result = await runCourseWorkerBatch(jobId, { requestId, leaseSeconds: 240, modelConfig: auth.modelConfig })
    const directive = courseBatchDirective(result)
    const globalFailure = result.failures?.find(failure => !['write-node', 'review-node', 'revise-node'].includes(failure.task))
    if (globalFailure) return res.status(502).json({ ok: false, error: globalFailure.error, stage: globalFailure.task, retryable: true, workflow: result.workflow, failures: result.failures, ...directive, requestId })
    return res.status(200).json({ ok: true, idle: result.idle, reason: result.reason, completedSteps: result.completedSteps || [], completedStep: result.completedSteps?.length === 1 ? result.completedSteps[0] : '', partialFailures: result.failures || [], workflow: result.workflow, ...directive, requestId })
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程处理失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message, stage: 'run-next', requestId })
  }
}
