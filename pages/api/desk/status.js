import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { fromDbScheduleItem } from '@/lib/domain/schedule'
import { summarizeWorkspaceStatus } from '@/lib/domain/workspaceStatus'
import { listNotes, listScheduleRows } from '@/lib/server/supabase'


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireWorkspaceRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  const profile = auth.profile

  try {
    const [rows, notes] = await Promise.all([
      listScheduleRows(profile.id),
      listNotes(profile.id, { activeOnly: true, limit: 100 })
    ])
    const items = (rows || []).map(fromDbScheduleItem)
    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return res.status(200).json({ ok: true, status: summarizeWorkspaceStatus(items, notes || []) })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Workspace status failed'
    })
  }
}
