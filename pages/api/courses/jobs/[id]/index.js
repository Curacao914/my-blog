import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { getCourseJobById, updateCourseJobSetup } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  const jobId = String(req.query.id || '')
  try {
    const existing = await getCourseJobById(jobId, auth.profile.id)
    if (!existing) return res.status(404).json({ ok: false, error: 'Not found' })
    if (req.method === 'GET') return res.status(200).json({ ok: true, job: existing })
    if (req.method === 'PATCH') return res.status(200).json({ ok: true, job: await updateCourseJobSetup(jobId, req.body) })
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
