import { useCallback, useEffect, useState } from 'react'

let cached = null
let inflight = null

async function loadSession() {
  if (cached) return cached
  if (inflight) return inflight
  inflight = fetch('/api/account/session', { credentials: 'same-origin', cache: 'no-store' })
    .then(async response => {
      const data = await response.json().catch(() => ({}))
      const value = { ...data, httpStatus: response.status }
      cached = value
      inflight = null
      return value
    })
    .catch(error => {
      inflight = null
      return { ok: false, signedIn: false, error: error instanceof Error ? error.message : 'session failed' }
    })
  return inflight
}

export function clearWorkspaceSessionCache() {
  cached = null
  inflight = null
}

export function useWorkspaceSession() {
  const [state, setState] = useState({ loading: true, session: cached })

  const refresh = useCallback(async () => {
    clearWorkspaceSessionCache()
    setState(current => ({ ...current, loading: true }))
    const session = await loadSession()
    setState({ loading: false, session })
    return session
  }, [])

  useEffect(() => {
    let cancelled = false
    loadSession().then(session => {
      if (!cancelled) setState({ loading: false, session })
    })
    return () => { cancelled = true }
  }, [])

  return { ...state, refresh }
}
