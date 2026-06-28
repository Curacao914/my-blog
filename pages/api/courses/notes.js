import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { listCourseNoteLibrary } from '@/lib/courseRepository'

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }) }
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  try {
    const courses = await listCourseNoteLibrary(auth.profile.id)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ ok: true, courses })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Course note library failed' })
  }
}
