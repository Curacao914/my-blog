const REST_PATH = '/rest/v1'

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase service credentials are not configured')
  return { url: url.replace(/\/$/, ''), key }
}

function headers(extra = {}) {
  const { key } = getSupabaseConfig()
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
    ...extra
  }
}

export async function supabaseRest(path, options = {}) {
  const { url } = getSupabaseConfig()
  const response = await fetch(`${url}${REST_PATH}${path}`, {
    ...options,
    headers: headers(options.headers)
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || response.statusText)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

const noteSelect = 'id,title,body_markdown,note_type,status,metadata,created_at,updated_at'

export async function ensureProfile({ clerkUserId }) {
  const safeUserId = clerkUserId || 'local-dev'
  const existing = await supabaseRest(
    `/profiles?select=id,clerk_user_id&clerk_user_id=${eq(safeUserId)}&limit=1`
  )
  if (existing?.[0]) return { profile: existing[0] }

  const created = await supabaseRest('/profiles?select=id,clerk_user_id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ clerk_user_id: safeUserId, role: 'owner' })
  })
  return { profile: created[0] }
}

export async function listScheduleRows(ownerId) {
  return supabaseRest(
    `/schedule_items?select=*&owner_id=${eq(ownerId)}&order=created_at.asc`
  )
}

export async function deleteScheduleRows(ownerId, ids = []) {
  if (!ids.length) return []
  return supabaseRest(
    `/schedule_items?owner_id=${eq(ownerId)}&id=in.(${ids.map(encodeURIComponent).join(',')})`,
    { method: 'DELETE' }
  )
}

export async function upsertScheduleRows(rows = []) {
  if (!rows.length) return []
  return supabaseRest('/schedule_items?on_conflict=id&select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows)
  })
}

export async function findScheduleRow(ownerId, id) {
  const rows = await supabaseRest(
    `/schedule_items?select=*&owner_id=${eq(ownerId)}&id=${eq(id)}&limit=1`
  )
  return rows?.[0] || null
}

export async function listNotes(ownerId, options = {}) {
  const filters = typeof options === 'string' ? { scheduleItemId: options } : options
  const params = [`select=${noteSelect}`, `owner_id=${eq(ownerId)}`]
  if (filters.id) params.push(`id=${eq(filters.id)}`)
  if (filters.status) params.push(`status=${eq(filters.status)}`)
  if (filters.activeOnly !== false && !filters.status) params.push('status=neq.archived')
  if (filters.scheduleItemId) {
    params.push(`metadata=cs.${encodeURIComponent(JSON.stringify({ scheduleItemId: filters.scheduleItemId }))}`)
  }
  if (filters.sourceReadingId) {
    params.push(`metadata=cs.${encodeURIComponent(JSON.stringify({ sourceReadingId: filters.sourceReadingId }))}`)
  }
  params.push('order=updated_at.desc')
  params.push(`limit=${filters.limit || (filters.scheduleItemId || filters.sourceReadingId || filters.id ? 1 : 60)}`)
  return supabaseRest(
    `/notes?${params.join('&')}`
  )
}

export async function findNote(ownerId, id) {
  const rows = await listNotes(ownerId, { id, activeOnly: false, limit: 1 })
  return rows?.[0] || null
}

export async function upsertNote(ownerId, payload, existingId) {
  if (existingId) {
    const rows = await supabaseRest(
      `/notes?id=${eq(existingId)}&owner_id=${eq(ownerId)}&select=${noteSelect}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      }
    )
    return rows?.[0]
  }

  const rows = await supabaseRest(
    `/notes?select=${noteSelect}`,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...payload, owner_id: ownerId })
    }
  )
  return rows?.[0]
}

export async function updateNote(ownerId, id, patch) {
  const rows = await supabaseRest(
    `/notes?id=${eq(id)}&owner_id=${eq(ownerId)}&select=${noteSelect}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
    }
  )
  return rows?.[0] || null
}

export async function deleteNote(ownerId, id) {
  return supabaseRest(
    `/notes?id=${eq(id)}&owner_id=${eq(ownerId)}`,
    { method: 'DELETE' }
  )
}

export async function listPendingReminders({ windowEnd, limit = 20 }) {
  return supabaseRest(
    `/reminders?select=*&status=eq.pending&remind_at=lte.${encodeURIComponent(windowEnd)}&order=remind_at.asc&limit=${Math.min(Number(limit) || 20, 50)}`
  )
}

export async function findPendingReminder(ownerId, scheduleItemId) {
  const rows = await supabaseRest(
    `/reminders?select=id,status&owner_id=${eq(ownerId)}&schedule_item_id=${eq(scheduleItemId)}&status=eq.pending&limit=1`
  )
  return rows?.[0] || null
}

export async function insertReminder(row) {
  const rows = await supabaseRest('/reminders?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row)
  })
  return rows?.[0] || null
}

export async function updateReminder(id, patch, query = '') {
  return supabaseRest(`/reminders?id=${eq(id)}${query}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch)
  })
}

export async function cancelPendingReminders(ownerId, scheduleItemId) {
  return supabaseRest(
    `/reminders?owner_id=${eq(ownerId)}&schedule_item_id=${eq(scheduleItemId)}&status=eq.pending`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() })
    }
  )
}

export async function insertReminderEvent(reminderId, eventType, message, metadata = {}) {
  if (!reminderId) return null
  return supabaseRest('/reminder_events', {
    method: 'POST',
    body: JSON.stringify({
      reminder_id: reminderId,
      event_type: eventType,
      message,
      metadata
    })
  })
}

export async function getReminderPreferences(ownerId) {
  const rows = await supabaseRest(
    `/reminder_preferences?select=*&owner_id=${eq(ownerId)}&limit=1`
  )
  return rows?.[0] || null
}

export async function listConfiguredReminderPreferences() {
  return supabaseRest(
    '/reminder_preferences?select=*&email=not.is.null'
  )
}

// Backward-compatible alias for callers prepared before disabled preferences
// needed to suppress the legacy REMINDER_TO fallback.
export const listEnabledReminderPreferences = listConfiguredReminderPreferences

export async function upsertReminderPreferences(ownerId, patch = {}) {
  const rows = await supabaseRest('/reminder_preferences?on_conflict=owner_id&select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      owner_id: ownerId,
      ...patch,
      updated_at: new Date().toISOString()
    })
  })
  return rows?.[0] || null
}
