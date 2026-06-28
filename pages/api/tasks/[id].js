import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { toPublicTask } from '@/lib/taskInboxAdapters'
import { updateTask } from '@/lib/tasksRepository'

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'schedule' })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const task = await updateTask(auth.profile.id, req.query.id, req.body || {})
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' })
    return res.status(200).json({ ok: true, task: toPublicTask(task) })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Invalid request' })
  }
}
