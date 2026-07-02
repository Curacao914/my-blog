import {
  clearImpersonationCookie,
  createImpersonationToken,
  setImpersonationCookie
} from '@/lib/auth/impersonation'
import { requireOwnerRequest } from '@/lib/auth/serverAdmin'
import { getWorkspaceProfileById } from '@/lib/server/workspaceProfiles'

export default async function handler(req, res) {
  const auth = await requireOwnerRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  if (req.method === 'DELETE') {
    clearImpersonationCookie(res)
    return res.status(200).json({ ok: true, impersonating: false })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const targetProfileId = String(req.body?.profileId || '').trim()
  if (!targetProfileId || targetProfileId === auth.actorProfile?.id) {
    clearImpersonationCookie(res)
    return res.status(200).json({ ok: true, impersonating: false })
  }

  const target = await getWorkspaceProfileById(targetProfileId)
  if (!target || target.status !== 'active') {
    return res.status(404).json({ ok: false, error: 'Target member is unavailable' })
  }

  const token = createImpersonationToken({
    actorClerkUserId: auth.userId,
    targetProfileId: target.id
  })
  if (!token) return res.status(503).json({ ok: false, error: 'Workspace session secret is not configured' })
  setImpersonationCookie(res, token)
  return res.status(200).json({ ok: true, impersonating: true, profileId: target.id })
}
