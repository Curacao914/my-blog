import crypto from 'crypto'

import { clerkClient, getAuth } from '@clerk/nextjs/server'

import { hasAdminAllowlist, isAdminUser } from '@/lib/auth/admin'

function getEmailFromClaims(claims) {
  return (
    claims?.email ||
    claims?.primary_email ||
    claims?.email_address ||
    claims?.primaryEmailAddress?.emailAddress ||
    ''
  )
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))

  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function hasValidCaptureToken(req) {
  const expected = process.env.TASK_CAPTURE_TOKEN
  if (!expected) return false

  const headerToken =
    req.headers['x-law-tech-capture-token'] ||
    req.headers['x-capture-token'] ||
    ''
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  return safeEqual(headerToken, expected) || safeEqual(bearerToken, expected)
}

export function hasValidReminderToken(req) {
  const expected = process.env.TASK_REMINDER_TOKEN
  if (!expected) return false

  const headerToken =
    req.headers['x-law-tech-reminder-token'] ||
    req.headers['x-reminder-token'] ||
    ''
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  return safeEqual(headerToken, expected) || safeEqual(bearerToken, expected)
}

export async function getAdminCandidate(req) {
  const auth = getAuth(req)
  let email = getEmailFromClaims(auth.sessionClaims)

  if (auth.userId && !email) {
    const user = await clerkClient().users.getUser(auth.userId)
    email =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      ''
  }

  return {
    userId: auth.userId,
    user: {
      id: auth.userId,
      email
    }
  }
}

export async function requireAdminRequest(req, options = {}) {
  if (options.allowCaptureToken && hasValidCaptureToken(req)) {
    return { ok: true, via: 'capture-token' }
  }

  if (options.allowReminderToken && hasValidReminderToken(req)) {
    return { ok: true, via: 'reminder-token' }
  }

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return { ok: true, via: 'local-dev' }
  }

  const { userId, user } = await getAdminCandidate(req)

  if (!userId) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  if (hasAdminAllowlist() && !isAdminUser(user)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return { ok: true, via: 'clerk' }
}
