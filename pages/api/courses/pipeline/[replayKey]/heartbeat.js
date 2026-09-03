import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import { heartbeatCoursePipelineTask } from '@/lib/course/pipelineLeaseRepository'

function authError(res, auth) {
  return res.status(auth.status || 401).json({
    ok: false,
    error: auth.error || 'Unauthorized',
    code: auth.code || 'unauthorized'
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    })
  }

  try {
    const auth = await requireCoursePipelineAccess(
      req,
      { workerOnly: true }
    )
    if (!auth.ok) return authError(res, auth)

    const replayKey = String(
      req.query?.replayKey || ''
    ).trim()
    if (!replayKey) {
      return res.status(400).json({
        ok: false,
        error: 'replayKey is required'
      })
    }

    const task = await heartbeatCoursePipelineTask(
      auth.ownerId,
      replayKey,
      req.body || {}
    )

    if (!task) {
      return res.status(409).json({
        ok: false,
        code: 'course_pipeline_lease_lost',
        error: 'Course pipeline lease is no longer owned'
      })
    }

    return res.status(200).json({
      ok: true,
      task
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Course pipeline heartbeat failed'
    })
  }
}
