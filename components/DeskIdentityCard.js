import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const STATUS_CACHE_KEY = 'law-tech-workspace-status'
const STATUS_CACHE_TTL = 60 * 1000

function readCachedStatus() {
  if (typeof window === 'undefined') return null
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(STATUS_CACHE_KEY) || 'null')
    if (!cached?.value || Date.now() - Number(cached.savedAt || 0) > STATUS_CACHE_TTL) return null
    return cached.value
  } catch {
    return null
  }
}

function writeCachedStatus(value) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), value }))
  } catch {}
}

function formatClock(now) {
  if (!now) return { date: '今天', time: '--:--' }
  const parts = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return {
    date: `${values.month || ''}月${values.day || ''}日 · ${values.weekday || ''}`,
    time: new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now)
  }
}

export function DeskIdentityCard({ collapsed = false, compact = false }) {
  const [now, setNow] = useState(null)
  const [status, setStatus] = useState(null)
  const clock = useMemo(() => formatClock(now), [now])

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const cached = readCachedStatus()
    if (cached) setStatus(cached)
    let cancelled = false
    fetch('/api/desk/status', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled || !data?.status) return
        setStatus(data.status)
        writeCachedStatus(data.status)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const chips = [
    { label: '今日', value: status?.today ?? '—' },
    { label: '待办', value: status?.active ?? '—' },
    { label: '草稿', value: status?.drafts ?? '—' }
  ]

  return <div className={`desk-identity-card ${collapsed ? 'is-collapsed' : ''} ${compact ? 'is-compact' : ''}`}>
    <Link className='desk-identity-avatar' href='/' aria-label='返回 law-tech 首页'>
      <img alt='Curacao 的像素林克头像' src='/curacao-avatar.png' />
    </Link>
    {!collapsed ? <div className='desk-identity-copy'>
      <div className='desk-identity-clock'><strong>{clock.date}</strong><time>{clock.time}</time></div>
      <p>看到我记得喝口水</p>
      {!compact ? <div className='desk-identity-chips' aria-label='工作台状态'>
        {chips.map(chip => <span key={chip.label}><b>{chip.value}</b>{chip.label}</span>)}
      </div> : null}
    </div> : null}
  </div>
}
