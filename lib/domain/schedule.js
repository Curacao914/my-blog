export function toDbScheduleItem(item, ownerId) {
  const aiTrace = {
    ...(item.ai_trace || item.aiTrace || {}),
    ...(item.reminder ? { reminder: item.reminder } : {}),
    contentType: item.contentType || item.content_type || item.aiTrace?.contentType || 'action',
    importance: item.importance || item.aiTrace?.importance || (item.priority === 'high' ? 'important' : 'normal'),
    urgency: item.urgency || item.aiTrace?.urgency || 'not_urgent',
    isPinned: Boolean(item.isPinned || item.aiTrace?.isPinned),
    prioritySource: item.prioritySource || item.aiTrace?.prioritySource || 'ai',
    importanceSource: item.importanceSource || item.aiTrace?.importanceSource || 'ai',
    urgencySource: item.urgencySource || item.aiTrace?.urgencySource || 'ai'
  }
  if (item.captureKey || item.aiTrace?.captureKey) aiTrace.captureKey = item.captureKey || item.aiTrace.captureKey

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
    ai_trace: aiTrace
  }
  if (!row.id) delete row.id
  return row
}

export function fromDbScheduleItem(row) {
  const aiTrace = row.ai_trace || {}
  const contentType =
    aiTrace.contentType ||
    row.content_type ||
    (row.section_key === 'reading' || row.section === '阅读' || row.schedule_date === 'reading' ? 'reading' : 'action')

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
    contentType,
    importance: row.importance || aiTrace.importance || (row.priority === 'high' ? 'important' : 'normal'),
    urgency: row.urgency || aiTrace.urgency || 'not_urgent',
    isPinned: Boolean(row.is_pinned || aiTrace.isPinned),
    prioritySource: row.priority_source || aiTrace.prioritySource || 'ai',
    importanceSource: row.importance_source || aiTrace.importanceSource || 'ai',
    urgencySource: row.urgency_source || aiTrace.urgencySource || 'ai',
    captureKey: aiTrace.captureKey || '',
    aiTrace
  }
}
