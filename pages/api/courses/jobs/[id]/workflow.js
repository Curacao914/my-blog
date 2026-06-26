import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  applyCourseWorkflowAction,
  getTextPackCourseJobForOwner
} from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

async function getOwnerProfile(req) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error }

  const candidate = await getAdminCandidate(req)
  const { profile } = await ensureProfile({ clerkUserId: candidate.userId || 'local-dev' })
  return { ok: true, ownerId: profile.id }
}

function cleanError(error) {
  return error instanceof Error ? error.message : 'Invalid course workflow request'
}

export default async function handler(req, res) {
  const owner = await getOwnerProfile(req)
  if (!owner.ok) {
    return res.status(owner.status).json({ ok: false, error: owner.error })
  }

  const jobId = String(req.query?.id || '').trim()
  if (!jobId) return res.status(400).json({ ok: false, error: 'Course job id is required' })

  try {
    if (req.method === 'GET') {
      const job = await getTextPackCourseJobForOwner(owner.ownerId, jobId)
      return res.status(200).json({
        ok: true,
        job,
        workflow: job.preprocess_result?.workflow || null
      })
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const result = await applyCourseWorkflowAction(owner.ownerId, jobId, req.body || {})
      return res.status(200).json({ ok: true, ...result })
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    const message = cleanError(error)
    const status = message === 'Course job not found' ? 404 : 400
    return res.status(status).json({ ok: false, error: message })
  }
}
