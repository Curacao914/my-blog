import { supabaseRest } from '@/lib/server/supabase'

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

const select =
  'id,owner_id,channel,purpose,dedupe_key,target_key,subject,body_text,object_type,object_id,object_url,status,scheduled_for,claimed_at,claimed_by,attempts,external_id,last_error,metadata,created_at,updated_at,sent_at'

export async function enqueueMessageDelivery({
  ownerId,
  channel = 'wechat',
  purpose,
  dedupeKey,
  targetKey = '',
  subject = '',
  bodyText,
  objectType = '',
  objectId = '',
  objectUrl = '',
  scheduledFor = new Date().toISOString(),
  metadata = {}
}) {
  if (!ownerId || !purpose || !dedupeKey || !bodyText) {
    throw new Error('Message delivery payload is incomplete')
  }

  const rows = await supabaseRest(
    `/message_deliveries?on_conflict=owner_id,channel,dedupe_key&select=${select}`,
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=ignore-duplicates,return=representation'
      },
      body: JSON.stringify({
        owner_id: ownerId,
        channel,
        purpose,
        dedupe_key: dedupeKey,
        target_key: targetKey || null,
        subject: subject || null,
        body_text: bodyText,
        object_type: objectType || null,
        object_id: objectId || null,
        object_url: objectUrl || null,
        status: 'pending',
        scheduled_for: scheduledFor,
        metadata
      })
    }
  )

  if (rows?.[0]) return { row: rows[0], created: true }

  const existing = await supabaseRest(
    `/message_deliveries?select=${select}&owner_id=${eq(ownerId)}&channel=${eq(channel)}&dedupe_key=${eq(dedupeKey)}&limit=1`
  )
  return { row: existing?.[0] || null, created: false }
}

export async function listMessageDeliveriesForObject({
  ownerId,
  purpose,
  objectType,
  objectId,
  limit = 100
}) {
  const params = [
    `select=${select}`,
    `owner_id=${eq(ownerId)}`,
    `purpose=${eq(purpose)}`,
    `object_type=${eq(objectType)}`,
    `object_id=${eq(objectId)}`,
    'order=scheduled_for.asc,created_at.asc',
    `limit=${Math.min(Math.max(Number(limit) || 100, 1), 200)}`
  ]
  return supabaseRest(`/message_deliveries?${params.join('&')}`)
}

export async function cancelMessageDeliveries(ids = [], reason = 'cancelled') {
  const rows = []
  for (const id of ids || []) {
    const updated = await supabaseRest(
      `/message_deliveries?id=${eq(id)}&status=in.(pending,claimed)&select=${select}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'cancelled',
          last_error: reason || null,
          updated_at: new Date().toISOString()
        })
      }
    )
    if (updated?.[0]) rows.push(updated[0])
  }
  return rows
}

export async function reviveMessageDelivery(id, payload = {}) {
  const rows = await supabaseRest(
    `/message_deliveries?id=${eq(id)}&status=in.(cancelled,failed)&select=${select}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        purpose: payload.purpose,
        target_key: payload.targetKey || null,
        subject: payload.subject || null,
        body_text: payload.bodyText,
        object_type: payload.objectType || null,
        object_id: payload.objectId || null,
        object_url: payload.objectUrl || null,
        status: 'pending',
        scheduled_for: payload.scheduledFor || new Date().toISOString(),
        claimed_at: null,
        claimed_by: null,
        attempts: 0,
        external_id: null,
        last_error: null,
        metadata: payload.metadata || {},
        sent_at: null,
        updated_at: new Date().toISOString()
      })
    }
  )
  return rows?.[0] || null
}

async function recoverStaleClaims() {
  const threshold = new Date(Date.now() - 5 * 60_000).toISOString()
  const rows = await supabaseRest(
    `/message_deliveries?select=${select}&channel=eq.wechat&status=eq.claimed&claimed_at=lt.${encodeURIComponent(threshold)}&order=claimed_at.asc&limit=20`
  )
  for (const row of rows || []) {
    await supabaseRest(`/message_deliveries?id=${eq(row.id)}&status=eq.claimed`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: Number(row.attempts || 0) >= 3 ? 'failed' : 'pending',
        claimed_at: null,
        claimed_by: null,
        last_error: 'stale relay claim recovered',
        updated_at: new Date().toISOString()
      })
    })
  }
}

function expiredDelivery(row, now = Date.now()) {
  if (row?.purpose !== 'schedule-reminder') return false
  const explicit = Date.parse(row.metadata?.expiresAt || '')
  const fallback = Date.parse(row.scheduled_for || '') + 10 * 60_000
  const expiry = Number.isFinite(explicit) ? explicit : fallback
  return Number.isFinite(expiry) && now > expiry
}

export async function prunePendingWechatTests(ownerId = '') {
  const ownerFilter = ownerId ? `&owner_id=${eq(ownerId)}` : ''
  const rows = await supabaseRest(
    `/message_deliveries?select=${select}&channel=eq.wechat&purpose=eq.wechat-test&status=eq.pending${ownerFilter}&order=created_at.desc&limit=100`
  )
  const newestByOwner = new Set()
  const stale = []
  for (const row of rows || []) {
    if (!newestByOwner.has(row.owner_id)) {
      newestByOwner.add(row.owner_id)
    } else {
      stale.push(row.id)
    }
  }
  for (const id of stale) {
    await supabaseRest(`/message_deliveries?id=${eq(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'cancelled',
        last_error: 'superseded by a newer channel test',
        updated_at: new Date().toISOString()
      })
    })
  }
  return stale.length
}

export async function getMessageDeliveryByDedupe(
  ownerId,
  channel,
  dedupeKey
) {
  const rows = await supabaseRest(
    `/message_deliveries?select=${select}&owner_id=${eq(ownerId)}&channel=${eq(channel)}&dedupe_key=${eq(dedupeKey)}&limit=1`
  )
  return rows?.[0] || null
}

export async function getMessageDeliveryForOwner(id, ownerId) {
  const rows = await supabaseRest(
    `/message_deliveries?select=${select}&id=${eq(id)}&owner_id=${eq(ownerId)}&limit=1`
  )
  return rows?.[0] || null
}

export async function claimNextMessageDelivery(workerId = 'wechat-relay') {
  await recoverStaleClaims()
  await prunePendingWechatTests()
  const nowDate = new Date()
  const now = nowDate.toISOString()
  const pending = await supabaseRest(
    `/message_deliveries?select=${select}&channel=eq.wechat&status=eq.pending&scheduled_for=lte.${encodeURIComponent(now)}&order=scheduled_for.asc,created_at.asc&limit=5`
  )

  for (const candidate of pending || []) {
    if (expiredDelivery(candidate, nowDate.getTime())) {
      await cancelMessageDeliveries(
        [candidate.id],
        'schedule reminder expired before relay delivery'
      )
      continue
    }
    const rows = await supabaseRest(
      `/message_deliveries?id=${eq(candidate.id)}&status=eq.pending&select=${select}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'claimed',
          claimed_at: now,
          claimed_by: workerId,
          attempts: Number(candidate.attempts || 0) + 1,
          updated_at: now
        })
      }
    )
    if (rows?.[0]) return rows[0]
  }
  return null
}

export async function acknowledgeMessageDelivery(id, {
  status,
  externalId = '',
  error = '',
  metadata = {}
}) {
  if (!['sent', 'failed', 'pending'].includes(status)) {
    throw new Error('Invalid delivery acknowledgement')
  }
  const now = new Date().toISOString()
  const rows = await supabaseRest(
    `/message_deliveries?id=${eq(id)}&select=${select}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status,
        external_id: externalId || null,
        last_error: error || null,
        sent_at: status === 'sent' ? now : null,
        claimed_at: status === 'pending' ? null : undefined,
        claimed_by: status === 'pending' ? null : undefined,
        metadata,
        updated_at: now
      })
    }
  )
  return rows?.[0] || null
}

export async function listWechatIntegrations() {
  return supabaseRest(
    '/user_integrations?select=id,owner_id,provider,enabled,config,updated_at&provider=eq.wechat-openclaw&enabled=eq.true'
  )
}

export async function getWechatIntegration(ownerId) {
  const rows = await supabaseRest(
    `/user_integrations?select=id,owner_id,provider,enabled,config,updated_at&owner_id=${eq(ownerId)}&provider=eq.wechat-openclaw&limit=1`
  )
  return rows?.[0] || null
}

export function publicWechatPreference(record = {}) {
  const config = record?.config || {}
  const lastSeenAt = config.relayLastSeenAt || null
  const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : 0
  return {
    configured: Boolean(record),
    enabled: Boolean(record) && record?.enabled !== false,
    dailyScheduleEnabled: config.dailyScheduleEnabled !== false,
    dailyTime: config.dailyTime || '09:00',
    courseBriefEnabled: config.courseBriefEnabled !== false,
    courseBriefDelivery: ['immediate', 'scheduled'].includes(config.courseBriefDelivery)
      ? config.courseBriefDelivery
      : 'scheduled',
    courseBriefTime: config.courseBriefTime || '20:30',
    timezone: config.timezone || 'Asia/Shanghai',
    relayOnline: Boolean(
      lastSeenMs &&
      Date.now() - lastSeenMs < 10 * 60 * 1000
    ),
    relayLastSeenAt: lastSeenAt,
    relayCurrentModel: config.relayCurrentModel || '',
    relayWorkerId: config.relayWorkerId || '',
    lastUpdatedAt: record?.updated_at || null
  }
}

function localClock(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value])
  )
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    minute: Number(values.hour) * 60 + Number(values.minute)
  }
}

function clockMinute(value = '00:00') {
  const match = String(value).match(/^(\d{2}):(\d{2})$/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0
}

export function nextWechatDeliveryTime({
  mode = 'scheduled',
  time = '20:30',
  timezone = 'Asia/Shanghai',
  now = new Date()
} = {}) {
  if (mode === 'immediate') return now.toISOString()
  const target = clockMinute(time)
  const rounded = new Date(now.getTime())
  rounded.setUTCSeconds(0, 0)
  for (let offset = 0; offset <= 48 * 60; offset += 1) {
    const candidate = new Date(rounded.getTime() + offset * 60_000)
    if (localClock(candidate, timezone).minute === target) {
      if (candidate.getTime() >= now.getTime()) return candidate.toISOString()
    }
  }
  return now.toISOString()
}

export function wechatLocalState(now, timezone = 'Asia/Shanghai') {
  return localClock(now, timezone)
}
