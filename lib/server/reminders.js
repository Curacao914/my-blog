import { buildReminderForItem, shouldCancelRemindersForItem } from '@/lib/domain/reminders'
import {
  cancelPendingReminders,
  findPendingReminder,
  insertReminder,
  insertReminderEvent,
  updateReminder
} from '@/lib/server/supabase'
import { syncScheduleReminderDeliveries } from '@/lib/server/scheduleReminderDeliveries'

function isMissingReminderTable(error) {
  return error?.data?.code === '42P01' || /relation .*reminders.* does not exist/i.test(error?.message || '')
}

async function logReminderEvent(reminderId, eventType, message, metadata = {}) {
  try {
    await insertReminderEvent(reminderId, eventType, message, metadata)
  } catch (error) {
    if (!isMissingReminderTable(error)) console.warn('[reminders] event log failed', error.message)
  }
}

export async function syncRemindersForScheduleItems({ ownerId, items }) {
  const warnings = []
  for (const item of items || []) {
    if (!item?.id) continue

    try {
      const deliveryResult = await syncScheduleReminderDeliveries({
        ownerId,
        item
      })
      if (!deliveryResult.ok) warnings.push('WECHAT_REMINDER_QUEUE_FAILED')

      if (shouldCancelRemindersForItem(item)) {
        try {
          await cancelPendingReminders(ownerId, item.id)
        } catch (error) {
          if (!isMissingReminderTable(error)) throw error
        }
        continue
      }

      const reminder = buildReminderForItem(item, ownerId)
      if (!reminder) continue
      if (reminder.channel === 'wechat') {
        try {
          await cancelPendingReminders(ownerId, item.id)
        } catch (error) {
          if (!isMissingReminderTable(error)) throw error
        }
        continue
      }

      const existing = await findPendingReminder(ownerId, item.id)
      if (existing?.id) {
        await updateReminder(existing.id, {
          ...reminder,
          attempts: 0,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        continue
      }

      const created = await insertReminder(reminder)
      await logReminderEvent(created?.id, 'created', 'reminder created', { scheduleItemId: item.id })
    } catch (error) {
      if (isMissingReminderTable(error)) warnings.push('REMINDER_TABLE_MISSING')
      else warnings.push(error.message)
    }
  }
  return { ok: warnings.length === 0, warnings: [...new Set(warnings)] }
}

export function formatReminderEmail(reminder) {
  const payload = reminder?.payload || {}
  const title = payload.title || 'Law-Tech 提醒'
  const when = [payload.date, payload.time].filter(Boolean).join(' ')
  return {
    subject: `提醒：${title}`,
    text: [title, when, payload.place, payload.summary].filter(Boolean).join('\n\n'),
    html: `<p>${[title, when, payload.place, payload.summary].filter(Boolean).join('<br />')}</p>`
  }
}

export async function markReminderEvent({ reminder, eventType, message, metadata }) {
  await logReminderEvent(reminder?.id, eventType, message, metadata)
}
