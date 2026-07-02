const DEFAULT_AUTH_REDIRECT = '/desk/today'

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value
}

export function safeAuthRedirect(value, fallback = DEFAULT_AUTH_REDIRECT) {
  const candidate = String(firstValue(value) || '').trim()
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback
  if (candidate.startsWith('/sign-in') || candidate.startsWith('/sign-up'))
    return fallback
  return candidate
}

export function authRedirectFromQuery(
  query = {},
  fallback = DEFAULT_AUTH_REDIRECT
) {
  return safeAuthRedirect(query.redirect_url ?? query.redirectTo, fallback)
}
