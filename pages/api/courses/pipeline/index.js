import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import {
  discoverCoursePipelineTasks,
  listCoursePipelineTasks
} from '@/lib/course/pipelineRepository'

function authError(res, auth) {
  return res.status(auth.status || 401).json({
    ok: false,
    error: auth.error || 'Unauthorized',
    code: auth.code || 'unauthorized'
  })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const auth = await requireCoursePipelineAccess(req)
      if (!auth.ok) return authError(res, auth)

      const result = await listCoursePipelineTasks(
        auth.ownerId,
        {
          stage: req.query?.stage || '',
          limit: req.query?.limit
        }
      )
      return res.status(200).json({
        ok: true,
        ownerId: auth.ownerId,
        ...result
      })
    }

    if (req.method === 'POST') {
      const auth = await requireCoursePipelineAccess(
        req,
        { workerOnly: true }
      )
      if (!auth.ok) return authError(res, auth)

      const result = await discoverCoursePipelineTasks(
        auth.ownerId,
        req.body || {}
      )
      return res
        .status(result.addedCount ? 201 : 200)
        .json({
          ok: true,
          ownerId: auth.ownerId,
          ...result
        })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    const status = Number(error?.status || 0)
    return res.status(
      status >= 400 && status < 600 ? status : 500
    ).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Course pipeline request failed'
    })
  }
}
