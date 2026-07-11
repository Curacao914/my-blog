import Link from 'next/link'
import { useEffect, useState } from 'react'

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

export function PublicHeaderSignal() {
  const [label, setLabel] = useState('日期与时间')

  useEffect(() => {
    const update = () => setLabel(formatDateTime(new Date()))
    update()
    const timer = window.setInterval(update, 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <Link className='public-header-signal public-header-signal-v7' href='/' aria-label='返回首页'>
      <time suppressHydrationWarning>{label}</time>
    </Link>
  )
}
