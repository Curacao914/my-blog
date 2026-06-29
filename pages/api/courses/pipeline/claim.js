import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import { claimCoursePipelineTask } from '@/lib/course/pipelineLeaseRepository'

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

    const task = await claimCoursePipelineTask(
      auth.ownerId,
      req.body || {}
    )

    return res.status(200).json({
      ok: true,
      task,
      idle: !task
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Course pipeline claim failed'
    })
  }
}
