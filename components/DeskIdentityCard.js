import { useEffect, useMemo, useState } from 'react'

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

function formatClock(now) {
  if (!now) return { date: '今天', time: '--:--' }
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', weekday: 'short'
  }).format(now)
  return {
    date: date.replace(/星期/, '周'),
    time: new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  }
}

export function DeskIdentityCard({ collapsed = false, compact = false }) {
  const { session } = useWorkspaceSession()
  const profile = session?.profile || session?.actor || {}
  const [now, setNow] = useState(null)
  const [status, setStatus] = useState(null)
  const clock = useMemo(() => formatClock(now), [now])

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

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

  return <div className={`desk-identity-card ${collapsed ? 'is-collapsed' : ''} ${compact ? 'is-compact' : ''}`}>
    <span className='desk-identity-avatar' aria-hidden='true'>
      <img alt={avatarAlt} src={avatar} onError={event => { event.currentTarget.src = '/curacao-avatar.png' }} />
    </span>
    {!collapsed ? <div className='desk-identity-copy'>
      <div className='desk-identity-clock'><strong title={clock.date}>{clock.date}</strong><time>{clock.time}</time></div>
      <p>看到我记得喝口水</p>
      {!compact ? <div className='desk-identity-chips' aria-label='工作台状态'>
        {chips.map(chip => <span key={chip.label}><b>{chip.value}</b>{chip.label}</span>)}
      </div> : null}
    </div> : null}
  </div>
}
