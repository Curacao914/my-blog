import Link from 'next/link'
import { useMemo, useState } from 'react'

import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'
import { publicNav } from '@/lib/domain/navigation'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'
import { PublicHeaderSignal } from '@/components/law-tech/PublicHeaderSignal'
import { LawTechIcon } from '@/components/LawTechIcons'

export function PublicHeader({ active = '' }) {
  const navItems = useMemo(() => publicNav.filter(item => item.href !== '/desk' && item.key !== 'search'), [])
  const activeIndex = Math.max(0, navItems.findIndex(item => active === item.key || (active && item.href.includes(active))))
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const visualIndex = hoveredIndex ?? activeIndex

  return <>
    <header className='public-header public-header-glass-v3' style={{ '--nav-count': navItems.length, '--nav-index': visualIndex }}>
      <PublicHeaderSignal />

      <nav className='public-nav' aria-label='公开导航' onMouseLeave={() => setHoveredIndex(null)}>
        <i className='public-nav-indicator' aria-hidden='true' />
        {navItems.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active === item.key || (active && item.href.includes(active)) ? 'page' : undefined}
            onMouseEnter={() => setHoveredIndex(index)}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form className='public-header-search' action='/search' method='get'>
        <LawTechIcon name='search' size={14} />
        <input name='q' type='search' placeholder='搜索内容、课程或标签' aria-label='搜索公开内容' />
        <kbd>⌘K</kbd>
      </form>

      <div className='public-header-actions'>
        <AdminContentSync compact />
        <WorkspaceAccountMenu placement='public' />
      </div>
    </header>

    <style jsx>{`
      .public-header-glass-v3 {
        position: sticky;
        top: 12px;
        z-index: 80;
        display: grid;
        grid-template-columns: minmax(250px,1fr) auto minmax(260px,.72fr) minmax(130px,auto);
        align-items: center;
        gap: 10px;
        min-height: 62px;
        border: 1px solid rgba(255,255,255,.72);
        border-radius: 24px;
        padding: 8px 10px 8px 14px;
        background: linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.25));
        box-shadow: 0 22px 64px rgba(24,63,50,.08), inset 0 1px 0 rgba(255,255,255,.74);
        backdrop-filter: blur(24px) saturate(1.08);
        overflow: hidden;
      }
      .public-header-glass-v3::before {
        position: absolute;
        inset: 0;
        pointer-events: none;
        content: '';
        background: radial-gradient(220px 90px at var(--header-light-x, 54%) 10%, rgba(255,255,255,.26), transparent 70%);
      }
      .public-header-glass-v3 > :global(.public-header-signal),
      .public-nav,
      .public-header-search,
      .public-header-actions { position: relative; z-index: 1; }
      .public-header-glass-v3 > :global(.public-header-signal) { justify-self: start; }
      .public-nav {
        position: relative;
        display: grid;
        grid-template-columns: repeat(var(--nav-count), minmax(74px, 1fr));
        gap: 2px;
        justify-self: center;
        min-width: 278px;
        padding: 4px;
        border: 1px solid rgba(255,255,255,.56);
        border-radius: 999px;
        background: rgba(255,255,255,.15);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.58);
        overflow: hidden;
      }
      .public-nav-indicator {
        position: absolute;
        top: 4px;
        left: 4px;
        width: calc((100% - 8px) / var(--nav-count));
        height: calc(100% - 8px);
        border-radius: 999px;
        background:
          radial-gradient(circle at 36% 20%, rgba(255,255,255,.38), transparent 36%),
          linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,.2));
        box-shadow: 0 12px 26px rgba(24,63,50,.08), inset 0 1px 0 rgba(255,255,255,.7);
        transform: translateX(calc(var(--nav-index) * 100%));
        transition: transform .34s cubic-bezier(.2,1.18,.24,1), border-radius .22s ease;
      }
      .public-nav a {
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        border-radius: 999px;
        padding: 0 12px;
        color: var(--muted);
        background: transparent !important;
        font-size: 13px;
        font-weight: 680;
        transition: color .18s ease, transform .18s ease;
      }
      .public-nav a:hover,
      .public-nav a[aria-current='page'] {
        color: var(--ink);
        transform: scale(.99);
      }
      .public-header-search {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        height: 36px;
        min-width: 0;
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 999px;
        padding: 0 9px 0 11px;
        color: var(--quiet);
        background: rgba(255,255,255,.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.56);
      }
      .public-header-search input {
        min-width: 0;
        border: 0;
        color: var(--ink);
        background: transparent;
        outline: none;
        font-size: 12px;
      }
      .public-header-search input::placeholder { color: rgba(69,89,83,.72); }
      .public-header-search kbd {
        border: 1px solid rgba(255,255,255,.54);
        border-radius: 999px;
        padding: 2px 7px;
        color: var(--muted);
        background: rgba(255,255,255,.2);
        font: 10px/1.2 ui-sans-serif, system-ui, sans-serif;
      }
      .public-header-actions {
        display: flex;
        align-items: center;
        justify-self: end;
        gap: 7px;
      }
      .public-header-actions :global(.admin-content-sync) { margin: 0; }
      .public-header-actions :global(.workspace-account-menu),
      .public-header-actions :global(.workspace-auth-actions) { margin-left: 0; }
      @media (max-width: 1040px) {
        .public-header-glass-v3 { grid-template-columns: minmax(0,1fr) auto; }
        .public-nav { grid-column: 1 / -1; grid-row: 2; justify-self: stretch; }
        .public-header-search { grid-column: 1 / -1; grid-row: 3; }
        .public-header-actions { grid-column: 2; grid-row: 1; }
      }
      @media (max-width: 560px) {
        .public-header-glass-v3 { top: 8px; border-radius: 20px; }
        .public-header-glass-v3 > :global(.public-header-signal) { max-width: 190px; }
        .public-nav { min-width: 0; grid-template-columns: repeat(var(--nav-count), minmax(0,1fr)); }
        .public-nav a { padding: 0 8px; font-size: 12px; }
      }
    `}</style>
  </>
}
