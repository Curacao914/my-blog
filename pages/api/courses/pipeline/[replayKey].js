import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import {
  getCoursePipelineTask,
  retryCoursePipelineTask,
  updateCoursePipelineTaskStage
} from '@/lib/course/pipelineRepository'

function authError(res, auth) {
  return res.status(auth.status || 401).json({
    ok: false,
    error: auth.error || 'Unauthorized',
    code: auth.code || 'unauthorized'
  })
}

function replayKeyFrom(req) {
  return String(req.query?.replayKey || '').trim()
}

export default async function handler(req, res) {
  try {
    const replayKey = replayKeyFrom(req)
    if (!replayKey) {
      return res.status(400).json({
        ok: false,
        error: 'replayKey is required'
      })
    }

    if (req.method === 'GET') {
      const auth = await requireCoursePipelineAccess(req)
      if (!auth.ok) return authError(res, auth)

      const task = await getCoursePipelineTask(
        auth.ownerId,
        replayKey
      )
      if (!task) {
        return res.status(404).json({
          ok: false,
          error: 'Course pipeline task not found'
        })
      }
      return res.status(200).json({ ok: true, task })
    }

    if (req.method === 'PATCH') {
      const auth = await requireCoursePipelineAccess(
        req,
        { workerOnly: true }
      )
      if (!auth.ok) return authError(res, auth)

      const task = await updateCoursePipelineTaskStage(
        auth.ownerId,
        replayKey,
        req.body || {}
      )
      if (!task) {
        return res.status(404).json({
          ok: false,
          error: 'Course pipeline task not found'
        })
      }
      return res.status(200).json({ ok: true, task })
    }

    if (req.method === 'POST') {
      const auth = await requireCoursePipelineAccess(req)
      if (!auth.ok) return authError(res, auth)
      if (String(req.body?.action || 'retry') !== 'retry') {
        return res.status(400).json({
          ok: false,
          error: 'Unsupported action'
        })
      }

      const task = await retryCoursePipelineTask(
        auth.ownerId,
        replayKey,
        req.body?.reason || 'manual-retry'
      )
      if (!task) {
        return res.status(404).json({
          ok: false,
          error: 'Course pipeline task not found'
        })
      }
      return res.status(200).json({ ok: true, task })
    }

    res.setHeader('Allow', 'GET, PATCH, POST')
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
          : 'Course pipeline task request failed'
    })
  }
}
