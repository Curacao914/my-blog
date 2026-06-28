import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { getCourseJobById, reportCoursePreprocessResult } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  const jobId = String(req.query.id || '')
  try {
    const job = await getCourseJobById(jobId, auth.profile.id)
    if (!job) return res.status(404).json({ ok: false, error: 'Not found' })
    if (req.method === 'GET') return res.status(200).json({ ok: true, result: job.preprocess_result || {}, reportedAt: job.preprocess_reported_at || null, localWorkdir: job.local_workdir || null })
    if (req.method === 'POST') return res.status(200).json({ ok: true, job: await reportCoursePreprocessResult(jobId, req.body || {}) })
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
