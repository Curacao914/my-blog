function hasSessionCookie(req) {
  const cookie = req.headers.cookie || ''
  return /(?:^|;\s*)__session=/.test(cookie) || /(?:^|;\s*)__clerk_db_jwt=/.test(cookie)
}

export function getScheduleOwnerUserId(req) {
  const configuredOwner =
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.WECHAT_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    ''

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return configuredOwner
  if (process.env.ALLOW_LOCAL_DESK_FALLBACK === 'true') return configuredOwner

  return hasSessionCookie(req) ? configuredOwner : ''
}
