import { requireDeskPage } from '@/lib/auth/deskPage'
import { hasAdminAllowlist, isAdminUser } from '@/lib/auth/admin'
import {
  allowLocalDeskFallback,
  getAdminCandidate,
  isClerkConfigured,
  isHostedEnvironment
} from '@/lib/auth/serverAdmin'

jest.mock('@/lib/auth/admin', () => ({
  hasAdminAllowlist: jest.fn(),
  isAdminUser: jest.fn()
}))

jest.mock('@/lib/auth/serverAdmin', () => ({
  allowLocalDeskFallback: jest.fn(),
  getAdminCandidate: jest.fn(),
  isClerkConfigured: jest.fn(),
  isHostedEnvironment: jest.fn()
}))

describe('desk page authentication', () => {
  const ctx = { req: { headers: {} }, resolvedUrl: '/desk/today' }

  beforeEach(() => {
    jest.clearAllMocks()
    isClerkConfigured.mockReturnValue(true)
    isHostedEnvironment.mockReturnValue(true)
    hasAdminAllowlist.mockReturnValue(true)
  })

  it('fails closed on hosted deployments when Clerk is missing', async () => {
    isClerkConfigured.mockReturnValue(false)
    allowLocalDeskFallback.mockReturnValue(false)

    await expect(requireDeskPage()(ctx)).resolves.toEqual({ notFound: true })
  })

  it('redirects a hosted unauthenticated visitor to sign in', async () => {
    getAdminCandidate.mockResolvedValue({
      userId: null,
      user: { id: null, email: '' },
      authStatus: 'signed-out'
    })

    const result = await requireDeskPage()(ctx)

    expect(result.redirect.destination).toBe(
      '/sign-in?redirect_url=%2Fdesk%2Ftoday'
    )
    expect(result.redirect.permanent).toBe(false)
  })

  it('follows a Clerk handshake redirect before evaluating the allowlist', async () => {
    getAdminCandidate.mockResolvedValue({
      userId: null,
      user: { id: null, email: '' },
      authStatus: 'handshake',
      authRedirectUrl: 'https://clerk.example/handshake'
    })

    await expect(requireDeskPage()(ctx)).resolves.toEqual({
      redirect: {
        destination: 'https://clerk.example/handshake',
        permanent: false
      }
    })
    expect(isAdminUser).not.toHaveBeenCalled()
  })

  it('allows an authenticated allowlisted administrator', async () => {
    const user = { id: 'user-admin', email: 'admin@example.com' }
    getAdminCandidate.mockResolvedValue({
      userId: user.id,
      user,
      authStatus: 'signed-in'
    })
    isAdminUser.mockReturnValue(true)

    await expect(requireDeskPage()(ctx)).resolves.toEqual({ props: {} })
    expect(isAdminUser).toHaveBeenCalledWith(user)
  })
})
