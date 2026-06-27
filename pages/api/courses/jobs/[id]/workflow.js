import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'
import { signalCourseOrchestrator } from '@/lib/course/orchestrator'
import { applyCourseWorkflowAction, getTextPackCourseJobForOwner, getTextPackCourseRuntimeForOwner, workflowFromJob } from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

async function getOwnerProfile(req) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error }
  const candidate = await getAdminCandidate(req)
  const { profile } = await ensureProfile({ clerkUserId: candidate.userId || 'local-dev' })
  return { ok: true, ownerId: profile.id }
}

function containsWorkerOnlyFields(body = {}) {
  return Boolean(body.reviewerReport || body.qualityReport || body.report || body.trace || body.taskKey || body.decision)
}

export default async function handler(req, res) {
  const owner = await getOwnerProfile(req)
  if (!owner.ok) return res.status(owner.status).json({ ok: false, error: owner.error })
  const jobId = String(req.query?.id || '').trim()
  if (!jobId) return res.status(400).json({ ok: false, error: 'Course job id is required' })
  try {
    if (req.method === 'GET') {
      if (String(req.query?.summary || '') === '1') {
        const result = await getTextPackCourseRuntimeForOwner(owner.ownerId, jobId)
        res.setHeader('Cache-Control', 'private, no-store')
        return res.status(200).json({ ok: true, ...result })
      }
      const job = await getTextPackCourseJobForOwner(owner.ownerId, jobId)
      return res.status(200).json({ ok: true, job, workflow: workflowFromJob(job) })
    }
    if (req.method === 'PATCH' || req.method === 'POST') {
      if (containsWorkerOnlyFields(req.body || {})) return res.status(403).json({ ok: false, error: '审查结果只能由课程处理服务写入' })
      const result = await applyCourseWorkflowAction(owner.ownerId, jobId, req.body || {})
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
