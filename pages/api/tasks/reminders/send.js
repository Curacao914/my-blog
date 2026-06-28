import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { dispatchTaskReminders } from '@/lib/taskReminders'
import { ensureProfile } from '@/lib/server/supabase'

async function resolveLegacyOwnerId(auth) {
  if (auth.actorProfile?.id) return auth.actorProfile.id
  const explicitProfileId = String(process.env.TASK_REMINDER_OWNER_PROFILE_ID || '').trim()
  if (explicitProfileId) return explicitProfileId
  const clerkUserId = String(
    process.env.SCHEDULE_OWNER_USER_ID ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0] ||
    ''
  ).trim()
  if (!clerkUserId) throw new Error('Legacy task reminder owner is not configured')
  const { profile } = await ensureProfile({ clerkUserId, role: 'owner', status: 'active' })
  if (!profile?.id) throw new Error('Legacy task reminder owner is unavailable')
  return profile.id
}

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req, { allowReminderToken: true })
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const ownerId = await resolveLegacyOwnerId(auth)
    const result = await dispatchTaskReminders({
      ownerId,
      channel: req.body?.channel || 'console',
      send: Boolean(req.body?.send),
      mark: req.body?.mark !== false,
      limit: req.body?.limit,
      now: req.body?.now
    })

    return res.status(200).json({
      ok: true,
      result
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid request'
    })
  }
}
