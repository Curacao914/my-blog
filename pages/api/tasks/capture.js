import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { toPublicTask } from '@/lib/taskInboxAdapters'
import { createTaskFromCapture } from '@/lib/tasksRepository'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireAdminRequest(req, { allowCaptureToken: true })
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
  }

  try {
    const rawText = req.body?.rawText || req.body?.text || ''
    const task = await createTaskFromCapture(rawText, {
      source: req.body?.source || 'web'
    })

    return res.status(200).json({
      ok: true,
      task: toPublicTask(task)
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid request'
    })
  }
}
