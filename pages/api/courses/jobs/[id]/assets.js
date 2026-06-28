import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { getCourseJobById, listCourseAssets, uploadCourseAsset } from '@/lib/courseRepository'

export const config = { api: { bodyParser: { sizeLimit: '120mb' } } }

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  const jobId = String(req.query.id || '')
  try {
    const job = await getCourseJobById(jobId, auth.profile.id)
    if (!job) return res.status(404).json({ ok: false, error: 'Not found' })
    if (req.method === 'GET') return res.status(200).json({ ok: true, assets: await listCourseAssets(jobId) })
    if (req.method === 'POST') {
      const files = Array.isArray(req.body?.files) ? req.body.files : [req.body?.file].filter(Boolean)
      if (!files.length) return res.status(400).json({ ok: false, error: 'No files provided' })
      const assets = []
      for (const file of files) assets.push(await uploadCourseAsset(auth.profile.id, jobId, file))
      return res.status(200).json({ ok: true, assets })
    }
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
