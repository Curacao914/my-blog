import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { getCourseJobById, getCourseWorkerManifest } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }) }
  try {
    const jobId = String(req.query.id || '')
    if (!await getCourseJobById(jobId, auth.profile.id)) return res.status(404).json({ ok: false, error: 'Not found' })
    return res.status(200).json({ ok: true, manifest: await getCourseWorkerManifest(jobId) })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
