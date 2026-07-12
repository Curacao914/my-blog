import { useCallback, useEffect, useState } from 'react'

let cached = null
let cachedAt = 0
let inflight = null
let serverPrimedKey = ''
const listeners = new Set()

const SIGNED_IN_TTL = 60 * 1000
const SIGNED_OUT_TTL = 3 * 1000

function serverSessionKey(session = {}) {
  return [
    session.sessionId || '',
    session.actor?.id || '',
    session.profile?.id || '',
    session.impersonating ? '1' : '0'
  ].join(':')
}

function publish(session) {
  listeners.forEach(listener => listener(session))
}

function cacheValue(value) {
  cached = value
  cachedAt = Date.now()
  inflight = null
  publish(value)
  return value
}

function cacheIsFresh() {
  if (!cached) return false
  const ttl = cached.signedIn ? SIGNED_IN_TTL : SIGNED_OUT_TTL
  return Date.now() - cachedAt < ttl
}

export function primeWorkspaceSession(session) {
  if (typeof window === 'undefined' || !session) return

  const key = serverSessionKey(session)
  if (!key) return
  if (key === serverPrimedKey && cached?.signedIn) return

  serverPrimedKey = key
  cacheValue({
    ok: true,
    signedIn: true,
    ...session
  })
}

export function markWorkspaceSignedOut() {
  serverPrimedKey = ''
  return cacheValue({ ok: true, signedIn: false })
}

async function loadSession({ force = false } = {}) {
  if (!force && cacheIsFresh()) return cached
  if (inflight) return inflight

  const fallback = cached?.signedIn ? cached : null
  inflight = fetch('/api/account/session', {
    credentials: 'same-origin',
    cache: 'no-store'
  })
    .then(async response => {
      const data = await response.json().catch(() => ({}))
      const value = { ...data, httpStatus: response.status }

      if (value.code === 'handshake' && value.redirectUrl) {
        inflight = null
        if (typeof window !== 'undefined') {
          window.location.assign(value.redirectUrl)
        }
        return fallback || value
      }

      if (value.retryable && fallback) {
        inflight = null
        return {
          ...fallback,
          stale: true,
          warning: value.error || 'session refresh failed'
        }
      }

      return cacheValue(value)
    })
    .catch(error => {
      inflight = null
      if (fallback) {
        return {
          ...fallback,
          stale: true,
          warning: error instanceof Error ? error.message : 'session refresh failed'
        }
      }
      const value = {
        ok: false,
        signedIn: false,
        retryable: true,
        error: error instanceof Error ? error.message : 'session failed'
      }
      publish(value)
      return value
    })

  return inflight
}

export function clearWorkspaceSessionCache() {
  cached = null
  cachedAt = 0
  inflight = null
  serverPrimedKey = ''
}

export function useWorkspaceSession() {
  const [state, setState] = useState({
    loading: !cached,
    session: cached
  })

  const refresh = useCallback(async () => {
    setState(current => ({ ...current, loading: !current.session }))
    const session = await loadSession({ force: true })
    setState({ loading: false, session })
    return session
  }, [])

  useEffect(() => {
    let cancelled = false
    const listener = session => {
      if (!cancelled) setState({ loading: false, session })
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible' && !cacheIsFresh()) {
        void loadSession({ force: true })
      }
    }
    const refreshOnFocus = () => {
      if (!cacheIsFresh()) void loadSession({ force: true })
    }

    listeners.add(listener)
    void loadSession().then(session => {
      if (!cancelled) setState({ loading: false, session })
    })
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshOnFocus)

    return () => {
      cancelled = true
      listeners.delete(listener)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [])

  return { ...state, refresh }
}
