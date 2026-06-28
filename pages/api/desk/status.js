import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { fromDbScheduleItem } from '@/lib/domain/schedule'
import { summarizeWorkspaceStatus } from '@/lib/domain/workspaceStatus'
import { ensureProfile, listNotes, listScheduleRows } from '@/lib/server/supabase'

function ownerUserId(auth) {
  return (
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.WECHAT_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    auth.userId ||
    (auth.via === 'local-dev' ? 'local-dev' : '')
  )
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  const userId = ownerUserId(auth)
  if (!userId) return res.status(500).json({ ok: false, error: 'No schedule owner configured' })

  try {
    const { profile } = await ensureProfile({ clerkUserId: userId })
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
