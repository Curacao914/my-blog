import crypto from 'crypto'

import { claimNextMessageDelivery } from '@/lib/server/messageDeliveries'

function token(req) {
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
  const received = token(req)
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
    const workerId = String(req.body?.workerId || 'wechat-relay').slice(0, 120)
    const row = await claimNextMessageDelivery(workerId)
    return res.status(200).json({ ok: true, delivery: row })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'CLAIM_FAILED'
    })
  }
}
