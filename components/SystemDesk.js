import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

import { AccountSettings } from '@/components/AccountSettings'
import { AiSettings } from '@/components/AiSettings'
import { AiUsageSettings } from '@/components/AiUsageSettings'
import { CourseAutomationSettings } from '@/components/CourseAutomationSettings'
import { MemberManagement } from '@/components/MemberManagement'
import { OpenClawAgentStudio } from '@/components/OpenClawAgentStudio'
import { WechatSettings } from '@/components/WechatSettings'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'
import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'

function StatePill({ ok, children }) {
  return (
    <span className={`system-state-pill ${ok ? 'is-ok' : 'is-warn'}`}>
      <i />
      {children}
    </span>
  )
}

function ConnectionRows({ rows = [] }) {
  return (
    <div className='system-connection-table'>
      {rows.map(([label, ok, status, source]) => (
        <div key={label}>
          <span>
            <strong>{label}</strong>
            <small>{source}</small>
          </span>
          <StatePill ok={ok}>{status}</StatePill>
        </div>
      ))}
    </div>
  )
}

function ContentMaintenance({ health, state, onReload }) {
  const rows = [
    ['Notion 中转', Boolean(health?.notionConfigured), health?.notionConfigured ? '已连接' : '未配置', '公开文章来源'],
    ['全文搜索', Boolean(health?.algoliaSearchConfigured), health?.algoliaSearchConfigured ? '可搜索' : '本地索引', 'Algolia'],
    ['搜索更新', Boolean(health?.algoliaAdminConfigured), health?.algoliaAdminConfigured ? '可更新' : '未配置', 'Algolia Admin']
  ]

  return (
    <section className='settings-section site-settings'>
      <header><span>Content</span><h3>内容与同步</h3></header>
      {state === 'loading' || state === 'idle' ? (
        <p className='settings-muted'>检测中…</p>
      ) : state === 'error' ? (
        <div className='settings-inline-notice is-error'>
          检测失败
          <button type='button' onClick={onReload}>重试</button>
        </div>
      ) : (
        <>
          <ConnectionRows rows={rows} />
          <div className='settings-subsection notion-sync-settings'>
            <div>
              <h4>立即更新 Notion 文章</h4>
              <p>
                重新拉取 Notion，提升稳定快照，并同步搜索与页面缓存。
                缓存尚未自动更新时，可以在这里手动取得最新内容。
              </p>
            </div>
            <AdminContentSync compact={false} />
          </div>
          <div className='settings-actions site-maintenance-actions'>
            <button type='button' onClick={onReload}>重新检测</button>
          </div>
        </>
      )}
    </section>
  )
}

function SiteConnections({ health, state, onReload }) {
  const rows = [
    ['数据库', Boolean(health?.databaseReachable), health?.databaseReachable ? '可连接' : '不可用', 'Supabase'],
    ['文件存储', Boolean(health?.storageConfigured), health?.storageConfigured ? '已配置' : '未配置', 'Supabase Storage'],
    ['消息准备 Cron', Boolean(health?.reminderCronConfigured), health?.reminderCronConfigured ? '已配置' : '未配置', 'Vercel / OpenClaw'],
    ['微信发送队列表', Boolean(health?.messageDeliveriesReady), health?.messageDeliveriesReady ? '可用' : '等待迁移', 'message_deliveries']
  ]

  return (
    <section className='settings-section site-settings'>
      <header><span>Infrastructure</span><h3>站点与连接</h3></header>
      {state === 'loading' || state === 'idle' ? (
        <p className='settings-muted'>检测中…</p>
      ) : state === 'error' ? (
        <div className='settings-inline-notice is-error'>
          检测失败
          <button type='button' onClick={onReload}>重试</button>
        </div>
      ) : (
        <>
          <ConnectionRows rows={rows} />
          <div className='settings-actions site-maintenance-actions'>
            <button type='button' onClick={onReload}>重新检测</button>
          </div>
        </>
      )}
    </section>
  )
}

export function SystemDesk() {
  const router = useRouter()
  const { session } = useWorkspaceSession()
  const actorIsOwner = Boolean(session?.isOwner)
  const isOwnerView =
    actorIsOwner &&
    !session?.impersonating &&
    session?.profile?.role === 'owner'
  const [section, setSection] = useState('account')
  const [healthState, setHealthState] = useState('idle')
  const [health, setHealth] = useState(null)

  const role = session?.profile?.role
  const permissions = session?.profile?.permissions || {}
  const canUseAi = role === 'owner' || Boolean(permissions.ai)
  const canUseReminders = role === 'owner' || Boolean(permissions.reminders)
  const canUseCourses = role === 'owner' || Boolean(permissions.courses)

  const groups = useMemo(() => [
    { label: '个人', items: [{ key: 'account', label: '账号' }] },
    {
      label: '智能服务',
      items: canUseAi ? [
        { key: 'ai', label: '模型与 API' },
        { key: 'ai-usage', label: '用量与费用' }
      ] : []
    },
    {
      label: '消息与日程',
      items: canUseReminders ? [
        { key: 'wechat', label: '微信与提醒' }
      ] : []
    },
    {
      label: '课程',
      items: canUseCourses ? [
        { key: 'courses', label: '课程自动化' }
      ] : []
    },
    {
      label: '站点',
      items: isOwnerView ? [
        { key: 'agent-studio', label: 'Agent Studio' },
        { key: 'content', label: '内容与同步' },
        { key: 'site', label: '站点与连接' },
        { key: 'members', label: '成员与权限' }
      ] : []
    }
  ].filter(group => group.items.length), [
    canUseAi,
    canUseReminders,
    canUseCourses,
    isOwnerView
  ])

  const sections = useMemo(() => groups.flatMap(group => group.items), [groups])

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
      const response = await fetch('/api/admin/health', {
        credentials: 'same-origin'
      })
      if (!response.ok) throw new Error('health')
      setHealth(await response.json())
      setHealthState('ready')
    } catch {
      setHealthState('error')
    }
  }

  useEffect(() => {
    if (
      isOwnerView &&
      healthState === 'idle' &&
      ['content', 'site'].includes(section)
    ) {
      loadHealth()
    }
  }, [section, isOwnerView, healthState])

  function choose(key) {
    setSection(key)
    void router.replace(
      {
        pathname: router.pathname,
        query: key === 'account' ? {} : { section: key }
      },
      undefined,
      { shallow: true, scroll: false }
    )
  }

  return (
    <div className='system-settings'>
      <header className='settings-page-head'>
        <div>
          <span>Settings</span>
          <h2>设置</h2>
          <p>
            通用模型、课程自动化、微信发送、内容同步与站点连接各自归位，
            不再让一个 API 同时出现在三块页面里。
          </p>
        </div>
      </header>

      <div className='settings-layout'>
        <nav className='settings-nav' aria-label='设置栏目'>
          {groups.map(group => (
            <div className='settings-nav-group' key={group.label}>
              <span>{group.label}</span>
              {group.items.map(item => (
                <button
                  aria-current={section === item.key ? 'page' : undefined}
                  key={item.key}
                  onClick={() => choose(item.key)}
                  type='button'
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <main className='settings-content'>
          {section === 'account' ? <AccountSettings /> : null}
          {section === 'ai' ? <AiSettings /> : null}
          {section === 'ai-usage' ? <AiUsageSettings /> : null}
          {section === 'wechat' ? <WechatSettings /> : null}
          {section === 'courses' ? <CourseAutomationSettings /> : null}
          {section === 'agent-studio' && isOwnerView ? (
            <OpenClawAgentStudio />
          ) : null}
          {section === 'content' && isOwnerView ? (
            <ContentMaintenance health={health} onReload={loadHealth} state={healthState} />
          ) : null}
          {section === 'site' && isOwnerView ? (
            <SiteConnections health={health} onReload={loadHealth} state={healthState} />
          ) : null}
          {section === 'members' && isOwnerView ? (
            <MemberManagement actorId={session?.actor?.id || ''} />
          ) : null}
        </main>
      </div>
    </div>
  )
}
