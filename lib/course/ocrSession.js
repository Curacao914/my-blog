import crypto from 'crypto'

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

export function createOcrUploadToken({ subject = 'desk-user', maxBytes = 100 * 1024 * 1024, ttlSeconds = 15 * 60 } = {}) {
  const secret = String(process.env.LAW_TECH_OCR_SIGNING_SECRET || '').trim()
  if (!secret) throw new Error('LAW_TECH_OCR_SIGNING_SECRET is not configured')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    scope: 'ocr-upload',
    sub: subject,
    maxBytes,
    iat: now,
    exp: now + ttlSeconds,
    nonce: crypto.randomBytes(12).toString('hex')
  }
  const body = base64url(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function getOcrServiceUrl() {
  return String(process.env.OCR_SERVICE_URL || '').trim().replace(/\/$/, '')
}
