import crypto from 'crypto'

import { fromDbScheduleItem } from '@/lib/domain/schedule'
import {
  enqueueMessageDelivery,
  listWechatIntegrations,
  publicWechatPreference,
  wechatLocalState
} from '@/lib/server/messageDeliveries'
import { listScheduleRows } from '@/lib/server/supabase'
import { buildWechatScheduleDigest } from '@/lib/server/wechatDigest'

function readToken(req) {
  const authorization = String(req.headers.authorization || '')
  if (/^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '')
  }
  return String(
    req.headers['x-law-tech-wechat-token'] ||
    req.headers['x-law-tech-capture-token'] ||
    ''
  )
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b)
}

function authorized(req) {
  const received = readToken(req)
  return [
    process.env.WECHAT_CAPTURE_TOKEN,
    process.env.TASK_CAPTURE_TOKEN,
    process.env.CRON_SECRET
  ].filter(Boolean).some(expected => safeEqual(received, expected))
}

function minute(value = '00:00') {
  const [hour = 0, minuteValue = 0] = String(value).split(':').map(Number)
  return hour * 60 + minuteValue
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  }

  const now = req.query?.now ? new Date(String(req.query.now)) : new Date()
  if (Number.isNaN(now.getTime())) {
    return res.status(400).json({ ok: false, error: 'Invalid now value' })
  }

  try {
    const integrations = await listWechatIntegrations()
    const results = []

    for (const record of integrations || []) {
      const preference = publicWechatPreference(record)
      if (!preference.enabled || !preference.dailyScheduleEnabled) continue

      const local = wechatLocalState(now, preference.timezone)
      if (local.minute < minute(preference.dailyTime)) continue

      const items = (await listScheduleRows(record.owner_id) || []).map(fromDbScheduleItem)
      const digest = buildWechatScheduleDigest({
        items,
        now,
        timezone: preference.timezone,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://law-tech.dev'
      })
      const queued = await enqueueMessageDelivery({
        ownerId: record.owner_id,
        purpose: 'daily-schedule',
        dedupeKey: `daily-schedule:${digest.dateKey}`,
        subject: `${digest.dateKey} · 今日安排`,
        bodyText: digest.bodyText,
        objectType: 'schedule-digest',
        objectId: digest.dateKey,
        objectUrl: '/desk/today',
        scheduledFor: now.toISOString(),
        metadata: {
          timezone: preference.timezone,
          configuredTime: preference.dailyTime
        }
      })
      results.push({
        ownerId: record.owner_id,
        created: queued.created,
        deliveryId: queued.row?.id || null
      })
    }

    return res.status(200).json({
      ok: true,
      checkedAt: now.toISOString(),
      count: results.length,
      results
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'PREPARE_FAILED'
    })
  }
}
