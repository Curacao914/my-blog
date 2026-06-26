import Link from 'next/link'
import { useEffect, useState } from 'react'
import { deskNav } from '@/lib/domain/navigation'
import { LawTechIcon } from '@/components/LawTechIcons'

const COLLAPSE_KEY = 'law-tech-desk-sidebar-collapsed'

export function DeskShell({ active = 'today', title, kicker, children }) {
  const [collapsed, setCollapsed] = useState(false)
  const activeItem = deskNav.flatMap(group => group.items).find(item => item.key === active)

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
  }, [])

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
        <nav className='desk-nav' aria-label='工作台导航'>
          {deskNav.map(group => (
            <div className='desk-nav-group' key={group.group}>
              <p>{group.group}</p>
              {group.items.map(item => (
                <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} title={item.label}>
                  <LawTechIcon name={item.key} size={18} />
                  <span>{item.label}</span>
                  {active === item.key ? <i aria-hidden='true' /> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className='desk-sidebar-foot'>
          <span><i /> 私人工作区</span>
          <small>数据与灵感，慢慢长成体系。</small>
        </div>
      </aside>

      <main className='desk-main'>
        <header className='desk-topbar'>
          <div className='desk-route'>
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

        <details className='desk-mobile-nav'>
          <summary><LawTechIcon name={active} size={17} /><span>{activeItem?.label || title}</span><b>切换</b></summary>
          <nav aria-label='移动端工作台导航'>
            {deskNav.flatMap(group => group.items.map(item => (
              <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}>
                <LawTechIcon name={item.key} size={17} />
                {item.label}
              </Link>
            )))}
          </nav>
        </details>

        <section className={`desk-page desk-page-${active}`}>
          <div className='desk-page-content'>{children}</div>
        </section>
      </main>
    </div>
  )
}
