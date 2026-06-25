import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  listCourseAssets,
  uploadCourseAsset
} from '@/lib/courseRepository'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '120mb'
    }
  }
}

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
  }

  const jobId = req.query.id

  try {
    if (req.method === 'GET') {
      const assets = await listCourseAssets(jobId)
      return res.status(200).json({ ok: true, assets })
    }

    if (req.method === 'POST') {
      const files = Array.isArray(req.body?.files)
        ? req.body.files
        : [req.body?.file].filter(Boolean)

      if (files.length === 0) {
        return res.status(400).json({ ok: false, error: 'No files provided' })
      }

      const assets = []
      for (const file of files) {
        assets.push(await uploadCourseAsset(jobId, file))
      }

      return res.status(200).json({ ok: true, assets })
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
