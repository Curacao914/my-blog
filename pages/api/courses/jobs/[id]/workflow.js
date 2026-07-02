import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { signalCourseOrchestrator } from '@/lib/course/orchestrator'
import { applyCourseWorkflowAction, getTextPackCourseJobForOwner, getTextPackCourseRuntimeForOwner, workflowFromJob } from '@/lib/courseRepository'

function containsWorkerOnlyFields(body = {}) {
  return Boolean(body.reviewerReport || body.qualityReport || body.report || body.trace || body.taskKey || body.decision)
}

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  const ownerId = auth.profile.id
  const jobId = String(req.query?.id || '').trim()
  if (!jobId) return res.status(400).json({ ok: false, error: 'Course job id is required' })
  try {
    if (req.method === 'GET') {
      if (String(req.query?.summary || '') === '1') {
        const result = await getTextPackCourseRuntimeForOwner(ownerId, jobId)
        res.setHeader('Cache-Control', 'private, no-store')
        return res.status(200).json({ ok: true, ...result })
      }
      const job = await getTextPackCourseJobForOwner(ownerId, jobId)
      return res.status(200).json({ ok: true, job, workflow: workflowFromJob(job) })
    }
    if (req.method === 'PATCH' || req.method === 'POST') {
      if (containsWorkerOnlyFields(req.body || {})) return res.status(403).json({ ok: false, error: '审查结果只能由课程处理服务写入' })
      const result = await applyCourseWorkflowAction(ownerId, jobId, req.body || {})
      await signalCourseOrchestrator(jobId, { action: req.body?.type || 'state-changed' })
      return res.status(200).json({ ok: true, ...result })
    }
    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid course workflow request'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message })
  }
}
