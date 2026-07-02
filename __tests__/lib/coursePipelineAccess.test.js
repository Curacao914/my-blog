import {
  readCourseWorkerToken,
  requireCoursePipelineAccess,
  resetCourseWorkerOwnerCache,
  resolveCourseWorkerOwnerId
} from '@/lib/auth/coursePipelineAccess'
import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import {
  findWorkspaceProfileByEmail,
  listWorkspaceProfiles
} from '@/lib/server/workspaceProfiles'

jest.mock('@/lib/auth/courseAccess', () => ({
  requireCourseWorkspace: jest.fn()
}))

jest.mock('@/lib/server/workspaceProfiles', () => ({
  findWorkspaceProfileByEmail: jest.fn(),
  listWorkspaceProfiles: jest.fn()
}))

describe('course pipeline access', () => {
  const original = {
    secret: process.env.COURSE_WORKER_SECRET,
    ownerId: process.env.COURSE_WORKER_OWNER_ID,
    ownerEmail: process.env.COURSE_WORKER_OWNER_EMAIL
  }

  beforeEach(() => {
    resetCourseWorkerOwnerCache()
    jest.clearAllMocks()
    delete process.env.COURSE_WORKER_OWNER_ID
    delete process.env.COURSE_WORKER_OWNER_EMAIL
  })

  afterEach(() => {
    process.env.COURSE_WORKER_SECRET = original.secret
    process.env.COURSE_WORKER_OWNER_ID = original.ownerId
    process.env.COURSE_WORKER_OWNER_EMAIL =
      original.ownerEmail
  })

  test('reads the dedicated worker header', () => {
    expect(
      readCourseWorkerToken({
        headers: {
          'x-law-tech-course-worker-secret':
            'worker-secret'
        }
      })
    ).toBe('worker-secret')
  })

  test('resolves the single active owner automatically', async () => {
    listWorkspaceProfiles.mockResolvedValue([
      {
        id: 'profile-owner',
        role: 'owner',
        status: 'active'
      },
      {
        id: 'profile-member',
        role: 'member',
        status: 'active'
      }
    ])

    await expect(
      resolveCourseWorkerOwnerId(
        { headers: {}, body: {}, query: {} }
      )
    ).resolves.toBe('profile-owner')
  })

  test('requires explicit binding when multiple owners exist', async () => {
    listWorkspaceProfiles.mockResolvedValue([
      {
        id: 'owner-1',
        role: 'owner',
        status: 'active'
      },
      {
        id: 'owner-2',
        role: 'owner',
        status: 'active'
      }
    ])

    await expect(
      resolveCourseWorkerOwnerId(
        { headers: {}, body: {}, query: {} }
      )
    ).rejects.toMatchObject({
      code: 'course_worker_owner_ambiguous'
    })
  })

  test('authenticates the worker without an owner header', async () => {
    process.env.COURSE_WORKER_SECRET = 'worker-secret'
    listWorkspaceProfiles.mockResolvedValue([
      {
        id: 'profile-owner',
        role: 'owner',
        status: 'active'
      }
    ])

    const result = await requireCoursePipelineAccess({
      headers: {
        authorization: 'Bearer worker-secret'
      },
      body: {},
      query: {}
    })

    expect(result).toEqual({
      ok: true,
      via: 'course-worker',
      ownerId: 'profile-owner',
      profile: null
    })
  })

  test('falls back to the signed-in workspace owner', async () => {
    requireCourseWorkspace.mockResolvedValue({
      ok: true,
      via: 'clerk',
      profile: { id: 'profile-2' }
    })
    const result = await requireCoursePipelineAccess({
      headers: {},
      body: { ownerId: 'spoofed-owner' },
      query: {}
    })
    expect(result.ownerId).toBe('profile-2')
  })
})
