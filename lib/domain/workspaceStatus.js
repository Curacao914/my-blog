function concreteDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : ''
}

function localDateKey(date = new Date(), timeZone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function summarizeWorkspaceStatus(items = [], notes = [], now = new Date()) {
  const todayKey = localDateKey(now)
  const activeItems = items.filter(item => item?.status !== 'done' && item?.status !== 'cancelled' && item?.status !== 'archived')
  const actionable = activeItems.filter(item => item?.contentType !== 'reading')
  const today = actionable.filter(item => {
    const date = String(item?.date || '')
    return date === 'today' || concreteDate(date) === todayKey
  }).length
  const active = actionable.length
  const drafts = notes.filter(note => note?.status !== 'archived').length

  return { today, active, drafts }
}
