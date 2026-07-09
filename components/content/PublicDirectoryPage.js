import Head from 'next/head'
import Link from 'next/link'

import { PublicContentCard } from '@/components/content/PublicContentCard'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export function PublicDirectoryPage({ title, eyebrow, description, groups = [], items = [], selectedLabel = '', emptyTitle = '这里还没有内容', emptyBody = '内容整理完成后会出现在这里。' }) {
  const hasSelection = Boolean(selectedLabel)
  const firstPopulatedGroup = Math.max(0, groups.findIndex(group => Number(group.count ?? group.items?.length ?? 0) > 0))
  return <>
    <Head><title>{title} · law-tech.dev</title><meta name='description' content={description} /><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-directory-page public-app-page-v3'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='content' />
        <section className='public-directory-window public-app-window'>
          <header className='public-window-titlebar'><div className='traffic' aria-hidden='true'><i /><i /><i /></div><div><span>{eyebrow}</span><strong>{title}</strong></div><nav aria-label='内容浏览方式'><Link href='/content'>内容库</Link><Link href='/archive'>时间归档</Link><Link href='/category'>栏目</Link><Link href='/tag'>标签</Link></nav></header>
          {hasSelection ? <section className='public-directory-selected'><header><div><span>当前范围</span><h2>{selectedLabel}</h2></div><Link href='/content'>查看全部内容 ↗</Link></header>{items.length ? <div className='public-directory-grid'>{items.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}</div> : <div className='public-directory-empty'><h3>{emptyTitle}</h3><p>{emptyBody}</p></div>}</section> : <section className='public-directory-groups'>{groups.map((group, index) => <details key={group.key || group.label} open={index === firstPopulatedGroup}><summary><div><span>{group.kicker || eyebrow}</span><h2>{group.label}</h2></div><small>{group.count ?? group.items?.length ?? 0} 条</small></summary><div className='public-directory-group-body'>{group.href ? <Link className='public-directory-group-link' href={group.href}>进入这一组 ↗</Link> : null}{group.items?.length ? <div className='public-directory-grid'>{group.items.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}</div> : <p className='public-directory-group-empty'>暂时没有公开内容。</p>}</div></details>)}{!groups.length ? <div className='public-directory-empty'><h3>{emptyTitle}</h3><p>{emptyBody}</p></div> : null}</section>}
          <footer className='public-directory-foot'><DynamicSignature compact /></footer>
        </section>
      </div>
      <style jsx>{`
        /* public-directory-app-window-v3 */
        .public-app-window{margin-top:18px;border:1px solid rgba(255,255,255,.72);border-radius:34px;background:linear-gradient(180deg,rgba(255,255,255,.48),rgba(255,255,255,.24));box-shadow:0 26px 74px rgba(24,63,50,.09),inset 0 1px 0 rgba(255,255,255,.76);backdrop-filter:blur(24px) saturate(1.08);overflow:hidden}.public-window-titlebar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;padding:17px 20px;border-bottom:1px solid rgba(23,35,29,.07)}.traffic{display:flex;gap:8px}.traffic i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.traffic i:nth-child(2){background:#ffbd2e}.traffic i:nth-child(3){background:#28c840}.public-window-titlebar span{color:var(--green);font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.public-window-titlebar strong{display:block;margin-top:4px;font-family:var(--display-serif);font-size:32px}.public-window-titlebar nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.public-window-titlebar nav a{border:1px solid rgba(255,255,255,.56);border-radius:999px;padding:7px 11px;color:var(--green);background:rgba(255,255,255,.24);font-size:11px}
        .public-directory-selected,.public-directory-groups{margin:18px 20px 20px;border:1px solid rgba(255,255,255,.62);border-radius:22px;padding:15px;background:rgba(255,255,255,.32);box-shadow:inset 0 1px 0 rgba(255,255,255,.64);backdrop-filter:blur(14px)}.public-directory-selected>header{display:flex;align-items:end;justify-content:space-between;gap:18px;padding:4px 4px 18px;border-bottom:1px solid rgba(23,35,29,.07)}.public-directory-selected header span,details summary span{color:var(--quiet);font-size:9px;letter-spacing:.1em;text-transform:uppercase}.public-directory-selected h2,details summary h2{margin:5px 0 0;font-family:var(--display-serif);font-size:27px;font-weight:600}.public-directory-selected header a{color:var(--green);font-size:11px}.public-directory-groups{display:grid;gap:8px}details{overflow:hidden;border:1px solid rgba(17,63,49,.065);border-radius:16px;background:rgba(255,255,255,.35)}summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}summary small{color:var(--quiet)}.public-directory-group-body{padding:0 15px 15px;border-top:1px solid rgba(23,35,29,.06)}.public-directory-group-link{display:inline-flex;margin:13px 3px 0;color:var(--green);font-size:10px}.public-directory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px;padding-top:12px}.public-directory-group-empty{margin:0;padding:30px 4px 12px;color:var(--quiet)}.public-directory-empty{padding:48px 18px;text-align:center}.public-directory-foot{display:flex;justify-content:flex-end;margin:0 20px 20px;padding:0 8px;color:var(--muted)}.public-directory-foot :global(svg){width:min(220px,36vw);color:rgba(25,59,49,.7)}@media(max-width:720px){.public-window-titlebar{grid-template-columns:auto minmax(0,1fr)}.public-window-titlebar nav{grid-column:1/-1;justify-content:flex-start}.public-directory-grid{grid-template-columns:1fr}}
      `}</style>
    </main>
    <LawTechDeskStyles />
  </>
}
