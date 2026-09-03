const KNOWN_CAPTURE_PATHS = [
  /\/api\/schedule\/capture\/?$/,
  /\/api\/integrations\/openclaw\/command\/?$/
]

function trimKnownCapturePath(pathname = '') {
  let value = String(pathname || '')

  for (const pattern of KNOWN_CAPTURE_PATHS) {
    value = value.replace(pattern, '')
  }

  return value.replace(/\/+$/, '')
}

export function normalizeLawTechBaseUrl(input = '') {
  const raw = String(input || '').trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const pathname = trimKnownCapturePath(url.pathname)

    url.pathname = pathname || '/'
    url.search = ''
    url.hash = ''

    return url.toString().replace(/\/$/, '')
  } catch {
    return trimKnownCapturePath(raw)
  }
}
