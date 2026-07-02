import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { ensureCourseOrchestrator, signalCourseOrchestrator } from '@/lib/course/orchestrator'
import { getTextPackCourseJobForOwner } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req, { ai: true })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed' }) }
  const jobId = String(req.query?.id || '').trim()
  try {
    await getTextPackCourseJobForOwner(auth.profile.id, jobId)
    const action = String(req.body?.action || 'start')
    const result = action === 'signal' ? await signalCourseOrchestrator(jobId, req.body || {}) : await ensureCourseOrchestrator(jobId)
    return res.status(202).json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程后台任务启动失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message })
  }
}
