import { useEffect, useState } from 'react'

import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'

const STATUS_CACHE_TTL = 60 * 1000

function cacheKey(profileId = '') {
  return `law-tech-workspace-status:${profileId || 'unknown'}`
}

function readCachedStatus(profileId) {
  if (typeof window === 'undefined') return null
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(cacheKey(profileId)) || 'null')
    if (!cached?.value || Date.now() - Number(cached.savedAt || 0) > STATUS_CACHE_TTL) return null
    return cached.value
  } catch {
    return null
  }
}

function writeCachedStatus(profileId, value) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(cacheKey(profileId), JSON.stringify({ savedAt: Date.now(), value }))
  } catch {}
}

export function DeskIdentityCard({ collapsed = false, compact = false }) {
  const { session } = useWorkspaceSession()
  const profile = session?.profile || session?.actor || {}
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const profileId = profile.id || ''
    const cached = readCachedStatus(profileId)
    setStatus(cached || null)
    let cancelled = false
    fetch('/api/desk/status', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled || !data?.status) return
        setStatus(data.status)
        writeCachedStatus(profileId, data.status)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [profile.id])

  const chips = [
    { label: '今日', value: status?.today ?? '—' },
    { label: '待办', value: status?.active ?? '—' },
    { label: '草稿', value: status?.drafts ?? '—' }
  ]
  const avatar = profile.avatarUrl || '/curacao-avatar.png'
  const avatarAlt = profile.displayName ? `${profile.displayName} 的头像` : '工作台头像'
  const displayName = profile.displayName || profile.email || 'Curacao'

  return <div className={`desk-identity-card desk-identity-card-v7 ${collapsed ? 'is-collapsed' : ''} ${compact ? 'is-compact' : ''}`}>
    <span className='desk-identity-avatar' aria-hidden='true'>
      <img alt={avatarAlt} src={avatar} onError={event => { event.currentTarget.src = '/curacao-avatar.png' }} />
    </span>
    {!collapsed ? <div className='desk-identity-copy'>
      <div className='desk-identity-name'><strong>{displayName}</strong><small>{profile.role === 'owner' ? '私人工作区' : '工作区'}</small></div>
      {!compact ? <div className='desk-identity-chips' aria-label='工作台状态'>
        {chips.map(chip => <span key={chip.label}><b>{chip.value}</b><small>{chip.label}</small></span>)}
      </div> : null}
    </div> : null}
  </div>
}
