import { requireOwnerRequest } from '@/lib/auth/serverAdmin'
import {
  DEFAULT_MEMBER_PERMISSIONS,
  normalizeWorkspacePermissions,
  publicWorkspaceProfile,
  WORKSPACE_PERMISSION_DEFINITIONS
} from '@/lib/auth/permissions'
import {
  createWorkspaceInvite,
  deleteWorkspaceInvite,
  deleteWorkspaceProfile,
  findWorkspaceProfileByEmail,
  getWorkspaceProfileById,
  listWorkspaceInvites,
  listWorkspaceProfiles,
  updateWorkspaceInvite,
  updateWorkspaceProfile
} from '@/lib/server/workspaceProfiles'

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function publicInvite(invite = {}) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    permissions: normalizeWorkspacePermissions(invite.permissions, invite.role),
    expiresAt: invite.expires_at || null,
    createdAt: invite.created_at || null
  }
}

export default async function handler(req, res) {
  const auth = await requireOwnerRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    if (req.method === 'GET') {
      const [profiles, invites] = await Promise.all([
        listWorkspaceProfiles(),
        listWorkspaceInvites()
      ])
      return res.status(200).json({
        ok: true,
        profiles: (profiles || []).map(publicWorkspaceProfile),
        invites: (invites || []).map(publicInvite),
        permissionDefinitions: WORKSPACE_PERMISSION_DEFINITIONS,
        defaults: DEFAULT_MEMBER_PERMISSIONS
      })
    }

    if (req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase()
      if (!validEmail(email)) return res.status(400).json({ ok: false, error: '请输入有效邮箱' })
      const permissions = req.body?.permissions || DEFAULT_MEMBER_PERMISSIONS
      const existingProfile = await findWorkspaceProfileByEmail(email)
      if (existingProfile?.role === 'owner') {
        return res.status(400).json({ ok: false, error: '该邮箱已经属于管理员账号' })
      }
      const invite = await createWorkspaceInvite({
        email,
        role: 'member',
        permissions,
        invitedBy: auth.actorProfile.id,
        expiresAt: req.body?.expiresAt || null
      })
      if (existingProfile) {
        const profile = await updateWorkspaceProfile(existingProfile.id, {
          role: 'member',
          status: 'active',
          permissions
        })
        await updateWorkspaceInvite(invite.id, { status: 'accepted', acceptedBy: profile.id, role: 'member', permissions })
        return res.status(200).json({ ok: true, profile: publicWorkspaceProfile(profile), invite: publicInvite({ ...invite, status: 'accepted', accepted_by: profile.id }) })
      }
      return res.status(201).json({ ok: true, invite: publicInvite(invite) })
    }

    if (req.method === 'PATCH') {
      const profileId = String(req.body?.profileId || '').trim()
      const inviteId = String(req.body?.inviteId || '').trim()
      if (inviteId) {
        const invite = await updateWorkspaceInvite(inviteId, {
          status: req.body?.status,
          permissions: req.body?.permissions,
          role: 'member'
        })
        return res.status(200).json({ ok: true, invite: publicInvite(invite) })
      }
      const profile = await getWorkspaceProfileById(profileId)
      if (!profile) return res.status(404).json({ ok: false, error: '成员不存在' })
      if (profile.id === auth.actorProfile.id && req.body?.status !== undefined) {
        return res.status(400).json({ ok: false, error: '不能暂停自己的管理员账号' })
      }
      const updated = await updateWorkspaceProfile(profile.id, {
        displayName: req.body?.displayName,
        status: req.body?.status,
        role: profile.id === auth.actorProfile.id ? 'owner' : 'member',
        permissions: req.body?.permissions
      })
      return res.status(200).json({ ok: true, profile: publicWorkspaceProfile(updated) })
    }

    if (req.method === 'DELETE') {
      const profileId = String(req.body?.profileId || '').trim()
      const inviteId = String(req.body?.inviteId || '').trim()
      if (inviteId) {
        await deleteWorkspaceInvite(inviteId)
        return res.status(200).json({ ok: true })
      }
      if (String(req.body?.confirmation || '') !== '删除成员及数据') {
        return res.status(400).json({ ok: false, error: '请输入“删除成员及数据”确认' })
      }
      if (profileId === auth.actorProfile.id) {
        return res.status(400).json({ ok: false, error: '不能删除自己的管理员账号' })
      }
      const target = await getWorkspaceProfileById(profileId)
      if (!target) return res.status(404).json({ ok: false, error: '成员不存在' })
      if (target.role === 'owner') return res.status(400).json({ ok: false, error: '不能删除管理员账号' })
      await deleteWorkspaceProfile(profileId)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Member management failed'
    })
  }
}
