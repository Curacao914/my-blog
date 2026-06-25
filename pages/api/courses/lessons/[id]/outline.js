import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  getCourseLessonById,
  updateCourseLessonOutline
} from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
  }

  try {
    if (req.method === 'GET') {
      const lesson = await getCourseLessonById(req.query.id)
      if (!lesson) return res.status(404).json({ ok: false, error: 'Not found' })
      return res.status(200).json({ ok: true, lesson })
    }

    if (req.method === 'PATCH') {
      const lesson = await updateCourseLessonOutline(req.query.id, req.body)
      return res.status(200).json({ ok: true, lesson })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid request'
    })
  }
}
