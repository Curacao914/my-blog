import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

import { AccountSettings } from '@/components/AccountSettings'
import { AiSettings } from '@/components/AiSettings'
import { EmailSettings } from '@/components/EmailSettings'
import { MemberManagement } from '@/components/MemberManagement'
import { ReminderSettings } from '@/components/ReminderSettings'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'
import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'

function StatePill({ ok, children }) {
  return <span className={`system-state-pill ${ok ? 'is-ok' : 'is-warn'}`}><i />{children}</span>
}

function SiteConnections({ health, state, onReload }) {
  const rows = [
    ['数据库', Boolean(health?.databaseReachable), health?.databaseReachable ? '可连接' : '不可用', 'Supabase'],
    ['Storage', Boolean(health?.storageConfigured), health?.storageConfigured ? '已配置' : '未配置', 'Supabase'],
    ['Notion', Boolean(health?.notionConfigured), health?.notionConfigured ? '已配置' : '未配置', 'Vercel'],
    ['Algolia 搜索', Boolean(health?.algoliaSearchConfigured), health?.algoliaSearchConfigured ? '可搜索' : '本地索引', 'Vercel'],
    ['Algolia 管理', Boolean(health?.algoliaAdminConfigured), health?.algoliaAdminConfigured ? '可更新' : '未配置', 'Vercel'],
    ['提醒 Cron', Boolean(health?.reminderCronConfigured), health?.reminderCronConfigured ? '已配置' : '未配置', 'Vercel']
  ]

  return <section className='settings-section site-settings'>
    <header><span>Site</span><h3>站点维护</h3></header>
    {state === 'loading' || state === 'idle' ? <p className='settings-muted'>检测中…</p> : state === 'error' ? <div className='settings-inline-notice is-error'>检测失败<button type='button' onClick={onReload}>重试</button></div> : <>
      <div className='system-connection-table'>
        {rows.map(([label, ok, status, source]) => <div key={label}><span><strong>{label}</strong><small>{source}</small></span><StatePill ok={ok}>{status}</StatePill></div>)}
      </div>
      <div className='settings-actions site-maintenance-actions'><button type='button' onClick={onReload}>重新检测</button></div>
      <div className='settings-subsection'><div><h4>公开内容</h4></div><AdminContentSync compact={false} /></div>
    </>}
  </section>
}

export function SystemDesk() {
  const router = useRouter()
  const { session } = useWorkspaceSession()
  const actorIsOwner = Boolean(session?.isOwner)
  const isOwnerView = actorIsOwner && !session?.impersonating && session?.profile?.role === 'owner'
  const [section, setSection] = useState('account')
  const [healthState, setHealthState] = useState('idle')
  const [health, setHealth] = useState(null)

  const canUseAi = session?.profile?.role === 'owner' || Boolean(session?.profile?.permissions?.ai)
  const canUseReminders = session?.profile?.role === 'owner' || Boolean(session?.profile?.permissions?.reminders)
  const sections = useMemo(() => [
    { key: 'account', label: '账号' },
    ...(canUseAi ? [{ key: 'ai', label: 'AI' }] : []),
    ...(canUseReminders ? [{ key: 'email', label: '邮件发送' }, { key: 'reminders', label: '提醒' }] : []),
    ...(isOwnerView ? [{ key: 'members', label: '成员与权限' }, { key: 'site', label: '站点维护' }] : [])
  ], [canUseAi, canUseReminders, isOwnerView])

  useEffect(() => {
    if (!router.isReady) return
    const requested = String(router.query.section || '')
    if (sections.some(item => item.key === requested)) setSection(requested)
  }, [router.isReady, router.query.section, sections])

  useEffect(() => {
    if (!sections.some(item => item.key === section)) setSection('account')
  }, [section, sections])

  async function loadHealth() {
    if (!isOwnerView) return
    setHealthState('loading')
    try {
      const response = await fetch('/api/admin/health', { credentials: 'same-origin' })
      if (!response.ok) throw new Error('health')
      setHealth(await response.json())
      setHealthState('ready')
    } catch {
      setHealthState('error')
    }
  }

  useEffect(() => {
    if (section === 'site' && healthState === 'idle') loadHealth()
  }, [section, isOwnerView])

  function choose(key) {
    setSection(key)
    void router.replace({ pathname: router.pathname, query: key === 'account' ? {} : { section: key } }, undefined, { shallow: true, scroll: false })
  }

  return <div className='system-settings'>
    <header className='settings-page-head'><div><span>Settings</span><h2>设置</h2></div></header>
    <div className='settings-layout'>
      <nav className='settings-nav' aria-label='设置栏目'>{sections.map(item => <button aria-current={section === item.key ? 'page' : undefined} key={item.key} onClick={() => choose(item.key)} type='button'>{item.label}</button>)}</nav>
      <main className='settings-content'>
        {section === 'account' ? <AccountSettings /> : null}
        {section === 'ai' ? <AiSettings /> : null}
        {section === 'email' ? <EmailSettings /> : null}
        {section === 'reminders' ? <ReminderSettings cronConfigured={Boolean(health?.reminderCronConfigured)} /> : null}
        {section === 'members' && isOwnerView ? <MemberManagement actorId={session?.actor?.id || ''} /> : null}
        {section === 'site' && isOwnerView ? <SiteConnections health={health} onReload={loadHealth} state={healthState} /> : null}
      </main>
    </div>
  </div>
}
