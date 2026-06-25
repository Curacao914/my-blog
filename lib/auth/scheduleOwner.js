import { getAuth } from '@clerk/nextjs/server'

export function getScheduleOwnerUserId(req) {
  const configuredOwner =
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.WECHAT_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    'local-dev'

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return configuredOwner

  try {
    return getAuth(req).userId || configuredOwner
  } catch {
    return configuredOwner
  }
}
