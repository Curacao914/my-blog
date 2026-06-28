import Link from 'next/link'

import { LawTechIcon } from '@/components/LawTechIcons'
import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'
import { publicNav } from '@/lib/domain/navigation'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'

export function PublicHeader({ active = '', summary = '' }) {
  return <>
    <header className='public-header'>
      <Link className='public-home-link' href='/' aria-label='返回首页'>
        <span className='public-home-icon'><LawTechIcon name='home' size={16} /></span>
        <span><strong>首页</strong><small>{summary || 'law-tech.dev'}</small></span>
      </Link>

      <nav className='public-nav' aria-label='公开导航'>
        {publicNav.filter(item => item.href !== '/desk').map(item => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active === item.key || (active && item.href.includes(active)) ? 'page' : undefined}
          >
            {item.key === 'search' ? <LawTechIcon name='search' size={14} /> : null}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className='public-header-actions'>
        <AdminContentSync compact />
        <WorkspaceAccountMenu placement='public' />
      </div>
    </header>

    <style jsx>{`
      .public-header {
        position: relative;
        z-index: 40;
        display: grid;
        grid-template-columns: minmax(210px, 1fr) auto minmax(210px, 1fr);
        align-items: center;
        gap: 18px;
        min-height: 66px;
        border-bottom: 1px solid rgba(17,63,49,.09);
      }
      .public-home-link {
        display: inline-flex;
        align-items: center;
        justify-self: start;
        gap: 10px;
        min-width: 0;
      }
      .public-home-link > span:last-child { display: grid; min-width: 0; line-height: 1.05; }
      .public-home-link strong { font-size: 13px; font-weight: 700; }
      .public-home-link small { overflow: hidden; margin-top: 4px; color: var(--quiet); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
      .public-home-icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border: 1px solid rgba(17,63,49,.09);
        border-radius: 12px;
        color: var(--leaf);
        background: rgba(255,255,255,.58);
      }
      .public-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        justify-self: center;
      }
      .public-nav a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 10px;
        padding: 8px 11px;
        color: var(--muted);
        font-size: 12px;
        transition: color .18s ease, background .18s ease;
      }
      .public-nav a:hover,
      .public-nav a[aria-current='page'] {
        color: var(--leaf);
        background: rgba(220,233,223,.58);
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
      @media (max-width: 820px) {
        .public-header {
          grid-template-columns: 1fr auto;
          gap: 10px;
          padding: 8px 0 10px;
        }
        .public-nav {
          grid-column: 1 / -1;
          grid-row: 2;
          justify-self: stretch;
          justify-content: flex-start;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .public-nav::-webkit-scrollbar { display: none; }
        .public-header-actions { grid-column: 2; grid-row: 1; }
      }
      @media (max-width: 520px) {
        .public-home-link small { max-width: 130px; }
        .public-nav a { padding: 7px 9px; }
      }
    `}</style>
  </>
}
