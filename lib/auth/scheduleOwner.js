import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'

export async function getScheduleOwnerUserId(req) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return ''
  const configuredOwner = process.env.SCHEDULE_OWNER_USER_ID?.trim() || process.env.WECHAT_OWNER_USER_ID?.trim() || process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() || ''
  if (configuredOwner) return configuredOwner
  const candidate = await getAdminCandidate(req)
  return candidate.userId || (auth.via === 'local-dev' ? 'local-dev' : '')
}
