export async function syncRemindersForScheduleItems() {
  return { ok: true, warnings: [] }
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

export async function markReminderEvent() {}
