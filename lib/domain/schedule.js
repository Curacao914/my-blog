export function toDbScheduleItem(item, ownerId) {
  const row = {
    id: item.id?.match(/^[0-9a-f-]{36}$/i) ? item.id : undefined,
    owner_id: ownerId,
    title: item.title || '未命名事项',
    section: item.section || '其他',
    section_key: item.sectionKey || item.section_key || '',
    tone: item.tone || '',
    schedule_date: item.date || item.schedule_date || 'today',
    time_label: item.time || item.time_label || '',
    place: item.place || '',
    priority: item.priority || 'normal',
    status: item.status || 'active',
    links: item.links || [],
    children: item.children || [],
    summary: item.summary || '',
    note: item.note || '',
    source: item.source || 'web',
    ai_trace: item.ai_trace || item.aiTrace || (item.reminder ? { reminder: item.reminder } : {})
  }
  if (!row.id) delete row.id
  return row
}

export function fromDbScheduleItem(row) {
  return {
    id: row.id,
    title: row.title,
    section: row.section || '其他',
    sectionKey: row.section_key || '',
    tone: row.tone || '',
    date: row.schedule_date || 'today',
    time: row.time_label || '',
    place: row.place || '',
    priority: row.priority || 'normal',
    status: row.status || 'active',
    links: row.links || [],
    children: row.children || [],
    summary: row.summary || '',
    note: row.note || '',
    source: row.source || 'web',
    reminder: row.ai_trace?.reminder,
    aiTrace: row.ai_trace || {}
  }
}
