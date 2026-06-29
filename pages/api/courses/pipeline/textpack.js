import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import { signalCourseOrchestrator } from '@/lib/course/orchestrator'
import {
  applyCourseWorkflowAction,
  importCourseTextPack,
  workflowFromJob
} from '@/lib/courseRepository'
import { validateTextPack } from '@/lib/course/textpack'

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
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const auth = await requireCoursePipelineAccess(req, { workerOnly: true })
    if (!auth.ok) return authError(res, auth)

    const textPack = req.body?.textPack || req.body
    validateTextPack(textPack)
    const imported = await importCourseTextPack(auth.ownerId, textPack)
    if (!imported.job?.id) throw new Error('TextPack import did not create a course job')

    let workflow = workflowFromJob(imported.job)
    if (req.body?.autoStart !== false && workflow.status === 'preflight_required') {
      const started = await applyCourseWorkflowAction(auth.ownerId, imported.job.id, {
        type: 'save-course-spec',
        courseSpec: {
          autoApproveOutline: true,
          ...(req.body?.courseSpec || {})
        }
      })
      workflow = started.workflow
      await signalCourseOrchestrator(imported.job.id, { action: 'automatic-textpack-import' })
    }

    return res.status(imported.existing ? 200 : 201).json({
      ok: true,
      jobId: imported.job.id,
      existing: imported.existing,
      summary: imported.summary,
      workflowStatus: workflow.status,
      importKey: textPack.manifest?.sourceHash || textPack.checksums?.sourceHash || ''
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid course TextPack request'
    })
  }
}
