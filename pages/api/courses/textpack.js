import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { deleteTextPackCourseJob, importCourseTextPack, listTextPackCourseJobs } from '@/lib/courseRepository'
import { summarizeTextPack, validateTextPack } from '@/lib/course/textpack'

function cleanError(error) {
  return error instanceof Error ? error.message : 'Invalid course TextPack request'
}

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  const ownerId = auth.profile.id
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, jobs: await listTextPackCourseJobs(ownerId) })
    if (req.method === 'POST') {
      const textPack = req.body?.textPack || req.body
      validateTextPack(textPack)
      const result = await importCourseTextPack(ownerId, textPack)
      return res.status(result.existing ? 200 : 201).json({ ok: true, ...result })
    }
    if (req.method === 'DELETE') {
      const id = String(req.query?.id || req.body?.id || '').trim()
      if (!id) return res.status(400).json({ ok: false, error: 'Course job id is required' })
      await deleteTextPackCourseJob(ownerId, id)
      return res.status(200).json({ ok: true })
    }
    if (req.method === 'PUT') return res.status(200).json({ ok: true, summary: summarizeTextPack(req.body?.textPack || req.body) })
    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({ ok: false, error: cleanError(error) })
  }
}
