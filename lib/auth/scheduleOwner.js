import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { ensureProfile } from '@/lib/server/supabase'

export async function getScheduleOwner(req, permission = 'schedule') {
  const auth = await requireWorkspaceRequest(req, { permission })
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error, code: auth.code }
  return { ok: true, auth, profile: auth.profile }
}

export async function getScheduleOwnerUserId(req) {
  const owner = await getScheduleOwner(req)
  if (!owner.ok) return ''
  return owner.profile?.clerk_user_id || owner.auth?.userId || ''
}

// Capture-token callers are intentionally still mapped to the configured primary owner.
export async function getConfiguredCaptureOwner(req) {
  const auth = await requireWorkspaceRequest(req, { allowCaptureToken: true })
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error }
  if (auth.profile) return { ok: true, profile: auth.profile, auth }
  const clerkUserId =
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.WECHAT_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    ''
  if (!clerkUserId) return { ok: false, status: 503, error: 'Capture owner is not configured' }
  const { profile } = await ensureProfile({ clerkUserId, role: 'owner', status: 'active' })
  return { ok: true, profile, auth }
}
