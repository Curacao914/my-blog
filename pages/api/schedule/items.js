import { fromDbScheduleItem, toDbScheduleItem } from '@/lib/domain/schedule'
import {
  deleteScheduleRows,
  ensureProfile,
  listScheduleRows,
  upsertScheduleRows
} from '@/lib/server/supabase'
import { syncRemindersForScheduleItems } from '@/lib/server/reminders'
import { getScheduleOwnerUserId } from '@/lib/auth/scheduleOwner'

export default async function handler(req, res) {
  const userId = await getScheduleOwnerUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { profile } = await ensureProfile({ clerkUserId: userId })

    if (req.method === 'GET') {
      const rows = await listScheduleRows(profile.id)
      return res.status(200).json({ items: (rows || []).map(fromDbScheduleItem) })
    }

    if (req.method === 'PUT') {
      const items = Array.isArray(req.body?.items) ? req.body.items : []
      const deletedIds = Array.isArray(req.body?.deletedIds)
        ? req.body.deletedIds.filter(id => /^[0-9a-f-]{36}$/i.test(id))
        : []

      await deleteScheduleRows(profile.id, deletedIds)
      if (items.length) {
        const savedRows = await upsertScheduleRows(items.map(item => toDbScheduleItem(item, profile.id)))
        await syncRemindersForScheduleItems({
          ownerId: profile.id,
          items: (savedRows || []).map(fromDbScheduleItem)
        })
      }

      const rows = await listScheduleRows(profile.id)
      return res.status(200).json({ items: (rows || []).map(fromDbScheduleItem) })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error instanceof Error ? error.message : 'Schedule request failed'
    })
  }
}
