import { clerkClient } from '@clerk/nextjs/server'

import {
  authenticateClerkRequest,
  nodeRequestToWebRequest,
  requestOrigin
} from '@/lib/auth/clerkRequest'

jest.mock('@clerk/nextjs/server', () => ({
  clerkClient: jest.fn()
}))

const originalRequest = global.Request

beforeAll(() => {
  if (typeof global.Request !== 'undefined') return

  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = String(input)
      this.method = init.method || 'GET'
      this.headers = init.headers || new Headers()
    }
  }
})

afterAll(() => {
  if (originalRequest === undefined) {
    delete global.Request
    return
  }

  global.Request = originalRequest
})

describe('direct Clerk request authentication', () => {
  const previousEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...previousEnv,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_example',
      CLERK_SECRET_KEY: 'sk_test_example'
    }
  })

  afterAll(() => {
    process.env = previousEnv
  })

  it('converts a Next.js request without dropping its Clerk cookies', () => {
    const req = {
      method: 'GET',
      url: '/desk/today?view=all',
      headers: {
        host: 'preview.law-tech.dev',
        'x-forwarded-proto': 'https',
        cookie: '__session=session-token; __client_uat=123'
      }
    }

    expect(requestOrigin(req)).toBe('https://preview.law-tech.dev')
    const request = nodeRequestToWebRequest(req)
    expect(request.url).toBe('https://preview.law-tech.dev/desk/today?view=all')
    expect(request.headers.get('cookie')).toContain('__session=session-token')
  })

  it('returns the signed-in auth object from authenticateRequest', async () => {
    const authenticateRequest = jest.fn().mockResolvedValue({
      status: 'signed-in',
      headers: new Headers(),
      toAuth: () => ({
        userId: 'user_admin',
        sessionClaims: { email: 'admin@example.com' }
      })
    })
    clerkClient.mockResolvedValue({ authenticateRequest })

    const result = await authenticateClerkRequest({
      method: 'GET',
      url: '/api/admin/session',
      headers: {
        host: 'preview.law-tech.dev',
        'x-forwarded-proto': 'https',
        cookie: '__session=session-token'
      }
    })

    expect(result.status).toBe('signed-in')
    expect(result.isAuthenticated).toBe(true)
    expect(result.auth.userId).toBe('user_admin')
    expect(authenticateRequest).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        authorizedParties: ['https://preview.law-tech.dev']
      })
    )
  })

  it('surfaces a Clerk development handshake redirect', async () => {
    const headers = new Headers({ location: 'https://clerk.example/handshake' })
    clerkClient.mockResolvedValue({
      authenticateRequest: jest.fn().mockResolvedValue({
        status: 'handshake',
        headers,
        toAuth: () => null
      })
    })

    const result = await authenticateClerkRequest({
      method: 'GET',
      url: '/desk/today',
      headers: { host: 'preview.law-tech.dev', 'x-forwarded-proto': 'https' }
    })

    expect(result).toEqual({
      status: 'handshake',
      isAuthenticated: false,
      auth: null,
      redirectUrl: 'https://clerk.example/handshake'
    })
  })
})
