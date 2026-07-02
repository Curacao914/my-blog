import crypto from 'crypto'

import { clerkClient } from '@clerk/nextjs/server'

import { hasAdminAllowlist, isAdminUser } from '@/lib/auth/admin'
import { authenticateClerkRequest } from '@/lib/auth/clerkRequest'
import { readImpersonation } from '@/lib/auth/impersonation'
import { profileCan, publicWorkspaceProfile } from '@/lib/auth/permissions'
import {
  ensureWorkspaceProfile,
  getWorkspaceProfileById
} from '@/lib/server/workspaceProfiles'

function getEmailFromClaims(claims) {
  return claims?.email || claims?.primary_email || claims?.email_address || claims?.primaryEmailAddress?.emailAddress || ''
}

function displayNameFromUser(user = {}) {
  return String(
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    ''
  ).trim()
}

function primaryEmailFromUser(user = {}) {
  return user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || ''
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function isClerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)
}

export function isHostedEnvironment() {
  return Boolean(process.env.VERCEL || ['preview', 'production'].includes(process.env.VERCEL_ENV || ''))
}

export function allowLocalDeskFallback() {
  if (process.env.NODE_ENV === 'test') return true
  return !isHostedEnvironment() && process.env.NODE_ENV !== 'production' && process.env.ALLOW_LOCAL_DESK_FALLBACK === 'true'
}

export function hasValidCaptureToken(req) {
  const accepted = [process.env.TASK_CAPTURE_TOKEN, process.env.WECHAT_CAPTURE_TOKEN].filter(Boolean)
  if (!accepted.length) return false
  const headerToken = req.headers['x-law-tech-capture-token'] || req.headers['x-law-tech-wechat-token'] || req.headers['x-capture-token'] || ''
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
  return accepted.some(expected => safeEqual(headerToken, expected) || safeEqual(bearerToken, expected))
}

export function hasValidReminderToken(req) {
  const expected = process.env.TASK_REMINDER_TOKEN
  if (!expected) return false
  const headerToken = req.headers['x-law-tech-reminder-token'] || req.headers['x-reminder-token'] || ''
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
  return safeEqual(headerToken, expected) || safeEqual(bearerToken, expected)
}

export async function getAdminCandidate(req) {
  const result = await authenticateClerkRequest(req)
  const auth = result.auth || { userId: null, sessionClaims: null }
  let email = getEmailFromClaims(auth.sessionClaims)
  let clerkUser = null

  if (auth.userId) {
    try {
      const client = await clerkClient()
      clerkUser = await client.users.getUser(auth.userId)
      email = email || primaryEmailFromUser(clerkUser)
    } catch (error) {
      console.error('Clerk workspace user lookup failed', {
        message: error instanceof Error ? error.message : 'unknown error'
      })
      return {
        userId: auth.userId,
        user: { id: auth.userId, email: '' },
        identity: { clerkUserId: auth.userId, email: '', displayName: '', avatarUrl: '' },
        authStatus: 'error',
        authRedirectUrl: ''
      }
    }
  }

  const identity = {
    clerkUserId: auth.userId || '',
    email,
    displayName: displayNameFromUser(clerkUser || {}),
    avatarUrl: clerkUser?.imageUrl || ''
  }

  return {
    userId: auth.userId || null,
    user: {
      id: auth.userId || null,
      email,
      displayName: identity.displayName,
      imageUrl: identity.avatarUrl
    },
    identity,
    authStatus: result.status,
    authRedirectUrl: result.redirectUrl || ''
  }
}

function syntheticLocalProfile() {
  return {
    id: 'local-dev',
    clerk_user_id: 'local-dev',
    email: '',
    display_name: 'Local owner',
    avatar_url: '',
    role: 'owner',
    status: 'active',
    permissions: {}
  }
}

export async function getWorkspaceSession(req, options = {}) {
  const allowInactive = Boolean(options.allowInactive)
  const ignoreImpersonation = Boolean(options.ignoreImpersonation)

  if (!isClerkConfigured()) {
    if (!allowLocalDeskFallback()) {
      return { ok: false, status: 503, error: 'Clerk is not configured for this deployment', code: 'clerk_unconfigured' }
    }
    const profile = syntheticLocalProfile()
    return {
      ok: true,
      via: 'local-dev',
      userId: 'local-dev',
      user: { id: 'local-dev', email: '' },
      actorProfile: profile,
      profile,
      publicActor: publicWorkspaceProfile(profile),
      publicProfile: publicWorkspaceProfile(profile),
      isOwner: true,
      impersonating: false
    }
  }

  const candidate = await getAdminCandidate(req)
  if (candidate.authStatus === 'handshake') {
    return { ok: false, status: 401, error: 'Authentication handshake required', code: 'handshake', redirectUrl: candidate.authRedirectUrl }
  }
  if (candidate.authStatus === 'error') {
    return { ok: false, status: 503, error: 'Clerk session verification failed', code: 'auth_error' }
  }
  if (!candidate.userId) return { ok: false, status: 401, error: 'Unauthorized', code: 'signed_out' }

  const ownerAllowlisted = isAdminUser(candidate.user)
  let actorProfile
  try {
    actorProfile = await ensureWorkspaceProfile(candidate.identity, { owner: ownerAllowlisted })
  } catch (error) {
    console.error('Workspace profile resolution failed', {
      message: error instanceof Error ? error.message : 'unknown error'
    })
    return { ok: false, status: 503, error: 'Workspace profile is unavailable', code: 'profile_unavailable' }
  }

  if (!actorProfile) return { ok: false, status: 503, error: 'Workspace profile is unavailable', code: 'profile_unavailable' }
  const actorStatus = actorProfile.status || 'pending'
  if (!allowInactive && actorStatus !== 'active') {
    return {
      ok: false,
      status: 403,
      error: actorStatus === 'suspended' ? 'Workspace access is suspended' : 'Workspace access is pending',
      code: actorStatus === 'suspended' ? 'access_suspended' : 'access_pending',
      actorProfile,
      publicActor: publicWorkspaceProfile(actorProfile),
      isOwner: ownerAllowlisted
    }
  }

  let profile = actorProfile
  let impersonating = false
  if (ownerAllowlisted && !ignoreImpersonation) {
    const state = readImpersonation(req, candidate.userId)
    if (state?.targetProfileId && state.targetProfileId !== actorProfile.id) {
      const target = await getWorkspaceProfileById(state.targetProfileId)
      if (target?.status === 'active') {
        profile = target
        impersonating = true
      }
    }
  }

  return {
    ok: true,
    via: 'clerk',
    userId: candidate.userId,
    user: candidate.user,
    actorProfile,
    profile,
    publicActor: publicWorkspaceProfile(actorProfile),
    publicProfile: publicWorkspaceProfile(profile),
    isOwner: ownerAllowlisted,
    impersonating
  }
}

export async function requireWorkspaceRequest(req, options = {}) {
  if (options.allowCaptureToken && hasValidCaptureToken(req)) return { ok: true, via: 'capture-token' }
  if (options.allowReminderToken && hasValidReminderToken(req)) return { ok: true, via: 'reminder-token' }
  const session = await getWorkspaceSession(req, options)
  if (!session.ok) return session
  if (options.permission && !profileCan(session.profile, options.permission)) {
    return { ...session, ok: false, status: 403, error: 'Permission denied', code: 'permission_denied' }
  }
  return session
}

export async function requireOwnerRequest(req, options = {}) {
  const session = await getWorkspaceSession(req, { ...options, ignoreImpersonation: true })
  if (!session.ok) return session
  if (isHostedEnvironment() && !hasAdminAllowlist()) {
    return { ok: false, status: 503, error: 'Owner allowlist is not configured', code: 'owner_unconfigured' }
  }
  if (!session.isOwner) return { ...session, ok: false, status: 403, error: 'Forbidden', code: 'owner_required' }
  return session
}

export async function requireAdminRequest(req, options = {}) {
  if (options.allowCaptureToken && hasValidCaptureToken(req)) return { ok: true, via: 'capture-token' }
  if (options.allowReminderToken && hasValidReminderToken(req)) return { ok: true, via: 'reminder-token' }
  return requireOwnerRequest(req, options)
}
