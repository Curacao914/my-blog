import {
  DEFAULT_MEMBER_PERMISSIONS,
  normalizeWorkspacePermissions,
  normalizeWorkspaceRole,
  normalizeWorkspaceStatus
} from '@/lib/auth/permissions'
import { supabaseRest } from '@/lib/server/supabase'

const profileSelect = 'id,clerk_user_id,email,display_name,avatar_url,role,status,permissions,last_seen_at,created_at,updated_at'
const inviteSelect = 'id,email,role,status,permissions,invited_by,accepted_by,expires_at,created_at,updated_at'

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export async function findWorkspaceProfileByClerkUserId(clerkUserId) {
  if (!clerkUserId) return null
  const rows = await supabaseRest(`/profiles?select=${profileSelect}&clerk_user_id=${eq(clerkUserId)}&limit=1`)
  return rows?.[0] || null
}

export async function findWorkspaceProfileByEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  const rows = await supabaseRest(`/profiles?select=${profileSelect}&email=${eq(normalized)}&limit=1`)
  return rows?.[0] || null
}

export async function getWorkspaceProfileById(id) {
  if (!id) return null
  const rows = await supabaseRest(`/profiles?select=${profileSelect}&id=${eq(id)}&limit=1`)
  return rows?.[0] || null
}

export async function listWorkspaceProfiles() {
  return supabaseRest(`/profiles?select=${profileSelect}&order=created_at.asc`)
}

export async function listWorkspaceInvites() {
  return supabaseRest(`/workspace_invites?select=${inviteSelect}&order=created_at.desc`)
}

export async function findWorkspaceInviteByEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  const rows = await supabaseRest(
    `/workspace_invites?select=${inviteSelect}&email=${eq(normalized)}&status=eq.pending&order=created_at.desc&limit=1`
  )
  const invite = rows?.[0] || null
  if (!invite) return null
  if (invite.expires_at && Date.parse(invite.expires_at) <= Date.now()) return null
  return invite
}

export async function createWorkspaceInvite({ email, role = 'member', permissions = {}, invitedBy, expiresAt = null }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('Email is required')
  const rows = await supabaseRest('/workspace_invites?on_conflict=email&select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      email: normalized,
      role: normalizeWorkspaceRole(role),
      status: 'pending',
      permissions: normalizeWorkspacePermissions(permissions, role),
      invited_by: invitedBy || null,
      accepted_by: null,
      expires_at: expiresAt || null,
      updated_at: new Date().toISOString()
    })
  })
  return rows?.[0] || null
}

export async function updateWorkspaceInvite(id, patch = {}) {
  const payload = { updated_at: new Date().toISOString() }
  if ('status' in patch) payload.status = ['pending', 'accepted', 'revoked'].includes(patch.status) ? patch.status : 'revoked'
  if ('role' in patch) payload.role = normalizeWorkspaceRole(patch.role)
  if ('permissions' in patch) payload.permissions = normalizeWorkspacePermissions(patch.permissions, patch.role || 'member')
  if ('acceptedBy' in patch) payload.accepted_by = patch.acceptedBy || null
  const rows = await supabaseRest(`/workspace_invites?id=${eq(id)}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  })
  return rows?.[0] || null
}

export async function deleteWorkspaceInvite(id) {
  return supabaseRest(`/workspace_invites?id=${eq(id)}`, { method: 'DELETE' })
}

export async function createWorkspaceProfile(input = {}) {
  const role = normalizeWorkspaceRole(input.role)
  const rows = await supabaseRest(`/profiles?select=${profileSelect}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      clerk_user_id: input.clerkUserId,
      email: normalizeEmail(input.email) || null,
      display_name: String(input.displayName || '').trim() || null,
      avatar_url: String(input.avatarUrl || '').trim() || null,
      role,
      status: normalizeWorkspaceStatus(input.status),
      permissions: normalizeWorkspacePermissions(input.permissions || DEFAULT_MEMBER_PERMISSIONS, role),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  })
  return rows?.[0] || null
}

export async function updateWorkspaceProfile(id, patch = {}) {
  const payload = { updated_at: new Date().toISOString() }
  if ('email' in patch) payload.email = normalizeEmail(patch.email) || null
  if ('displayName' in patch) payload.display_name = String(patch.displayName || '').trim() || null
  if ('avatarUrl' in patch) payload.avatar_url = String(patch.avatarUrl || '').trim() || null
  if ('status' in patch) payload.status = normalizeWorkspaceStatus(patch.status)
  if ('role' in patch) payload.role = normalizeWorkspaceRole(patch.role)
  if ('permissions' in patch) payload.permissions = normalizeWorkspacePermissions(patch.permissions, patch.role || 'member')
  if (patch.touch) payload.last_seen_at = new Date().toISOString()
  const rows = await supabaseRest(`/profiles?id=${eq(id)}&select=${profileSelect}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  })
  return rows?.[0] || null
}

export async function deleteWorkspaceProfile(id) {
  return supabaseRest(`/profiles?id=${eq(id)}`, { method: 'DELETE' })
}

export async function ensureWorkspaceProfile(identity = {}, options = {}) {
  const clerkUserId = String(identity.clerkUserId || 'local-dev')
  const email = normalizeEmail(identity.email)
  let profile = await findWorkspaceProfileByClerkUserId(clerkUserId)
  const owner = Boolean(options.owner)

  if (!profile) {
    const invite = owner ? null : await findWorkspaceInviteByEmail(email)
    profile = await createWorkspaceProfile({
      clerkUserId,
      email,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl,
      role: owner ? 'owner' : invite?.role || 'member',
      status: owner || invite ? 'active' : 'pending',
      permissions: owner ? {} : invite?.permissions || DEFAULT_MEMBER_PERMISSIONS
    })
    if (invite && profile) {
      await updateWorkspaceInvite(invite.id, { status: 'accepted', acceptedBy: profile.id })
    }
    return profile
  }

  const patch = {}
  if (email && email !== normalizeEmail(profile.email)) patch.email = email
  if (!profile.avatar_url && identity.avatarUrl) patch.avatarUrl = identity.avatarUrl
  if (!profile.display_name && identity.displayName) patch.displayName = identity.displayName
  const lastSeenAt = Date.parse(profile.last_seen_at || 0)
  if (!Number.isFinite(lastSeenAt) || Date.now() - lastSeenAt > 10 * 60 * 1000) patch.touch = true
  if (owner) {
    if (profile.role !== 'owner') {
      patch.role = 'owner'
      patch.permissions = {}
    }
    if (profile.status !== 'active') patch.status = 'active'
  } else if (profile.role === 'owner') {
    const invite = await findWorkspaceInviteByEmail(email)
    patch.role = 'member'
    patch.status = invite ? 'active' : 'pending'
    patch.permissions = invite?.permissions || DEFAULT_MEMBER_PERMISSIONS
    if (invite) await updateWorkspaceInvite(invite.id, { status: 'accepted', acceptedBy: profile.id })
  }
  return Object.keys(patch).length ? updateWorkspaceProfile(profile.id, patch) : profile
}
