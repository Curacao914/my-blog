import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { LawTechIcon } from '@/components/LawTechIcons'
import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'
import { publicNav } from '@/lib/domain/navigation'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'
import { PublicHeaderSignal } from '@/components/law-tech/PublicHeaderSignal'

function isActive(item, active) {
  return active === item.key || (active && item.href.includes(active))
}

export function PublicHeader({ active = '' }) {
  const navRef = useRef(null)
  const itemRefs = useRef({})
  const [hoverKey, setHoverKey] = useState('')
  const [indicator, setIndicator] = useState({ left: 4, width: 70, visible: false })
  const publicItems = publicNav.filter(item => item.href !== '/desk')
  const activeItem = publicItems.find(item => isActive(item, active)) || publicItems[0]
  const indicatorKey = hoverKey || activeItem?.key || ''

  useEffect(() => {
    const element = itemRefs.current[indicatorKey]
    const nav = navRef.current
    if (!element || !nav) return
    const itemBox = element.getBoundingClientRect()
    const navBox = nav.getBoundingClientRect()
    setIndicator({
      left: itemBox.left - navBox.left,
      width: itemBox.width,
      visible: Boolean(hoverKey)
    })
  }, [hoverKey, indicatorKey])

  function handlePointerMove(event) {
    const header = event.currentTarget
    const box = header.getBoundingClientRect()
    header.style.setProperty('--header-light-x', `${event.clientX - box.left}px`)
  }

  return <>
    <header className='public-header mac-public-header' onPointerMove={handlePointerMove}>
      <PublicHeaderSignal />

      <div className='mac-public-center'>
        <nav
          className='public-nav mac-public-nav'
          aria-label='公开导航'
          onMouseLeave={() => setHoverKey('')}
          ref={navRef}
        >
          <span
            className='mac-public-nav-indicator'
            style={{ opacity: indicator.visible ? 1 : 0, transform: `translateX(${indicator.left}px)`, width: indicator.width }}
            aria-hidden='true'
          />
          {publicItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              ref={element => { itemRefs.current[item.key] = element }}
              onMouseEnter={() => setHoverKey(item.key)}
              aria-current={isActive(item, active) ? 'page' : undefined}
            >
              {item.key === 'search' ? <LawTechIcon name='search' size={14} /> : null}
              {item.label}
            </Link>
          ))}
        </nav>

        <form className='mac-public-search' action='/search' method='get'>
          <LawTechIcon name='search' size={14} />
          <input name='q' type='search' placeholder='搜索内容、课程或标签' aria-label='搜索公开内容' />
          <kbd>⌘K</kbd>
        </form>
      </div>

      <div className='public-header-actions'>
        <AdminContentSync compact />
        <WorkspaceAccountMenu placement='public' />
      </div>
    </header>

    <style jsx>{`
      .public-header {
        --header-light-x: 70%;
        position:relative;
        z-index:40;
        display:grid;
        grid-template-columns:minmax(230px,.72fr) minmax(420px,1.1fr) minmax(180px,.62fr);
        align-items:center;
        gap:14px;
        min-height:62px;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.7);
        border-radius:20px;
        padding:10px 14px;
        background:linear-gradient(180deg,rgba(255,255,255,.48),rgba(255,255,255,.22));
        box-shadow:0 18px 50px rgba(24,63,50,.08),inset 0 1px 0 rgba(255,255,255,.74);
        backdrop-filter:blur(24px) saturate(1.14);
      }
      .public-header::before {
        position:absolute;
        inset:0;
        background:radial-gradient(220px 86px at var(--header-light-x) 50%,rgba(255,255,255,.24),transparent 72%);
        content:'';
        pointer-events:none;
      }
      .public-header > :global(.public-header-signal),
      .mac-public-center,
      .public-header-actions {
        position:relative;
        z-index:1;
      }
      .public-header > :global(.public-header-signal) { justify-self:start; }
      .mac-public-center {
        display:grid;
        grid-template-columns:auto minmax(180px,1fr);
        gap:10px;
        align-items:center;
        min-width:0;
        justify-self:center;
        width:min(680px,100%);
      }
      .public-nav {
        position:relative;
        display:flex;
        align-items:center;
        justify-content:center;
        width:max-content;
        max-width:100%;
        gap:4px;
        justify-self:center;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.56);
        border-radius:999px;
        padding:4px;
        background:rgba(255,255,255,.16);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.58);
      }
      .mac-public-nav-indicator {
        position:absolute;
        top:4px;
        left:0;
        height:34px;
        border-radius:999px;
        background:linear-gradient(135deg,rgba(255,255,255,.56),rgba(255,255,255,.17));
        box-shadow:0 10px 24px rgba(24,63,50,.055),inset 0 1px 0 rgba(255,255,255,.72);
        transition:transform .44s cubic-bezier(.2,1.32,.28,1),width .44s cubic-bezier(.2,1.32,.28,1),opacity .18s ease;
        backdrop-filter:blur(16px);
      }
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
        font-size:12px;
        font-weight:680;
        transition:color .18s ease;
      }
      .public-nav a:hover,
      .public-nav a[aria-current='page'] {
        color:var(--leaf);
      }
      .mac-public-search {
        display:flex;
        align-items:center;
        gap:8px;
        min-width:0;
        height:38px;
        border:1px solid rgba(255,255,255,.56);
        border-radius:999px;
        padding:0 10px 0 12px;
        color:var(--quiet);
        background:rgba(255,255,255,.2);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.58);
      }
      .mac-public-search input {
        min-width:0;
        width:100%;
        border:0;
        color:var(--ink);
        background:transparent;
        outline:none;
        font-size:12px;
      }
      .mac-public-search input::placeholder {
        color:#8c9992;
      }
      .mac-public-search kbd {
        border:1px solid rgba(255,255,255,.5);
        border-radius:999px;
        padding:2px 7px;
        color:var(--muted);
        background:rgba(255,255,255,.22);
        font-family:var(--sans-serif);
        font-size:10px;
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
      @media (max-width:1060px) {
        .public-header {
          grid-template-columns:minmax(0,1fr) auto;
        }
        .mac-public-center {
          grid-column:1 / -1;
          grid-row:2;
          justify-self:stretch;
          width:100%;
        }
        .public-header-actions { grid-column:2; grid-row:1; }
      }
      @media (max-width:720px) {
        .mac-public-center {
          grid-template-columns:1fr;
        }
        .public-nav {
          justify-self:start;
          overflow-x:auto;
          scrollbar-width:none;
        }
        .public-nav::-webkit-scrollbar { display:none; }
      }
      @media (max-width:520px) {
        .public-header { padding:9px 10px; }
        .mac-public-search kbd { display:none; }
      }
      @media (prefers-reduced-motion:reduce) {
        .mac-public-nav-indicator {
          transition-duration:.01ms!important;
        }
      }
    `}</style>
  </>
}
