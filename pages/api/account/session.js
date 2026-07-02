import { getWorkspaceSession } from '@/lib/auth/serverAdmin'
import { publicWorkspaceProfile } from '@/lib/auth/permissions'
import { listWorkspaceProfiles } from '@/lib/server/workspaceProfiles'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = await getWorkspaceSession(req, { allowInactive: true })
  if (!session.ok) {
    return res.status(session.status).json({
      ok: false,
      signedIn: Boolean(session.publicActor),
      code: session.code,
      error: session.error,
      profile: session.publicActor || null
    })
  }

  let switchableProfiles = []
  if (session.isOwner) {
    const profiles = await listWorkspaceProfiles().catch(() => [])
    switchableProfiles = (profiles || [])
      .filter(profile => profile.status === 'active')
      .map(publicWorkspaceProfile)
  }

  return res.status(200).json({
    ok: true,
    signedIn: true,
    actor: session.publicActor,
    profile: session.publicProfile,
    isOwner: session.isOwner,
    impersonating: session.impersonating,
    switchableProfiles
  })
}
