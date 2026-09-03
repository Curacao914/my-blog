function firstHeader(value) {
  if (Array.isArray(value)) return value[0] || ''
  return String(value || '').split(',')[0].trim()
}

function requestOrigin(req) {
  const forwardedProto = firstHeader(req?.headers?.['x-forwarded-proto'])
  const protocol = forwardedProto || (req?.socket?.encrypted ? 'https' : 'http')
  const forwardedHost = firstHeader(req?.headers?.['x-forwarded-host'])
  const host = forwardedHost || firstHeader(req?.headers?.host) || 'localhost:3000'
  return `${protocol === 'https' ? 'https' : 'http'}://${host}`
}

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || '').trim())
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.origin
  } catch {
    return ''
  }
}

export function canonicalAuthOrigin() {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_ORIGIN) ||
    'https://law-tech.dev'
  )
}

export function canonicalAuthRedirect(req, path = '/') {
  if (process.env.VERCEL_ENV !== 'production') return ''
  const canonical = canonicalAuthOrigin()
  if (normalizeOrigin(requestOrigin(req)) === canonical) return ''

  const destination = new URL(path || '/', canonical)
  return destination.toString()
}
