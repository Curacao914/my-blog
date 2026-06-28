import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { getCourseJobById, listCourseLessons } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }) }
  try {
    const job = await getCourseJobById(String(req.query.id || ''), auth.profile.id)
    if (!job) return res.status(404).json({ ok: false, error: 'Not found' })
    return res.status(200).json({ ok: true, lessons: await listCourseLessons(job.id) })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
