import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { createCourseJob, listCourseJobs } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
  }

  try {
    if (req.method === 'GET') {
      const jobs = await listCourseJobs()
      return res.status(200).json({ ok: true, jobs })
    }

    if (req.method === 'POST') {
      const job = await createCourseJob(req.body)
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
