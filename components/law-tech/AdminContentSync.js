import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

import { LawTechIcon } from '@/components/LawTechIcons'

const COOLDOWN_MS = 30000

export function AdminContentSync({ compact = true }) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [state, setState] = useState('idle')
  const [summary, setSummary] = useState('')
  const cooldownUntil = useRef(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : { admin: false })
      .then(data => { if (!cancelled) setIsAdmin(Boolean(data?.admin)) })
      .catch(() => { if (!cancelled) setIsAdmin(false) })
    return () => { cancelled = true }
  }, [])

  async function sync() {
    if (state === 'loading' || Date.now() < cooldownUntil.current) return
    setState('loading')
    setSummary('')
    try {
      const response = await fetch('/api/content/sync', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: router.asPath })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || '同步失败')
      cooldownUntil.current = Date.now() + COOLDOWN_MS
      const warnings = Array.isArray(data?.warnings) ? data.warnings.filter(Boolean) : []
      setState(warnings.length ? 'warning' : 'done')
      setSummary([
        `已同步 ${Number(data?.contentCount || 0)} 条内容`,
        data?.algolia?.available && !data?.algolia?.error ? `全文索引 ${Number(data.algolia.synced || 0)} 条` : '',
        Number(data?.algolia?.removed || 0) ? `清理旧索引 ${Number(data.algolia.removed)} 条` : '',
        warnings.join('；')
      ].filter(Boolean).join(' · '))
      await router.replace(router.asPath, undefined, { scroll: false })
      window.setTimeout(() => setState('idle'), 2200)
    } catch (error) {
      setState('error')
      setSummary(error instanceof Error ? error.message : '同步失败')
      window.setTimeout(() => setState('idle'), 3000)
    }
  }

  if (!isAdmin) return null
  const label = state === 'loading' ? '同步中' : state === 'done' ? '已同步' : state === 'warning' ? '已同步，有提示' : state === 'error' ? '重试同步' : '同步内容'
  return <span className={`admin-content-sync ${compact ? 'is-compact' : ''}`}>
    <button type='button' onClick={sync} disabled={state === 'loading'} title={summary || '从 Notion 重新拉取公开内容，并更新搜索与页面缓存'}>
      <LawTechIcon name={state === 'done' ? 'spark' : 'system'} size={14} />
      <span>{label}</span>
    </button>
    {summary && !compact ? <small role='status'>{summary}</small> : null}
    <style jsx>{`
      .admin-content-sync { display:inline-flex; align-items:center; gap:8px; }
      button { display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(17,63,49,.11); border-radius:999px; padding:8px 11px; color:var(--green); background:rgba(255,255,255,.5); font:inherit; font-size:11px; cursor:pointer; backdrop-filter:blur(14px); transition:transform .18s ease,background .18s ease; }
      button:hover:not(:disabled) { transform:translateY(-1px); background:rgba(255,255,255,.76); }
      button:disabled { cursor:wait; opacity:.66; }
      small { color:var(--quiet); font-size:10px; }
      .is-compact button { padding:7px 9px; }
      @media (max-width:760px) { .is-compact button span { display:none; } }
    `}</style>
  </span>
}
