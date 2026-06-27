import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'
import { ensureCourseOrchestrator, signalCourseOrchestrator } from '@/lib/course/orchestrator'
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
  const owner = await ownerIdFor(req)
  if (!owner.ok) return res.status(owner.status).json({ ok: false, error: owner.error })
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed' }) }
  const jobId = String(req.query?.id || '').trim()
  try {
    await getTextPackCourseJobForOwner(owner.ownerId, jobId)
    const action = String(req.body?.action || 'start')
    const result = action === 'signal' ? await signalCourseOrchestrator(jobId, req.body || {}) : await ensureCourseOrchestrator(jobId)
    return res.status(202).json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程后台任务启动失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message })
  }
}
