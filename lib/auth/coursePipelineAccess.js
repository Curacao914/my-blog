import crypto from 'crypto'

import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import {
  findWorkspaceProfileByEmail,
  listWorkspaceProfiles
} from '@/lib/server/workspaceProfiles'

const OWNER_CACHE_MS = 5 * 60 * 1000
let ownerCache = {
  ownerId: '',
  expiresAt: 0
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function readCourseWorkerToken(req = {}) {
  const authorization = String(
    req.headers?.authorization || ''
  )
  const bearer = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  return String(
    req.headers?.['x-law-tech-course-worker-secret'] ||
      req.headers?.['x-course-worker-secret'] ||
      bearer ||
      ''
  )
}

function explicitWorkerOwnerId(req = {}) {
  return String(
    req.headers?.['x-law-tech-owner-id'] ||
      req.body?.ownerId ||
      req.query?.ownerId ||
      process.env.COURSE_WORKER_OWNER_ID ||
      ''
  ).trim()
}

export function resetCourseWorkerOwnerCache() {
  ownerCache = {
    ownerId: '',
    expiresAt: 0
  }
}

export async function resolveCourseWorkerOwnerId(
  req = {},
  options = {}
) {
  const explicit = explicitWorkerOwnerId(req)
  if (explicit) return explicit

  const now = Number(options.now || Date.now())
  if (
    ownerCache.ownerId &&
    ownerCache.expiresAt > now
  ) {
    return ownerCache.ownerId
  }

  const configuredEmail = String(
    process.env.COURSE_WORKER_OWNER_EMAIL || ''
  ).trim()
  if (configuredEmail) {
    const profile = await findWorkspaceProfileByEmail(
      configuredEmail
    )
    if (
      !profile ||
      profile.role !== 'owner' ||
      profile.status !== 'active'
    ) {
      const error = new Error(
        'COURSE_WORKER_OWNER_EMAIL does not resolve to an active owner'
      )
      error.code = 'course_worker_owner_invalid'
      throw error
    }
    ownerCache = {
      ownerId: profile.id,
      expiresAt: now + OWNER_CACHE_MS
    }
    return profile.id
  }

  const profiles = await listWorkspaceProfiles()
  const owners = (profiles || []).filter(profile =>
    profile.role === 'owner' &&
    profile.status === 'active'
  )

  if (owners.length === 1) {
    ownerCache = {
      ownerId: owners[0].id,
      expiresAt: now + OWNER_CACHE_MS
    }
    return owners[0].id
  }

  const error = new Error(
    owners.length
      ? 'Multiple active owners exist; configure COURSE_WORKER_OWNER_ID'
      : 'No active workspace owner is available'
  )
  error.code = owners.length
    ? 'course_worker_owner_ambiguous'
    : 'course_worker_owner_missing'
  throw error
}

export async function requireCoursePipelineAccess(
  req,
  options = {}
) {
  const presentedToken = readCourseWorkerToken(req)
  if (presentedToken) {
    const expected = String(
      process.env.COURSE_WORKER_SECRET || ''
    )
    if (!expected) {
      return {
        ok: false,
        status: 503,
        code: 'course_worker_unconfigured',
        error: 'COURSE_WORKER_SECRET is not configured'
      }
    }
    if (!safeEqual(presentedToken, expected)) {
      return {
        ok: false,
        status: 401,
        code: 'invalid_course_worker_secret',
        error: 'Invalid course worker secret'
      }
    }

    try {
      const ownerId = await resolveCourseWorkerOwnerId(req)
      return {
        ok: true,
        via: 'course-worker',
        ownerId,
        profile: null
      }
    } catch (error) {
      return {
        ok: false,
        status: 400,
        code:
          error?.code ||
          'course_worker_owner_unavailable',
        error:
          error instanceof Error
            ? error.message
            : 'Course worker owner is unavailable'
      }
    }
  }

  if (options.workerOnly) {
    return {
      ok: false,
      status: 401,
      code: 'course_worker_required',
      error: 'Course worker authentication is required'
    }
  }

  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return auth
  return {
    ...auth,
    via: auth.via || 'workspace',
    ownerId: auth.profile.id
  }
}
