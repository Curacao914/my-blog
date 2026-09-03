import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { getCourseJobById, getCourseLessonById, updateCourseLessonOutline } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  try {
    const lesson = await getCourseLessonById(req.query.id)
    if (!lesson || !await getCourseJobById(lesson.job_id, auth.profile.id)) return res.status(404).json({ ok: false, error: 'Not found' })
    if (req.method === 'GET') return res.status(200).json({ ok: true, lesson })
    if (req.method === 'PATCH') return res.status(200).json({ ok: true, lesson: await updateCourseLessonOutline(req.query.id, req.body) })
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
