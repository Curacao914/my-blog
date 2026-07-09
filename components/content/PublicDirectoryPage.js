import Head from 'next/head'
import Link from 'next/link'

import { PublicContentCard } from '@/components/content/PublicContentCard'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export function PublicDirectoryPage({
  title,
  eyebrow,
  description,
  groups = [],
  items = [],
  selectedLabel = '',
  emptyTitle = '这里还没有内容',
  emptyBody = '内容整理完成后会出现在这里。'
}) {
  const hasSelection = Boolean(selectedLabel)
  const firstPopulatedGroup = Math.max(0, groups.findIndex(group => Number(group.count ?? group.items?.length ?? 0) > 0))
  return <>
    <Head>
      <title>{title} · law-tech.dev</title>
      <meta name='description' content={description} />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>
    <main className='lawtech-public-page public-directory-page public-directory-app-window-v2'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='content' />
        <section className='directory-window'>
          <div className='directory-window-top'><i /><i /><i /><span>{eyebrow}</span></div>
          <div className='directory-window-body'>
            <aside className='directory-sidebar'>
              <span className='eyebrow'>{eyebrow}</span>
              <h1>{title}</h1>
              <nav aria-label='内容浏览方式'>
                <Link href='/content'>内容库</Link>
                <Link href='/archive'>时间归档</Link>
                <Link href='/category'>栏目</Link>
                <Link href='/tag'>标签</Link>
              </nav>
              <footer><DynamicSignature compact /></footer>
            </aside>

            <section className='directory-main'>
              {hasSelection ? <>
                <header><div><span>当前范围</span><h2>{selectedLabel}</h2></div><Link href='/content'>全部内容 ↗</Link></header>
                {items.length ? <div className='public-directory-grid'>{items.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}</div> : <div className='public-directory-empty'><h3>{emptyTitle}</h3><p>{emptyBody}</p></div>}
              </> : <div className='directory-groups'>
                {groups.map((group, index) => <details key={group.key || group.label} open={index === firstPopulatedGroup}>
                  <summary><div><span>{group.kicker || eyebrow}</span><h2>{group.label}</h2></div><small>{group.count ?? group.items?.length ?? 0} 条</small></summary>
                  <div className='directory-group-body'>
                    {group.href ? <Link className='directory-group-link' href={group.href}>进入这一组 ↗</Link> : null}
                    {group.items?.length ? <div className='public-directory-grid'>{group.items.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}</div> : <p className='directory-empty-note'>暂时没有公开内容。</p>}
                  </div>
                </details>)}
                {!groups.length ? <div className='public-directory-empty'><h3>{emptyTitle}</h3><p>{emptyBody}</p></div> : null}
              </div>}
            </section>
          </div>
        </section>
      </div>
      <style jsx>{`
        .public-directory-app-window-v2 :global(.public-shell) { padding-bottom:72px; }
        .directory-window { overflow:hidden; margin-top:28px; border:1px solid rgba(255,255,255,.7); border-radius:30px; background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.2)); box-shadow:0 22px 70px rgba(24,63,50,.1),inset 0 1px 0 rgba(255,255,255,.74); backdrop-filter:blur(24px) saturate(1.12); }
        .directory-window-top { display:flex; align-items:center; gap:8px; padding:17px 18px 12px; border-bottom:1px solid rgba(255,255,255,.38); color:var(--muted); font-size:12px; }
        .directory-window-top i { width:11px; height:11px; border-radius:50%; }
        .directory-window-top i:nth-child(1){background:#ff6057}.directory-window-top i:nth-child(2){background:#ffbd2f}.directory-window-top i:nth-child(3){background:#28c840}
        .directory-window-top span { margin-left:auto; }
        .directory-window-body { display:grid; grid-template-columns:240px minmax(0,1fr); gap:18px; padding:18px; }
        .directory-sidebar { display:grid; align-content:start; gap:18px; min-height:520px; border:1px solid rgba(255,255,255,.56); border-radius:24px; padding:18px; background:rgba(255,255,255,.26); box-shadow:inset 0 1px 0 rgba(255,255,255,.58); }
        .directory-sidebar h1 { margin:0; font-family:var(--display-serif); font-size:clamp(42px,5vw,64px); font-weight:620; letter-spacing:-.065em; }
        .directory-sidebar nav { display:grid; gap:8px; }
        .directory-sidebar nav a { border:1px solid rgba(255,255,255,.56); border-radius:14px; padding:10px 12px; color:var(--green); background:rgba(255,255,255,.24); }
        .directory-sidebar footer { margin-top:auto; color:rgba(25,59,49,.72); }
        .directory-sidebar footer :global(svg) { width:min(190px,100%); }
        .directory-main { min-width:0; border:1px solid rgba(255,255,255,.56); border-radius:24px; padding:18px; background:rgba(255,255,255,.22); box-shadow:inset 0 1px 0 rgba(255,255,255,.58); }
        .directory-main > header { display:flex; align-items:end; justify-content:space-between; gap:18px; padding:0 0 16px; border-bottom:1px solid rgba(23,35,29,.07); }
        .directory-main span,
        details summary span { color:var(--quiet); font-size:9px; letter-spacing:.12em; text-transform:uppercase; }
        .directory-main h2,
        details summary h2 { margin:5px 0 0; font-family:var(--display-serif); font-size:28px; font-weight:610; }
        .directory-main header a { color:var(--green); font-size:11px; }
        .directory-groups { display:grid; gap:10px; }
        details { overflow:hidden; border:1px solid rgba(255,255,255,.56); border-radius:18px; background:rgba(255,255,255,.24); }
        summary { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 16px; cursor:pointer; list-style:none; }
        summary::-webkit-details-marker { display:none; }
        summary small { color:var(--quiet); }
        .directory-group-body { padding:0 15px 15px; border-top:1px solid rgba(255,255,255,.38); }
        .directory-group-link { display:inline-flex; margin:13px 3px 0; color:var(--green); font-size:10px; }
        .public-directory-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:10px; padding-top:12px; }
        .directory-empty-note { margin:0; padding:26px 4px 12px; color:var(--quiet); }
        .public-directory-empty { padding:48px 18px; text-align:center; }
        .public-directory-empty h3 { margin:0; font-family:var(--display-serif); font-size:27px; }
        .public-directory-empty p { margin:9px auto 0; color:var(--muted); }
        @media (max-width:900px){ .directory-window-body{grid-template-columns:1fr}.directory-sidebar{min-height:auto}.public-directory-grid{grid-template-columns:1fr} }
      `}</style>
    </main>
    <LawTechDeskStyles />
  </>
}
