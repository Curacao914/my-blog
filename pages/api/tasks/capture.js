import { getConfiguredCaptureOwner } from '@/lib/auth/scheduleOwner'
import { toPublicTask } from '@/lib/taskInboxAdapters'
import { createTaskFromCapture } from '@/lib/tasksRepository'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const owner = await getConfiguredCaptureOwner(req)
  if (!owner.ok) return res.status(owner.status).json({ ok: false, error: owner.error })

  try {
    const rawText = req.body?.rawText || req.body?.text || ''
    const task = await createTaskFromCapture(owner.profile.id, rawText, {
      source: req.body?.source || 'web'
    })
    return res.status(200).json({ ok: true, task: toPublicTask(task) })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
