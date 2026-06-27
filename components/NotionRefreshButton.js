import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

const COOLDOWN_MS = 30 * 1000

export default function NotionRefreshButton() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [state, setState] = useState('idle')
  const cooldownUntilRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : { admin: false })
      .then(data => {
        if (!cancelled) setIsAdmin(Boolean(data?.admin))
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => { cancelled = true }
  }, [])

  async function refreshContent() {
    if (state === 'loading' || Date.now() < cooldownUntilRef.current) return
    setState('loading')
    try {
      const response = await fetch('/api/content/revalidate', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: router.asPath })
      })
      if (!response.ok) throw new Error('refresh failed')
      cooldownUntilRef.current = Date.now() + COOLDOWN_MS
      setState('done')
      await router.replace(router.asPath, undefined, { scroll: false })
      window.setTimeout(() => setState('idle'), 1800)
    } catch {
      setState('error')
      window.setTimeout(() => setState('idle'), 2600)
    }
  }

  if (!isAdmin) return null
  const title = state === 'loading' ? '正在刷新 Notion 内容' : state === 'done' ? '内容已更新' : state === 'error' ? '刷新失败' : '刷新 Notion 内容'
  const icon = state === 'done' ? 'fa-check' : state === 'error' ? 'fa-triangle-exclamation' : 'fa-rotate'
  return <button type='button' title={title} aria-label={title} disabled={state === 'loading'} onClick={refreshContent}
    className='cursor-pointer dark:text-white hover:bg-black hover:bg-opacity-10 rounded-full w-10 h-10 flex justify-center items-center duration-200 transition-all disabled:cursor-wait'>
    <i className={`fa-solid ${icon} ${state === 'loading' ? 'animate-spin' : ''}`} />
  </button>
}
