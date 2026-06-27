import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { getCourseNoteForOwner } from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  const jobId = String(req.query?.id || '').trim()
  const lessonKey = String(req.query?.lesson || '').trim()
  if (!jobId || !lessonKey) {
    return res.status(400).json({ ok: false, error: 'Course job id and lesson key are required' })
  }

  try {
    const { profile } = await ensureProfile({ clerkUserId: auth.userId || 'local-dev' })
    const note = await getCourseNoteForOwner(profile.id, jobId, lessonKey)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ ok: true, note })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Course note reader failed'
    const status = message === 'Course job not found' || message === 'Course lesson not found' ? 404 : 400
    return res.status(status).json({ ok: false, error: message })
  }
}
