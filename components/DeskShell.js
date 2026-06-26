import Link from 'next/link'
import { deskNav } from '@/lib/domain/navigation'

export function DeskShell({ active = 'today', title, kicker, children }) {
  const activeItem = deskNav.flatMap((group) => group.items).find((item) => item.key === active)

  return (
    <div className="desk-layout">
      <aside className="desk-sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">C</span>
          <span>law-tech</span>
        </Link>
        <nav className="desk-nav" aria-label="工作台导航">
          {deskNav.map((group) => (
            <div className="desk-nav-group" key={group.group}>
              <p>{group.group}</p>
              {group.items.map((item) => (
                <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="desk-main">
        <div className="desk-topbar">
          <div>
            <span className="eyebrow">{kicker}</span>
            <strong>{activeItem?.label || title}</strong>
          </div>
          <Link className="ghost-link" href="/">
            回到首页
          </Link>
        </div>
        <details className="desk-mobile-nav">
          <summary>工作台导航</summary>
          <nav aria-label="移动端工作台导航">
            {deskNav.flatMap((group) =>
              group.items.map((item) => (
                <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}>
                  {item.label}
                </Link>
              ))
            )}
          </nav>
        </details>
        <section className="desk-page">
          <h1>{title}</h1>
          {children}
        </section>
      </main>
    </div>
  )
}
