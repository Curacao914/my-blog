import Link from 'next/link'
import { publicNav } from '@/lib/domain/navigation'
import { LawTechIcon } from '@/components/LawTechIcons'
import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'

export function PublicHeader({ active = '' }) {
  return (
    <header className='public-header'>
      <Link className='public-brand' href='/'>
        <span className='brand-mark'>C</span>
        <span>Curacao<small>law-tech.dev</small></span>
      </Link>
      <nav className='public-nav' aria-label='公开导航'>
        {publicNav.filter(item => item.href !== '/desk').map(item => (
          <Link
            className={item.key === 'search' ? 'public-search-link' : undefined}
            key={item.href}
            href={item.href}
            aria-current={active === item.key || (active && item.href.includes(active)) ? 'page' : undefined}
          >
            {item.key === 'search' ? <LawTechIcon name='search' size={14} /> : null}
            {item.label}
          </Link>
        ))}
      </nav>
      <WorkspaceAccountMenu placement='public' />
    </header>
  )
}
