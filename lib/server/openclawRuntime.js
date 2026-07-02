import { ensureProfile } from '@/lib/server/supabase'
import { getUserIntegration } from '@/lib/server/userIntegrations'
import { listWorkspaceProfiles } from '@/lib/server/workspaceProfiles'

export async function resolveOpenClawOwnerProfile() {
  const clerkUserId = String(
    process.env.WECHAT_OWNER_USER_ID ||
    process.env.SCHEDULE_OWNER_USER_ID ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0] ||
    ''
  ).trim()

  if (clerkUserId) {
    const result = await ensureProfile({
      clerkUserId,
      role: 'owner',
      status: 'active'
    })
    if (result?.profile) return result.profile
  }

  const profiles = await listWorkspaceProfiles()
  const owners = (profiles || []).filter(profile =>
    profile.role === 'owner' &&
    profile.status === 'active'
  )
  if (owners.length === 1) return owners[0]

  throw new Error(
    owners.length
      ? 'Multiple active owners exist; configure WECHAT_OWNER_USER_ID'
      : 'No active OpenClaw owner is available'
  )
}

export async function resolveOpenClawRuntimePreference(profile) {
  const record = await getUserIntegration(
    profile.id,
    'openai-compatible'
  )
  const config = record?.config || {}
  return {
    enabled: config.openclawSyncEnabled !== false,
    model:
      config.openclawModel ||
      'deepseek/deepseek-v4-flash',
    updatedAt: record?.updated_at || null
  }
}
