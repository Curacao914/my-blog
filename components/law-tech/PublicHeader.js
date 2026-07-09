
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { LawTechIcon } from '@/components/LawTechIcons'
import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'
import { PublicHeaderSignal } from '@/components/law-tech/PublicHeaderSignal'
import { publicNav } from '@/lib/domain/navigation'

function pickRandom(items, current = '') {
  const pool = items.filter(Boolean)
  if (!pool.length) return '/content'
  if (pool.length === 1) return pool[0]
  const nextPool = pool.filter(item => item !== current)
  return nextPool[Math.floor(Math.random() * nextPool.length)] || pool[0]
}

function RandomDockLink({ randomItems = [] }) {
  const [href, setHref] = useState('/content')

  useEffect(() => {
    setHref(pickRandom(randomItems))
  }, [randomItems])

  function openRandom(event) {
    const next = pickRandom(randomItems, href)
    setHref(next)
    if (typeof window !== 'undefined') {
      event.preventDefault()
      window.location.href = next
    }
  }

  return (
    <a className='system-dock-item' href={href} onClick={openRandom} title='随机一页'>
      <LawTechIcon name='random' size={18} />
      <span>随机一页</span>
    </a>
  )
}

function SystemDock({ active = '', randomItems = [] }) {
  return (
    <nav className='system-dock' aria-label='系统程序坞'>
      <Link className={`system-dock-item ${active === 'content' ? 'is-active' : ''}`} href='/content' title='内容库'>
        <LawTechIcon name='content' size={18} />
        <span>内容库</span>
      </Link>
      <Link className='system-dock-item' href='/archive' title='时间归档'>
        <LawTechIcon name='archive' size={18} />
        <span>时间归档</span>
      </Link>
      <RandomDockLink randomItems={randomItems} />
      <Link className={`system-dock-item ${active === 'tools' ? 'is-active' : ''}`} href='/tools' title='工具'>
        <LawTechIcon name='tools' size={18} />
        <span>工具</span>
      </Link>
      <Link className={`system-dock-item ${active === 'desk' ? 'is-active' : ''}`} href='/desk/today' title='工作台'>
        <LawTechIcon name='desk' size={18} />
        <span>工作台</span>
      </Link>
    </nav>
  )
}

export function PublicHeader({ active = '', randomItems = [], showDock = true }) {
  const menuItems = useMemo(
    () => publicNav.filter(item => ['content', 'tools', 'about'].includes(item.key)),
    []
  )

  return (
    <>
      <header className='public-header system-menu-bar'>
        <PublicHeaderSignal />

        <nav className='public-nav system-menu-nav' aria-label='公开导航'>
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.key ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form className='system-menu-search' action='/search' method='get'>
          <LawTechIcon name='search' size={14} />
          <input name='q' type='search' placeholder='搜索内容、课程或标签' aria-label='搜索公开内容' />
          <kbd>⌘K</kbd>
        </form>

        <div className='public-header-actions'>
          <AdminContentSync compact />
          <WorkspaceAccountMenu placement='public' />
        </div>
      </header>

      {showDock ? <SystemDock active={active} randomItems={randomItems} /> : null}

      <style jsx global>{`
        :root {
          --system-menu-height: 52px;
          --system-top-offset: 82px;
          --system-bottom-offset: 84px;
          --system-border: rgba(255,255,255,.7);
          --system-glass: rgba(255,255,255,.34);
          --system-glass-strong: rgba(255,255,255,.52);
          --system-shadow: 0 18px 58px rgba(24,63,50,.085), inset 0 1px 0 rgba(255,255,255,.74);
        }
        .lawtech-public-page {
          min-height: 100dvh;
          padding-top: var(--system-top-offset);
          padding-bottom: var(--system-bottom-offset);
        }
        .public-shell {
          width: min(1420px, calc(100vw - 42px));
          margin: 0 auto;
        }
        .system-menu-bar {
          position: fixed;
          top: 14px;
          left: 50%;
          z-index: 5200;
          width: min(1420px, calc(100vw - 36px));
          min-height: var(--system-menu-height);
          transform: translateX(-50%);
          display: grid;
          grid-template-columns: minmax(220px, 1fr) auto minmax(300px, .82fr) auto;
          align-items: center;
          gap: 12px;
          overflow: visible;
          border: 1px solid var(--system-border);
          border-radius: 23px;
          padding: 6px 9px 6px 14px;
          background:
            radial-gradient(circle at 82% 0%, rgba(255,255,255,.46), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.24));
          box-shadow: var(--system-shadow);
          backdrop-filter: blur(24px) saturate(1.12);
        }
        .system-menu-bar > .public-header-signal,
        .system-menu-bar > :global(.public-header-signal) {
          justify-self: start;
          min-width: 0;
        }
        .system-menu-nav {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          justify-self: center;
          border: 1px solid rgba(255,255,255,.56);
          border-radius: 999px;
          padding: 4px;
          background: rgba(255,255,255,.16);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.62);
        }
        .system-menu-nav a {
          position: relative;
          z-index: 1;
          min-width: 72px;
          border-radius: 999px;
          padding: 8px 15px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 720;
          text-align: center;
          transition: color .18s ease, transform .18s cubic-bezier(.2,1.2,.28,1);
        }
        .system-menu-nav a::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          background:
            radial-gradient(circle at 38% 16%, rgba(255,255,255,.48), transparent 46%),
            linear-gradient(135deg, rgba(255,255,255,.46), rgba(255,255,255,.18));
          box-shadow: 0 10px 24px rgba(24,63,50,.055), inset 0 1px 0 rgba(255,255,255,.72);
          opacity: 0;
          transform: scale(.94);
          transition: opacity .2s ease, transform .32s cubic-bezier(.2,1.25,.28,1);
        }
        .system-menu-nav a:hover,
        .system-menu-nav a[aria-current='page'] {
          color: var(--ink);
        }
        .system-menu-nav a:hover::before,
        .system-menu-nav a[aria-current='page']::before {
          opacity: 1;
          transform: scale(1);
        }
        .system-menu-search {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          min-width: 0;
          height: 34px;
          border: 1px solid rgba(255,255,255,.58);
          border-radius: 999px;
          padding: 0 9px 0 12px;
          background: rgba(255,255,255,.16);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.62);
          color: var(--muted);
        }
        .system-menu-search input {
          min-width: 0;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--ink);
          outline: none;
          font-size: 12px;
        }
        .system-menu-search input::placeholder {
          color: rgba(92,111,104,.72);
        }
        .system-menu-search kbd {
          border: 1px solid rgba(255,255,255,.5);
          border-radius: 999px;
          padding: 2px 7px;
          background: rgba(255,255,255,.18);
          color: var(--muted);
          font-size: 10px;
          font-family: inherit;
        }
        .public-header-actions {
          position: relative;
          z-index: 5400;
          display: flex;
          align-items: center;
          justify-self: end;
          gap: 8px;
          min-width: max-content;
        }
        .public-header-actions .admin-content-sync,
        .public-header-actions :global(.admin-content-sync) {
          margin: 0;
        }
        .public-header-actions .workspace-account-menu,
        .public-header-actions .workspace-auth-actions,
        .public-header-actions :global(.workspace-account-menu),
        .public-header-actions :global(.workspace-auth-actions) {
          position: relative;
          z-index: 5600;
          margin-left: 0;
        }
        .workspace-account-menu,
        .workspace-auth-actions,
        .cl-userButtonPopoverCard,
        .cl-card,
        [data-radix-popper-content-wrapper] {
          z-index: 8000 !important;
        }
        .system-dock {
          position: fixed;
          left: 50%;
          bottom: 14px;
          z-index: 5000;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: visible;
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 22px;
          padding: 7px 9px;
          background: linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,.2));
          box-shadow: 0 20px 58px rgba(24,63,50,.11), inset 0 1px 0 rgba(255,255,255,.74);
          backdrop-filter: blur(24px) saturate(1.12);
        }
        .system-dock-item {
          position: relative;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.62);
          border-radius: 15px;
          color: var(--leaf);
          background:
            radial-gradient(circle at 34% 18%, rgba(255,255,255,.46), transparent 42%),
            linear-gradient(135deg, rgba(255,255,255,.34), rgba(255,255,255,.12));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.64);
          transition: transform .18s cubic-bezier(.2,1.22,.28,1), border-radius .18s ease, background .18s ease;
        }
        .system-dock-item:hover,
        .system-dock-item.is-active {
          transform: translateY(-4px) scale(1.08);
          border-radius: 18px;
          background: rgba(255,255,255,.38);
        }
        .system-dock-item::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -7px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          transform: translateX(-50%);
          background: var(--leaf);
          opacity: 0;
        }
        .system-dock-item.is-active::after {
          opacity: .55;
        }
        .system-dock-item span {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(3px);
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 999px;
          padding: 5px 8px;
          color: var(--ink);
          background: rgba(255,255,255,.5);
          box-shadow: 0 10px 24px rgba(24,63,50,.08);
          backdrop-filter: blur(16px);
          font-size: 11px;
          transition: opacity .15s ease, transform .15s ease;
        }
        .system-dock-item:hover span {
          opacity: 1;
          transform: translateX(-50%);
        }
        @media (max-width: 980px) {
          .lawtech-public-page { padding-top: 112px; }
          .system-menu-bar {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
            padding: 8px 10px;
          }
          .system-menu-nav {
            order: 3;
            grid-column: 1 / -1;
            justify-self: stretch;
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .system-menu-nav::-webkit-scrollbar { display: none; }
          .system-menu-search { display: none; }
          .system-dock { bottom: 10px; }
        }
        @media (max-width: 560px) {
          .system-menu-bar { width: calc(100vw - 20px); }
          .system-dock-item { width: 38px; height: 38px; }
        }
      `}</style>
    </>
  )
}
