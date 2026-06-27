import { clerkClient } from '@clerk/nextjs/server'

function firstHeader(value) {
  if (Array.isArray(value)) return value[0] || ''
  return String(value || '').split(',')[0].trim()
}

function appendHeader(headers, name, value) {
  if (Array.isArray(value)) {
    value.forEach(item => headers.append(name, String(item)))
    return
  }
  if (value !== undefined) headers.set(name, String(value))
}

export function requestOrigin(req) {
  const forwardedProto = firstHeader(req?.headers?.['x-forwarded-proto'])
  const protocol = forwardedProto || (req?.socket?.encrypted ? 'https' : 'http')
  const forwardedHost = firstHeader(req?.headers?.['x-forwarded-host'])
  const host = forwardedHost || firstHeader(req?.headers?.host) || 'localhost:3000'
  const safeProtocol = protocol === 'https' ? 'https' : 'http'
  return `${safeProtocol}://${host}`
}

export function nodeRequestToWebRequest(req) {
  const origin = requestOrigin(req)
  const url = new URL(req?.url || '/', origin)
  const headers = new Headers()

  Object.entries(req?.headers || {}).forEach(([name, value]) => {
    appendHeader(headers, name, value)
  })

  return new Request(url, {
    method: req?.method || 'GET',
    headers
  })
}

function configuredAuthorizedParties(req) {
  const configured = String(process.env.CLERK_AUTHORIZED_PARTIES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  return configured.length ? configured : [requestOrigin(req)]
}

export async function authenticateClerkRequest(req) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return {
      status: 'unconfigured',
      isAuthenticated: false,
      auth: null,
      redirectUrl: ''
    }
  }

  try {
    const client = await clerkClient()
    const state = await client.authenticateRequest(nodeRequestToWebRequest(req), {
      authorizedParties: configuredAuthorizedParties(req)
    })

    if (state.status === 'handshake') {
      return {
        status: 'handshake',
        isAuthenticated: false,
        auth: null,
        redirectUrl:
          state.headers?.get('location') ||
          state.headers?.get('x-clerk-redirect-to') ||
          ''
      }
    }

    const auth = state.toAuth()
    return {
      status: state.status,
      isAuthenticated: state.status === 'signed-in' && Boolean(auth?.userId),
      auth,
      redirectUrl: ''
    }
  } catch (error) {
    console.error('Clerk request authentication failed', {
      message: error instanceof Error ? error.message : 'unknown error'
    })
    return {
      status: 'error',
      isAuthenticated: false,
      auth: null,
      redirectUrl: ''
    }
  }
}
