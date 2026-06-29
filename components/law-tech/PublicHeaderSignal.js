import Link from 'next/link'
import { useEffect, useState } from 'react'

import { publicHomeDailyLines } from '@/lib/domain/publicHome'

function part(parts, type) {
  return parts.find(item => item.type === type)?.value || ''
}

function formatDateTime(date) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date)
  return `${part(parts, 'month')}月${part(parts, 'day')}日 ${part(parts, 'weekday')} · ${part(parts, 'hour')}:${part(parts, 'minute')}`
}

function lineFor(date) {
  const bucket = Math.floor(date.getTime() / (6 * 60 * 60 * 1000))
  return publicHomeDailyLines[Math.abs(bucket) % publicHomeDailyLines.length]
}

export function PublicHeaderSignal() {
  const [view, setView] = useState({
    label: '日期与时间',
    line: publicHomeDailyLines[0]
  })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setView({ label: formatDateTime(now), line: lineFor(now) })
    }
    update()
    const timer = window.setInterval(update, 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  return <>
    <Link className='public-header-signal' href='/' aria-label='返回首页'>
      <time suppressHydrationWarning>{view.label}</time>
      <small title={view.line.source || ''}>{view.line.text}</small>
    </Link>
    <style jsx>{`
      .public-header-signal {
        display:grid;
        min-width:0;
        max-width:330px;
        gap:4px;
        border-radius:12px;
        padding:7px 9px;
        transition:background .18s ease;
      }
      .public-header-signal:hover { background:rgba(220,233,223,.42); }
      time { color:var(--ink); font-size:11px; font-weight:700; letter-spacing:.015em; }
      small { overflow:hidden; color:var(--quiet); font-size:9px; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
      @media (max-width:520px) {
        .public-header-signal { max-width:190px; padding-left:3px; }
        small { max-width:180px; }
      }
    `}</style>
  </>
}
