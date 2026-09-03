import { ensureWorkspaceProfile } from '@/lib/server/workspaceProfiles'
import { supabaseRest } from '@/lib/server/supabase'

jest.mock('@/lib/server/supabase', () => ({
  supabaseRest: jest.fn()
}))

const existingProfile = {
  id: 'profile-owner',
  clerk_user_id: 'user_development',
  email: 'owner@example.com',
  display_name: 'Owner',
  avatar_url: null,
  role: 'owner',
  status: 'active',
  permissions: {},
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

describe('workspace profile production Clerk migration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    supabaseRest.mockImplementation(async (path, options = {}) => {
      if (path.includes('clerk_user_id=')) return []
      if (path.includes('email=')) return [existingProfile]
      if (path.startsWith('/profiles?id=') && options.method === 'PATCH') {
        const payload = JSON.parse(options.body || '{}')
        return [{
          ...existingProfile,
          clerk_user_id: payload.clerk_user_id,
          updated_at: payload.updated_at
        }]
      }
      throw new Error(`Unexpected Supabase request: ${options.method || 'GET'} ${path}`)
    })
  })

  it('rebinds the existing email profile to the Production Clerk user ID', async () => {
    const result = await ensureWorkspaceProfile({
      clerkUserId: 'user_production',
      email: 'OWNER@example.com',
      displayName: 'Owner'
    }, { owner: true })

    expect(result).toMatchObject({
      id: 'profile-owner',
      clerk_user_id: 'user_production',
      email: 'owner@example.com',
      role: 'owner',
      status: 'active'
    })

    expect(supabaseRest).toHaveBeenCalledWith(
      expect.stringContaining('email=eq.owner%40example.com')
    )
    expect(supabaseRest).toHaveBeenCalledWith(
      expect.stringContaining('/profiles?id=eq.profile-owner'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"clerk_user_id":"user_production"')
      })
    )
    expect(supabaseRest.mock.calls.some(([, options = {}]) => options.method === 'POST')).toBe(false)
  })
})
