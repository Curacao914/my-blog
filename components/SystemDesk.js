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
  return <section className='settings-section'>
    <header><span>Site administration</span><h3>站点连接与维护</h3><p>这里是全站级配置。个人 API、邮件和提醒放在各自设置项中，不与站点连接混在一起。</p></header>
    {state === 'loading' ? <p className='settings-muted'>正在检测连接…</p> : state === 'error' ? <div className='settings-inline-notice is-error'>检测失败。<button type='button' onClick={onReload}>重新检测</button></div> : <>
      <div className='system-connection-table'>
        <div><span>数据库</span><StatePill ok={Boolean(health?.databaseReachable)}>{health?.databaseReachable ? '可连接' : '不可用'}</StatePill></div>
        <div><span>Storage</span><StatePill ok={Boolean(health?.storageConfigured)}>{health?.storageConfigured ? '已配置' : '未配置'}</StatePill></div>
        <div><span>Notion</span><StatePill ok={Boolean(health?.notionConfigured)}>{health?.notionConfigured ? '已配置' : '未配置'}</StatePill></div>
        <div><span>Algolia 搜索</span><StatePill ok={Boolean(health?.algoliaSearchConfigured)}>{health?.algoliaSearchConfigured ? '可搜索' : '使用本地索引'}</StatePill></div>
        <div><span>Algolia 管理</span><StatePill ok={Boolean(health?.algoliaAdminConfigured)}>{health?.algoliaAdminConfigured ? '可更新索引' : '只读或未配置'}</StatePill></div>
        <div><span>提醒 Cron</span><StatePill ok={Boolean(health?.reminderCronConfigured)}>{health?.reminderCronConfigured ? '已配置' : '未配置'}</StatePill></div>
      </div>
      <div className='settings-subsection'><div><h4>同步公开内容</h4><p>清除缓存、重新读取 Notion，并在配置存在时更新 Algolia。</p></div><AdminContentSync compact={false} /></div>
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
      setHealth(await response.json()); setHealthState('ready')
    } catch { setHealthState('error') }
  }

  useEffect(() => { if (section === 'site' && healthState === 'idle') loadHealth() }, [section, isOwnerView])

  function choose(key) {
    setSection(key)
    void router.replace({ pathname: router.pathname, query: key === 'account' ? {} : { section: key } }, undefined, { shallow: true, scroll: false })
  }

  return <div className='system-settings'>
    <header className='settings-page-head'><div><span>Settings</span><h2>设置</h2><p>账号、私人服务和管理员配置分开管理。切换测试身份后，个人设置会跟随该成员。</p></div></header>
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
