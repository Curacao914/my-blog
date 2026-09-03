import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { createCourseJob, listCourseJobs } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, jobs: await listCourseJobs(auth.profile.id) })
    if (req.method === 'POST') return res.status(200).json({ ok: true, job: await createCourseJob(auth.profile.id, req.body) })
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
