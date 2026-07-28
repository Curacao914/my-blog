import {
  DEFAULT_MEMBER_PERMISSIONS,
  normalizeWorkspacePermissions,
  profileCan
} from '@/lib/auth/permissions'

describe('workspace permissions', () => {
  it('gives members private tools but not public publishing by default', () => {
    expect(DEFAULT_MEMBER_PERMISSIONS).toEqual(expect.objectContaining({
      schedule: true,
      notes: true,
      reading: true,
      knowledge: true,
      courses: true,
      writing: true,
      reminders: true,
      ai: true,
      publish: false
    }))
  })

  it('keeps owner capabilities complete and denies inactive members', () => {
    expect(profileCan({ role: 'owner', status: 'active', permissions: {} }, 'publish')).toBe(true)
    expect(profileCan({ role: 'member', status: 'suspended', permissions: { notes: true } }, 'notes')).toBe(false)
    expect(profileCan({ role: 'member', status: 'active', permissions: { notes: false } }, 'notes')).toBe(false)
  })

  it('normalizes partial member settings without granting publish', () => {
    expect(normalizeWorkspacePermissions({ schedule: false }, 'member')).toEqual(expect.objectContaining({
      schedule: false,
      notes: true,
      publish: false
    }))
  })
})
