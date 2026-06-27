import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { listCourseNoteLibrary } from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    const { profile } = await ensureProfile({ clerkUserId: auth.userId || 'local-dev' })
    const courses = await listCourseNoteLibrary(profile.id)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ ok: true, courses })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Course note library failed'
    })
  }
}
