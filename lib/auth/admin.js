function splitEnvList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getPrimaryEmail(user) {
  if (!user) return ''

  if (typeof user.email === 'string') return user.email

  const primaryEmailId = user.primaryEmailAddressId
  const emailAddresses = Array.isArray(user.emailAddresses)
    ? user.emailAddresses
    : []

  const primary = emailAddresses.find(item => item.id === primaryEmailId)
  return primary?.emailAddress || emailAddresses[0]?.emailAddress || ''
}

export function getAdminAllowlist() {
  return {
    emails: splitEnvList(process.env.CLERK_ADMIN_EMAILS).map(email =>
      email.toLowerCase()
    ),
    userIds: splitEnvList(process.env.CLERK_ADMIN_USER_IDS)
  }
}

export function isAdminUser(user) {
  if (!user) return false

  const { emails, userIds } = getAdminAllowlist()
  const userId = user.id || user.userId || ''
  const email = getPrimaryEmail(user).toLowerCase()

  if (userId && userIds.includes(userId)) return true
  if (email && emails.includes(email)) return true

  return false
}

export function hasAdminAllowlist() {
  const { emails, userIds } = getAdminAllowlist()
  return emails.length > 0 || userIds.length > 0
}
