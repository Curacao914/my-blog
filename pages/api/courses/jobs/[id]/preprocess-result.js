import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  getCourseJobById,
  reportCoursePreprocessResult
} from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
  }

  const jobId = req.query.id

  try {
    if (req.method === 'GET') {
      const job = await getCourseJobById(jobId)
      if (!job) return res.status(404).json({ ok: false, error: 'Not found' })
      return res.status(200).json({
        ok: true,
        result: job.preprocess_result || {},
        reportedAt: job.preprocess_reported_at || null,
        localWorkdir: job.local_workdir || null
      })
    }

    if (req.method === 'POST') {
      const job = await reportCoursePreprocessResult(jobId, req.body || {})
      return res.status(200).json({ ok: true, job })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid request'
    })
  }
}
