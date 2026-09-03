import crypto from 'crypto'

export const IMPERSONATION_COOKIE = 'law_tech_impersonation'
const MAX_AGE_SECONDS = 8 * 60 * 60

function signingSecret() {
  return String(
    process.env.WORKSPACE_SESSION_SECRET ||
    process.env.IMPERSONATION_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    ''
  )
}

function sign(value) {
  const secret = signingSecret()
  if (!secret) return ''
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b)
}

function parseCookies(value = '') {
  return String(value || '').split(';').reduce((cookies, part) => {
    const index = part.indexOf('=')
    if (index < 0) return cookies
    const key = part.slice(0, index).trim()
    const raw = part.slice(index + 1).trim()
    if (key) cookies[key] = decodeURIComponent(raw)
    return cookies
  }, {})
}

export function createImpersonationToken({ actorClerkUserId, targetProfileId, now = Date.now() }) {
  const payload = Buffer.from(JSON.stringify({
    actor: String(actorClerkUserId || ''),
    target: String(targetProfileId || ''),
    exp: now + MAX_AGE_SECONDS * 1000
  })).toString('base64url')
  const signature = sign(payload)
  if (!payload || !signature) return ''
  return `${payload}.${signature}`
}

export function readImpersonation(req, actorClerkUserId, now = Date.now()) {
  const token = parseCookies(req?.headers?.cookie || '')[IMPERSONATION_COOKIE]
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (parsed.actor !== String(actorClerkUserId || '')) return null
    if (!parsed.target || Number(parsed.exp || 0) <= now) return null
    return { targetProfileId: parsed.target, expiresAt: Number(parsed.exp) }
  } catch {
    return null
  }
}

export function setImpersonationCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
  const parts = [
    `${IMPERSONATION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax'
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearImpersonationCookie(res) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
  const parts = [
    `${IMPERSONATION_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax'
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}
