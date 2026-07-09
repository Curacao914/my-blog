import Link from 'next/link'
import { useCallback, useEffect, useRef } from 'react'

import { LawTechIcon } from '@/components/LawTechIcons'
import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'
import { publicNav } from '@/lib/domain/navigation'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'
import { PublicHeaderSignal } from '@/components/law-tech/PublicHeaderSignal'

function activeMatch(active, item) {
  return active === item.key || (active && item.href.includes(active))
}

export function PublicHeader({ active = '' }) {
  const navRef = useRef(null)
  const linkRefs = useRef([])
  const headerRef = useRef(null)
  const navItems = publicNav.filter(item => item.href !== '/desk')

  const moveIndicator = useCallback((index, visible = true) => {
    const nav = navRef.current
    const link = linkRefs.current[index]
    if (!nav || !link) return
    const navBox = nav.getBoundingClientRect()
    const linkBox = link.getBoundingClientRect()
    nav.style.setProperty('--public-nav-x', `${linkBox.left - navBox.left}px`)
    nav.style.setProperty('--public-nav-w', `${linkBox.width}px`)
    nav.classList.toggle('is-following', visible)
  }, [])

  useEffect(() => {
    const current = navItems.findIndex(item => activeMatch(active, item))
    if (current >= 0) moveIndicator(current, false)
  }, [active, moveIndicator, navItems])

  return <>
    <header className='public-header public-header-macos' ref={headerRef} onPointerMove={event => {
      const box = headerRef.current?.getBoundingClientRect()
      if (!box) return
      headerRef.current.style.setProperty('--header-light-x', `${event.clientX - box.left}px`)
    }}>
      <div className='public-header-left'>
        <PublicHeaderSignal />
      </div>

      <div className='public-header-center'>
        <nav className='public-nav' aria-label='公开导航' ref={navRef} onMouseLeave={() => {
          const current = navItems.findIndex(item => activeMatch(active, item))
          if (current >= 0) moveIndicator(current, false)
        }}>
          <i className='public-nav-indicator' aria-hidden='true' />
          {navItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activeMatch(active, item) ? 'page' : undefined}
              onMouseEnter={() => moveIndicator(index, true)}
              ref={node => { linkRefs.current[index] = node }}
            >
              {item.key === 'search' ? <LawTechIcon name='search' size={14} /> : null}
              {item.label}
            </Link>
          ))}
        </nav>

        <form className='public-header-search' action='/search' method='get'>
          <LawTechIcon name='search' size={14} />
          <input name='q' type='search' placeholder='搜索内容、课程或标签' aria-label='搜索公开内容' />
          <span>⌘K</span>
        </form>
      </div>

      <div className='public-header-actions'>
        <AdminContentSync compact />
        <WorkspaceAccountMenu placement='public' />
      </div>
    </header>

    <style jsx>{`
      .public-header-macos {
        --public-nav-x:0px;
        --public-nav-w:72px;
        --header-light-x:72%;
        position:relative;
        z-index:40;
        display:grid;
        grid-template-columns:minmax(170px,1fr) minmax(360px,auto) minmax(180px,1fr);
        gap:12px;
        align-items:center;
        min-height:62px;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.7);
        border-radius:20px;
        padding:10px 14px;
        background:linear-gradient(180deg,rgba(255,255,255,.48),rgba(255,255,255,.22));
        box-shadow:0 18px 50px rgba(24,63,50,.1),inset 0 1px 0 rgba(255,255,255,.74);
        backdrop-filter:blur(24px) saturate(1.12);
      }
      .public-header-macos::before {
        position:absolute;
        inset:0;
        content:'';
        pointer-events:none;
        background:radial-gradient(240px 90px at var(--header-light-x) 50%,rgba(255,255,255,.24),transparent 70%);
      }
      .public-header-left,
      .public-header-center,
      .public-header-actions { position:relative; z-index:1; }
      .public-header-left { justify-self:start; }
      .public-header-center {
        display:grid;
        grid-template-columns:auto minmax(190px,360px);
        gap:12px;
        align-items:center;
        justify-self:center;
        min-width:0;
      }
      .public-nav {
        position:relative;
        display:flex;
        align-items:center;
        gap:4px;
        width:max-content;
        padding:4px;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.56);
        border-radius:999px;
        background:rgba(255,255,255,.16);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.58);
      }
      .public-nav-indicator {
        position:absolute;
        top:4px;
        left:4px;
        width:var(--public-nav-w);
        height:34px;
        border-radius:999px;
        background:linear-gradient(135deg,rgba(255,255,255,.56),rgba(255,255,255,.16));
        box-shadow:0 10px 24px rgba(24,63,50,.06),inset 0 1px 0 rgba(255,255,255,.72);
        transform:translateX(var(--public-nav-x));
        opacity:0;
        transition:transform .44s cubic-bezier(.2,1.32,.28,1),width .44s cubic-bezier(.2,1.32,.28,1),opacity .18s ease;
      }
      .public-nav.is-following .public-nav-indicator,
      .public-nav:has(a[aria-current='page']) .public-nav-indicator { opacity:1; }
      .public-nav a {
        position:relative;
        z-index:1;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        min-width:70px;
        height:34px;
        border-radius:999px;
        padding:0 12px;
        color:var(--muted);
        font-size:13px;
        font-weight:680;
        transition:color .2s ease;
      }
      .public-nav a:hover,
      .public-nav a[aria-current='page'] { color:var(--leaf); background:transparent; }
      .public-header-search {
        display:flex;
        align-items:center;
        gap:8px;
        min-width:0;
        height:38px;
        border:1px solid rgba(255,255,255,.56);
        border-radius:999px;
        padding:0 10px 0 12px;
        color:var(--quiet);
        background:rgba(255,255,255,.18);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.58);
      }
      .public-header-search input {
        min-width:0;
        width:100%;
        border:0;
        padding:0;
        color:var(--ink);
        background:transparent;
        outline:none;
        font-size:12px;
      }
      .public-header-search span {
        border:1px solid rgba(255,255,255,.48);
        border-radius:999px;
        padding:2px 7px;
        color:var(--muted);
        background:rgba(255,255,255,.22);
        font-size:11px;
        white-space:nowrap;
      }
      .public-header-actions {
        display:flex;
        align-items:center;
        justify-self:end;
        gap:7px;
      }
      .public-header-actions :global(.admin-content-sync) { margin:0; }
      .public-header-actions :global(.workspace-account-menu),
      .public-header-actions :global(.workspace-auth-actions) { margin-left:0; }
      @media (max-width:1040px) {
        .public-header-macos { grid-template-columns:1fr auto; }
        .public-header-center { grid-column:1 / -1; grid-row:2; justify-self:stretch; grid-template-columns:auto minmax(170px,1fr); }
        .public-header-actions { grid-column:2; grid-row:1; }
      }
      @media (max-width:680px) {
        .public-header-center { grid-template-columns:1fr; }
        .public-nav { max-width:100%; overflow-x:auto; scrollbar-width:none; }
        .public-nav::-webkit-scrollbar { display:none; }
      }
    `}</style>
  </>
}
