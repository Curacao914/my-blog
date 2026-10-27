import { createHmac, randomUUID } from 'node:crypto'
import { getWorkspaceSession } from '@/lib/auth/serverAdmin'

// Keep the destination fixed: the signed ticket is consumed only by Course.
const COURSE_ORIGIN = 'https://course.law-tech.dev'
const SITE_ORIGIN = 'https://law-tech.dev'
const TICKET_TTL_SECONDS = 60

export function safeCoursePath(value) {
  const candidate = typeof value === 'string' ? value : '/'
  if (!/^\/(?!\/)/.test(candidate) || /[\\\u0000-\u0020\u007f]/.test(candidate)) return '/'
  try {
    const decoded = decodeURIComponent(candidate)
    return /^\/(?!\/)/.test(decoded) && !/[\\\u0000-\u0020\u007f]/.test(decoded)
      ? candidate : '/'
  } catch {
    return '/'
  }
}

export function makeCourseTicket({ id, role, email, next, key, now = Date.now(), nonce = randomUUID() }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id)) ||
      !['owner', 'member'].includes(role) || typeof key !== 'string' || key.length < 32) {
    throw new Error('INVALID_COURSE_SSO_CONFIGURATION')
  }
  const iat = Math.floor(now / 1000)
  const payload = {
    v: 1,
    sub: id,
    role,
    email: String(email || ''),
    iat,
    exp: iat + TICKET_TTL_SECONDS,
    nonce,
    next: safeCoursePath(next)
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', key).update('course-sso-v1.' + body).digest('base64url')
  return body + '.' + signature
}

export default async function courseSso(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const next = safeCoursePath(req.query?.next)
  const jsonMode = req.query?.response === 'json'
  let session
  try {
    session = await getWorkspaceSession(req, { ignoreImpersonation: true })
  } catch {
    return res.status(503).json({ error: 'identity_unavailable' })
  }

  if (!session?.ok) {
    if (session?.code === 'handshake' && session.redirectUrl) {
      if (jsonMode) return res.status(401).json({ error: 'handshake_required' })
      return res.redirect(302, session.redirectUrl)
    }
    if (session?.code === 'signed_out') {
      if (jsonMode) return res.status(401).json({ error: 'signed_out' })
      return res.redirect(302, SITE_ORIGIN + '/course/connect?next=' + encodeURIComponent(next))
    }
    return res.status(session?.status || 403).json({ error: session?.code || 'access_denied' })
  }

  // The private Course store uses profiles.id, not Clerk user IDs.
  const profile = session.actorProfile
  if (profile?.status !== 'active' || !['owner', 'member'].includes(profile?.role)) {
    return res.status(403).json({ error: 'course_access_denied' })
  }
  const key = process.env.COURSE_CONTROL_SIGNING_KEY
  if (!key || key.length < 32) {
    return res.status(503).json({ error: 'course_sso_unavailable' })
  }

  let token
  try {
    token = makeCourseTicket({
      id: profile.id,
      role: profile.role,
      email: profile.email,
      next,
      key
    })
  } catch {
    return res.status(503).json({ error: 'course_sso_unavailable' })
  }
  const destination = COURSE_ORIGIN + '/_auth/callback?token=' + encodeURIComponent(token)
  if (jsonMode) return res.status(200).json({ redirect: destination })
  return res.redirect(302, destination)
}
