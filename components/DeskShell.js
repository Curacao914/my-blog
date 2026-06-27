import Link from 'next/link'
import { useEffect, useState } from 'react'
import { deskNav } from '@/lib/domain/navigation'
import { LawTechIcon } from '@/components/LawTechIcons'

const COLLAPSE_KEY = 'law-tech-desk-sidebar-collapsed'

function DeskNavigation({ active, onNavigate }) {
  return <nav className='desk-nav' aria-label='工作台导航'>
    {deskNav.map(group => (
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
          <Link className='brand' href='/' aria-label='law-tech 首页'>
            <span className='brand-mark'>C</span>
            <span className='brand-copy'>law-tech<small>personal workspace</small></span>
          </Link>
          <button className='desk-collapse-button' type='button' onClick={toggleSidebar} aria-label={collapsed ? '展开侧栏' : '收起侧栏'}>
            <LawTechIcon name={collapsed ? 'expand' : 'collapse'} size={16} />
          </button>
        </div>
        <DeskNavigation active={active} />
        <div className='desk-sidebar-foot'>
          <span><i /> 私人工作区</span>
          <small>数据与灵感，慢慢长成体系。</small>
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
            <Link className='desk-top-action' href='/content'><LawTechIcon name='content' size={16} /><span>公开内容</span></Link>
            <Link className='desk-top-action is-primary' href='/'><LawTechIcon name='home' size={16} /><span>首页</span></Link>
          </div>
        </header>

        <div className={`desk-mobile-drawer-shell ${mobileOpen ? 'is-open' : ''}`} aria-hidden={!mobileOpen}>
          <button className='desk-mobile-drawer-backdrop' type='button' aria-label='关闭工作台导航' onClick={() => setMobileOpen(false)} />
          <aside className='desk-mobile-drawer' aria-label='移动端工作台导航'>
            <header><div><span className='brand-mark'>C</span><strong>私人工作区</strong></div><button type='button' aria-label='关闭导航' onClick={() => setMobileOpen(false)}>×</button></header>
            <DeskNavigation active={active} onNavigate={() => setMobileOpen(false)} />
            <footer><i /> 数据与灵感，慢慢长成体系。</footer>
          </aside>
        </div>

        <section className={`desk-page desk-page-${active}`}>
          <div className='desk-page-content'>{children}</div>
        </section>
      </main>
    </div>
  )
}
