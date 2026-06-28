import Link from 'next/link'
import { useEffect, useState } from 'react'
import { deskNav } from '@/lib/domain/navigation'
import { LawTechIcon } from '@/components/LawTechIcons'
import { DeskIdentityCard } from '@/components/DeskIdentityCard'
import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'
import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'

const COLLAPSE_KEY = 'law-tech-desk-sidebar-collapsed'

const NAV_PERMISSION = { today: 'schedule', tasks: 'schedule', inbox: 'notes', reading: 'reading', courses: 'courses', materials: 'courses', writing: 'writing', publish: 'writing' }

function DeskNavigation({ active, onNavigate, profile }) {
  const groups = deskNav.map(group => ({ ...group, items: group.items.filter(item => profile?.role === 'owner' || !NAV_PERMISSION[item.key] || profile?.permissions?.[NAV_PERMISSION[item.key]]) })).filter(group => group.items.length)
  return <nav className='desk-nav' aria-label='工作台导航'>
    {groups.map(group => (
      <div className='desk-nav-group' key={group.group}>
        <p>{group.group}</p>
        {group.items.map(item => (
          <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} title={item.label} onClick={onNavigate}>
            <LawTechIcon name={item.key} size={18} />
            <span>{item.label}</span>
            {active === item.key ? <i aria-hidden='true' /> : null}
          </Link>
        ))}
      </div>
    ))}
  </nav>
}

export function DeskShell({ active = 'today', title, kicker, children }) {
  const { session } = useWorkspaceSession()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeItem = deskNav.flatMap(group => group.items).find(item => item.key === active)

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
  }, [])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  function toggleSidebar() {
    setCollapsed(value => {
      const next = !value
      window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className={`desk-layout desk-${active} ${collapsed ? 'desk-sidebar-collapsed' : ''}`}>
      <div className='desk-ambient desk-ambient-one' aria-hidden='true' />
      <div className='desk-ambient desk-ambient-two' aria-hidden='true' />
      <aside className='desk-sidebar'>
        <div className='desk-brand-row'>
          <DeskIdentityCard collapsed={collapsed} />
          <button className='desk-collapse-button' type='button' onClick={toggleSidebar} aria-label={collapsed ? '展开侧栏' : '收起侧栏'}>
            <LawTechIcon name={collapsed ? 'expand' : 'collapse'} size={16} />
          </button>
        </div>
        <DeskNavigation active={active} profile={session?.profile} />
        <div className='desk-sidebar-foot'>
          <span><i /> 私人工作区</span>
        </div>
      </aside>

      <main className='desk-main'>
        <header className='desk-topbar'>
          <div className='desk-route'>
            <button className='desk-mobile-menu-button' type='button' aria-label='打开工作台导航' aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
              <LawTechIcon name='menu' size={18} />
            </button>
            <span className='desk-route-icon'><LawTechIcon name={active} size={17} /></span>
            <div>
              <span className='eyebrow'>{kicker}</span>
              <strong>{activeItem?.label || title}</strong>
            </div>
          </div>
          <div className='desk-top-actions'>
            <WorkspaceAccountMenu placement='desk' />
          </div>
        </header>

        <div className={`desk-mobile-drawer-shell ${mobileOpen ? 'is-open' : ''}`} aria-hidden={!mobileOpen}>
          <button className='desk-mobile-drawer-backdrop' type='button' aria-label='关闭工作台导航' onClick={() => setMobileOpen(false)} />
          <aside className='desk-mobile-drawer' aria-label='移动端工作台导航'>
            <header><DeskIdentityCard compact /><button type='button' aria-label='关闭导航' onClick={() => setMobileOpen(false)}>×</button></header>
            <DeskNavigation active={active} profile={session?.profile} onNavigate={() => setMobileOpen(false)} />
            <footer><i /> 私人工作区</footer>
          </aside>
        </div>

        <section className={`desk-page desk-page-${active}`}>
          <div className='desk-page-content'>{children}</div>
        </section>
      </main>
    </div>
  )
}
