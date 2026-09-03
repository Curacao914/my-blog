import handler from '@/pages/api/account/profile'

import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { updateWorkspaceProfile } from '@/lib/server/workspaceProfiles'

jest.mock('@/lib/auth/serverAdmin', () => ({ requireWorkspaceRequest: jest.fn() }))
jest.mock('@/lib/server/workspaceProfiles', () => ({ updateWorkspaceProfile: jest.fn() }))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/account/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireWorkspaceRequest.mockResolvedValue({
      ok: true,
      actorProfile: { id: 'profile-1' },
      impersonating: false
    })
    updateWorkspaceProfile.mockResolvedValue({
      id: 'profile-1',
      clerk_user_id: 'user-1',
      email: 'owner@example.com',
      display_name: 'Curacao',
      avatar_url: 'https://img.example/avatar.png',
      role: 'owner',
      status: 'active',
      permissions: {}
    })
  })

  it('updates only the signed-in actor profile and accepts a remote image URL', async () => {
    const res = createRes()
    await handler({
      method: 'PATCH',
      body: {
        displayName: '  Curacao  ',
        avatarUrl: 'https://img.example/avatar.png'
      }
    }, res)

    expect(res.statusCode).toBe(200)
    expect(updateWorkspaceProfile).toHaveBeenCalledWith('profile-1', {
      displayName: 'Curacao',
      avatarUrl: 'https://img.example/avatar.png'
    })
    expect(res.body.profile.avatarUrl).toBe('https://img.example/avatar.png')
  })

  it('rejects non-http avatar schemes', async () => {
    const res = createRes()
    await handler({
      method: 'PATCH',
      body: { displayName: 'Curacao', avatarUrl: 'javascript:alert(1)' }
    }, res)

    expect(res.statusCode).toBe(400)
    expect(updateWorkspaceProfile).not.toHaveBeenCalled()
  })

  it('does not edit a member profile through an impersonation session', async () => {
    requireWorkspaceRequest.mockResolvedValue({
      ok: true,
      actorProfile: { id: 'profile-owner' },
      profile: { id: 'profile-member' },
      impersonating: true
    })
    const res = createRes()
    await handler({ method: 'PATCH', body: { displayName: 'Member' } }, res)

    expect(res.statusCode).toBe(409)
    expect(updateWorkspaceProfile).not.toHaveBeenCalled()
  })
})
