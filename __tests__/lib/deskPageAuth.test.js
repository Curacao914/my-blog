import { requireDeskPage } from '@/lib/auth/deskPage'
import { getWorkspaceSession } from '@/lib/auth/serverAdmin'

jest.mock('@/lib/auth/serverAdmin', () => ({
  getWorkspaceSession: jest.fn()
}))

describe('desk page authentication', () => {
  const ctx = {
    req: { headers: {} },
    resolvedUrl: '/desk/today'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fails closed when the workspace session cannot be established', async () => {
    getWorkspaceSession.mockResolvedValue({
      ok: false,
      code: 'unconfigured'
    })

    await expect(requireDeskPage()(ctx)).resolves.toEqual({
      notFound: true
    })

    expect(getWorkspaceSession).toHaveBeenCalledWith(ctx.req)
  })

  it('redirects an unauthenticated visitor to sign in', async () => {
    getWorkspaceSession.mockResolvedValue({
      ok: false,
      code: 'signed_out'
    })

    await expect(requireDeskPage()(ctx)).resolves.toEqual({
      redirect: {
        destination: '/sign-in?redirect_url=%2Fdesk%2Ftoday',
        permanent: false
      }
    })
  })

  it('follows a Clerk handshake redirect before evaluating workspace access', async () => {
    getWorkspaceSession.mockResolvedValue({
      ok: false,
      code: 'handshake',
      redirectUrl: 'https://clerk.example/handshake'
    })

    await expect(requireDeskPage()(ctx)).resolves.toEqual({
      redirect: {
        destination: 'https://clerk.example/handshake',
        permanent: false
      }
    })
  })

  it('allows an active owner and exposes the server-verified session', async () => {
    const actor = {
      id: 'profile-owner',
      role: 'owner',
      status: 'active',
      displayName: 'Curacao'
    }

    getWorkspaceSession.mockResolvedValue({
      ok: true,
      code: 'active',
      publicActor: actor,
      publicProfile: actor,
      isOwner: true,
      impersonating: false
    })

    await expect(requireDeskPage()(ctx)).resolves.toEqual({
      props: {
        workspaceSession: {
          actor,
          profile: actor,
          isOwner: true,
          impersonating: false
        }
      }
    })
  })

  it('redirects pending and suspended users to their account state pages', async () => {
    getWorkspaceSession.mockResolvedValueOnce({
      ok: false,
      code: 'access_pending'
    })

    await expect(requireDeskPage()(ctx)).resolves.toEqual({
      redirect: {
        destination: '/access-pending',
        permanent: false
      }
    })

    getWorkspaceSession.mockResolvedValueOnce({
      ok: false,
      code: 'access_suspended'
    })

    await expect(requireDeskPage()(ctx)).resolves.toEqual({
      redirect: {
        destination: '/access-suspended',
        permanent: false
      }
    })
  })

  it('enforces a requested member capability', async () => {
    const actor = {
      id: 'profile-member',
      role: 'member',
      status: 'active'
    }

    getWorkspaceSession.mockResolvedValue({
      ok: true,
      code: 'active',
      publicActor: actor,
      publicProfile: {
        ...actor,
        permissions: {
          schedule: false,
          notes: true
        }
      },
      isOwner: false,
      impersonating: false
    })

    await expect(
      requireDeskPage({ permission: 'schedule' })(ctx)
    ).resolves.toEqual({
      notFound: true
    })

    await expect(
      requireDeskPage({ permission: 'schedule' })(ctx)
    ).resolves.toEqual({
      notFound: true
    })

    await expect(
      requireDeskPage({ permission: 'notes' })(ctx)
    ).resolves.toEqual({
      props: {
        workspaceSession: {
          actor,
          profile: {
            ...actor,
            permissions: {
              schedule: false,
              notes: true
            }
          },
          isOwner: false,
          impersonating: false
        }
      }
    })
  })
})
