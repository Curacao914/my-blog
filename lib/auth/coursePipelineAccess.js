import crypto from 'crypto'

import { requireCourseWorkspace } from '@/lib/auth/courseAccess'

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

function readWorkerOwnerId(req = {}) {
  return String(
    req.headers?.['x-law-tech-owner-id'] ||
      req.body?.ownerId ||
      req.query?.ownerId ||
      ''
  ).trim()
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

    const ownerId = readWorkerOwnerId(req)
    if (!ownerId) {
      return {
        ok: false,
        status: 400,
        code: 'owner_required',
        error: 'Worker requests require an ownerId'
      }
    }

    return {
      ok: true,
      via: 'course-worker',
      ownerId,
      profile: null
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
