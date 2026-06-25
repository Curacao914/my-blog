import Link from 'next/link'
import { publicNav } from '@/lib/domain/navigation'

export function PublicHeader() {
  return (
    <header className='topbar'>
      <Link className='brand' href='/'>
        <span className='brand-mark'>C</span>
        <span>Curacao</span>
      </Link>
      <nav className='nav' aria-label='公开导航'>
        {publicNav.map(item => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

