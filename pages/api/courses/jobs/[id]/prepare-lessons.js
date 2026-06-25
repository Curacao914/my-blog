import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { prepareCourseLessons } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const result = await prepareCourseLessons(req.query.id)
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid request'
    })
  }
}
