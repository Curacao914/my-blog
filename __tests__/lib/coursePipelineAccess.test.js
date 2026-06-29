import {
  readCourseWorkerToken,
  requireCoursePipelineAccess
} from '@/lib/auth/coursePipelineAccess'
import { requireCourseWorkspace } from '@/lib/auth/courseAccess'

jest.mock('@/lib/auth/courseAccess', () => ({
  requireCourseWorkspace: jest.fn()
}))

describe('course pipeline access', () => {
  const originalSecret = process.env.COURSE_WORKER_SECRET

  afterEach(() => {
    process.env.COURSE_WORKER_SECRET = originalSecret
    jest.clearAllMocks()
  })

  test('reads the dedicated worker header', () => {
    expect(
      readCourseWorkerToken({
        headers: {
          'x-law-tech-course-worker-secret': 'worker-secret'
        }
      })
    ).toBe('worker-secret')
  })

  test('authenticates a worker and requires ownerId', async () => {
    process.env.COURSE_WORKER_SECRET = 'worker-secret'
    const result = await requireCoursePipelineAccess({
      headers: {
        authorization: 'Bearer worker-secret',
        'x-law-tech-owner-id': 'profile-1'
      },
      body: {},
      query: {}
    })
    expect(result).toEqual({
      ok: true,
      via: 'course-worker',
      ownerId: 'profile-1',
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
