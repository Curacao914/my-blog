import crypto from 'crypto'

import { acknowledgeMessageDelivery } from '@/lib/server/messageDeliveries'

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
    process.env.TASK_CAPTURE_TOKEN
  ].filter(Boolean).some(expected => safeEqual(received, expected))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  }

  try {
    const id = String(req.query?.id || '')
    const requested = String(req.body?.status || '')
    const status = requested === 'sent'
      ? 'sent'
      : req.body?.retryable === false
        ? 'failed'
        : 'pending'
    const row = await acknowledgeMessageDelivery(id, {
      status,
      externalId: String(req.body?.externalId || ''),
      error: String(req.body?.error || ''),
      metadata: req.body?.metadata || {}
    })
    return res.status(200).json({ ok: true, delivery: row })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'ACK_FAILED'
    })
  }
}
