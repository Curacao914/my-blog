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
    <main className='lawtech-public-page public-directory-page'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='content' />
        <section className='public-directory-hero'>
          <div>
            <span className='eyebrow'>{eyebrow}</span>
            <h1>{title}</h1>
          </div>
          <nav aria-label='内容浏览方式'>
            <Link href='/content'>内容库</Link>
            <Link href='/archive'>时间归档</Link>
            <Link href='/category'>栏目</Link>
            <Link href='/tag'>标签</Link>
          </nav>
        </section>

        {hasSelection ? <section className='public-directory-selected'>
          <header>
            <div><span>当前范围</span><h2>{selectedLabel}</h2></div>
            <Link href='/content'>查看全部内容 ↗</Link>
          </header>
          {items.length ? <div className='public-directory-grid'>
            {items.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}
          </div> : <div className='public-directory-empty'><h3>{emptyTitle}</h3><p>{emptyBody}</p></div>}
        </section> : <section className='public-directory-groups'>
          {groups.map((group, index) => <details key={group.key || group.label} open={index === firstPopulatedGroup}>
            <summary>
              <div><span>{group.kicker || eyebrow}</span><h2>{group.label}</h2></div>
              <small>{group.count ?? group.items?.length ?? 0} 条</small>
            </summary>
            <div className='public-directory-group-body'>
              {group.href ? <Link className='public-directory-group-link' href={group.href}>进入这一组 ↗</Link> : null}
              {group.items?.length ? <div className='public-directory-grid'>
                {group.items.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}
              </div> : <p className='public-directory-group-empty'>暂时没有公开内容。</p>}
            </div>
          </details>)}
          {!groups.length ? <div className='public-directory-empty'><h3>{emptyTitle}</h3><p>{emptyBody}</p></div> : null}
        </section>}

        <footer className='public-directory-foot'><DynamicSignature compact /></footer>
      </div>
      <style jsx>{`
        .public-directory-hero { display:flex; align-items:end; justify-content:space-between; gap:32px; padding:70px 0 34px; }
        .public-directory-hero > div { max-width:780px; }
        .public-directory-hero h1 { margin:9px 0 10px; font-family:var(--display-serif); font-size:clamp(44px,7vw,76px); font-weight:600; letter-spacing:-.055em; }
        .public-directory-hero p { margin:0; color:var(--muted); line-height:1.8; }
        .public-directory-hero nav { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:7px; }
        .public-directory-hero nav a { border:1px solid rgba(17,63,49,.1); border-radius:999px; padding:8px 11px; color:var(--green); background:rgba(255,255,255,.5); font-size:11px; }
        .public-directory-selected,
        .public-directory-groups { border:1px solid rgba(255,255,255,.72); border-radius:28px; padding:18px; background:linear-gradient(145deg,rgba(255,255,255,.63),rgba(239,245,241,.42)); box-shadow:0 24px 70px rgba(24,63,50,.07),inset 0 1px 0 rgba(255,255,255,.86); backdrop-filter:blur(22px); }
        .public-directory-selected > header { display:flex; align-items:end; justify-content:space-between; gap:18px; padding:4px 4px 18px; border-bottom:1px solid rgba(23,35,29,.07); }
        .public-directory-selected header span,
        details summary span { color:var(--quiet); font-size:9px; letter-spacing:.1em; text-transform:uppercase; }
        .public-directory-selected h2,
        details summary h2 { margin:5px 0 0; font-family:var(--display-serif); font-size:27px; font-weight:600; }
        .public-directory-selected header a { color:var(--green); font-size:11px; }
        .public-directory-groups { display:grid; gap:10px; }
        details { overflow:hidden; border:1px solid rgba(17,63,49,.08); border-radius:21px; background:rgba(255,255,255,.38); }
        summary { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:17px 19px; cursor:pointer; list-style:none; }
        summary::-webkit-details-marker { display:none; }
        summary small { color:var(--quiet); }
        .public-directory-group-body { padding:0 15px 15px; border-top:1px solid rgba(23,35,29,.06); }
        .public-directory-group-link { display:inline-flex; margin:13px 3px 0; color:var(--green); font-size:10px; }
        .public-directory-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; padding-top:15px; }
        .public-directory-group-empty { margin:0; padding:30px 4px 12px; color:var(--quiet); }
        .public-directory-empty { padding:70px 20px; text-align:center; }
        .public-directory-empty h3 { margin:0; font-family:var(--display-serif); font-size:27px; }
        .public-directory-empty p { margin:9px auto 0; color:var(--muted); }
        .public-directory-foot { display:flex; justify-content:flex-end; margin:28px 0 64px; padding:0 8px; color:var(--muted); }
        .public-directory-foot :global(svg) { width:min(220px,36vw); color:rgba(25,59,49,.7); }
        @media (max-width:980px) { .public-directory-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:720px) {
          .public-directory-hero { align-items:flex-start; flex-direction:column; padding-top:44px; }
          .public-directory-hero nav { justify-content:flex-start; }
          .public-directory-grid { grid-template-columns:1fr; }
          .public-directory-foot { align-items:flex-start; flex-direction:column; }
        }
      `}</style>
    </main>
    <LawTechDeskStyles />
  </>
}
