import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  publicContentCategory,
  publicContentCollection,
  publicContentDate,
  publicContentHref,
  publicContentTypeLabel,
  selectRecentPublicContent
} from '@/lib/content/publicContent'

const categoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

const quickLinks = [
  { label: '内容', href: '/content', icon: 'content' },
  { label: '搜索', href: '/search', icon: 'search' },
  { label: 'OCR', href: '/ocr/', icon: 'materials' },
  { label: '引注', href: '/citation/', icon: 'writing' },
  { label: '工作台', href: '/desk', icon: 'today' }
]

function categorySummary(items = []) {
  return items.reduce((summary, item) => {
    const category = publicContentCategory(item)
    summary[category] = (summary[category] || 0) + 1
    return summary
  }, {})
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

function ContentRow({ item, featured = false }) {
  const href = publicContentHref(item)
  const category = publicContentCategory(item)
  const collection = publicContentCollection(item)
  const date = formatDate(publicContentDate(item))

  return (
    <Link className={`home-content-row ${featured ? 'is-featured' : ''}`} href={href}>
      {featured && item?.cover ? (
        <span className='home-content-cover' style={{ backgroundImage: `url("${item.cover}")` }} aria-hidden='true' />
      ) : null}
      <span className='home-content-copy'>
        <small>{[publicContentTypeLabel(item?.type), category, collection].filter(Boolean).join(' · ')}</small>
        <strong>{item?.title || '未命名内容'}</strong>
        {item?.summary ? <p>{item.summary}</p> : null}
      </span>
      <time>{date}</time>
    </Link>
  )
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {} }) {
  const featured = recentContent[0] || null
  const updates = recentContent.slice(featured ? 1 : 0, 7)

  return <>
    <Head>
      <title>Curacao · law-tech.dev</title>
      <meta name='description' content='Curacao 的法学笔记、文章、课程整理与工具。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-home'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader />

        <section className='home-masthead'>
          <div className='home-intro'>
            <div className='home-profile'>
              <Image src='/avatar.png' alt='' width={62} height={62} priority />
              <div>
                <strong>郭鑫 / Curacao</strong>
                <span>北京大学法学院 · 法律硕士（非法学）</span>
              </div>
            </div>
            <h1>你也在思考，<br /><em>意义有什么意义</em>吗？</h1>
            <div className='home-facts'>
              <span>中南财经政法大学 · 侦查学</span>
              <span>{contentCount} 条公开内容</span>
            </div>
          </div>

          <aside className='home-command'>
            <form action='/search' method='get'>
              <LawTechIcon name='search' size={17} />
              <input name='q' type='search' placeholder='搜索文章、课程或关键词' aria-label='搜索公开内容' />
              <button type='submit'>搜索</button>
            </form>
            <nav aria-label='常用入口'>
              {quickLinks.map(item => (
                <Link href={item.href} key={item.label}>
                  <LawTechIcon name={item.icon} size={15} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            {featured ? (
              <Link className='home-latest-link' href={publicContentHref(featured)}>
                <span>最近更新</span>
                <strong>{featured.title}</strong>
                <small>{formatDate(publicContentDate(featured))}</small>
              </Link>
            ) : null}
          </aside>
        </section>

        <section className='home-section home-updates'>
          <header>
            <div><span>Latest</span><h2>最近更新</h2></div>
            <Link href='/content'>全部内容 ↗</Link>
          </header>
          <div className='home-updates-grid'>
            {featured ? <ContentRow featured item={featured} /> : null}
            <div className='home-update-list'>
              {updates.map(item => <ContentRow item={item} key={item.id || `${item.source}:${item.slug}`} />)}
              {!featured && !updates.length ? <p className='home-empty'>还没有公开内容。</p> : null}
            </div>
          </div>
        </section>

        <section className='home-lower-grid'>
          <article className='home-panel'>
            <header><span>Browse</span><h2>栏目</h2></header>
            <div className='home-category-grid'>
              {categoryOrder.map(category => (
                <Link href={`/category/${encodeURIComponent(category)}`} key={category}>
                  <span>{category}</span>
                  <strong>{categories[category] || 0}</strong>
                </Link>
              ))}
            </div>
            <footer>
              <Link href='/archive'>时间归档</Link>
              <Link href='/tag'>全部标签</Link>
            </footer>
          </article>

          <article className='home-panel home-tool-panel'>
            <header><span>Tools</span><h2>工具</h2></header>
            <div>
              <Link href='/ocr/'><LawTechIcon name='materials' size={19} /><span><strong>OCR</strong><small>图片、扫描件、PDF</small></span><b>↗</b></Link>
              <Link href='/citation/'><LawTechIcon name='writing' size={19} /><span><strong>引注</strong><small>论文与读书笔记</small></span><b>↗</b></Link>
              <Link href='/desk/writing'><LawTechIcon name='writing' size={19} /><span><strong>Writing Studio</strong><small>草稿与 Markdown 预览</small></span><b>→</b></Link>
            </div>
          </article>
        </section>
      </div>

      <style jsx>{`
        .public-home { padding-bottom: 76px; }
        .home-masthead {
          display: grid;
          grid-template-columns: minmax(0,1.35fr) minmax(320px,.65fr);
          gap: 20px;
          padding: 38px 0 22px;
        }
        .home-intro,
        .home-command,
        .home-panel,
        .home-updates {
          border: 1px solid rgba(255,255,255,.76);
          background: rgba(255,255,255,.55);
          box-shadow: 0 18px 55px rgba(24,63,50,.07), inset 0 1px 0 rgba(255,255,255,.9);
          backdrop-filter: blur(22px) saturate(1.06);
        }
        .home-intro { border-radius: 28px; padding: clamp(24px,4vw,44px); }
        .home-profile { display:flex; align-items:center; gap:13px; }
        .home-profile :global(img) { width:54px; height:54px; border-radius:16px; object-fit:cover; image-rendering:pixelated; }
        .home-profile div { display:grid; gap:3px; }
        .home-profile strong { font-size:14px; }
        .home-profile span { color:var(--quiet); font-size:11px; }
        .home-intro h1 { margin:32px 0 24px; max-width:780px; font-family:var(--display-serif); font-size:clamp(42px,6vw,72px); font-weight:600; line-height:1.04; letter-spacing:-.05em; }
        .home-intro h1 em { color:var(--leaf); font-style:normal; }
        .home-facts { display:flex; flex-wrap:wrap; gap:8px; }
        .home-facts span { border-radius:999px; padding:7px 10px; color:var(--muted); background:rgba(220,233,223,.48); font-size:10px; }
        .home-command { display:grid; align-content:start; gap:14px; border-radius:28px; padding:18px; }
        .home-command form { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:9px; border:1px solid rgba(17,63,49,.09); border-radius:16px; padding:7px 7px 7px 12px; background:rgba(255,255,255,.7); }
        .home-command input { min-width:0; border:0; padding:7px 0; color:var(--ink); background:transparent; outline:none; }
        .home-command button { border:0; border-radius:11px; padding:8px 11px; color:#fffaf0; background:var(--leaf); cursor:pointer; }
        .home-command nav { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
        .home-command nav a { display:flex; align-items:center; gap:8px; border:1px solid rgba(17,63,49,.07); border-radius:13px; padding:10px; color:var(--muted); background:rgba(255,255,255,.42); font-size:11px; }
        .home-command nav a:hover { color:var(--leaf); background:rgba(220,233,223,.55); }
        .home-latest-link { display:grid; gap:4px; border-top:1px solid rgba(17,63,49,.07); padding:15px 3px 2px; }
        .home-latest-link span,.home-latest-link small { color:var(--quiet); font-size:9px; }
        .home-latest-link strong { font-family:var(--display-serif); font-size:18px; line-height:1.35; }
        .home-section { margin-top:20px; }
        .home-updates { border-radius:28px; padding:20px; }
        .home-updates > header,.home-panel > header { display:flex; align-items:end; justify-content:space-between; gap:16px; margin-bottom:15px; }
        .home-updates header span,.home-panel header span { color:var(--quiet); font-size:9px; letter-spacing:.11em; text-transform:uppercase; }
        .home-updates h2,.home-panel h2 { margin:4px 0 0; font-family:var(--display-serif); font-size:28px; font-weight:600; }
        .home-updates header a { color:var(--leaf); font-size:11px; }
        .home-updates-grid { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr); gap:12px; }
        .home-update-list { display:grid; gap:8px; }
        .home-content-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:start; border:1px solid rgba(17,63,49,.075); border-radius:16px; padding:13px 14px; background:rgba(255,255,255,.48); transition:transform .18s ease,background .18s ease; }
        .home-content-row:hover { transform:translateY(-2px); background:rgba(255,255,255,.74); }
        .home-content-copy { display:grid; min-width:0; gap:5px; }
        .home-content-copy small { color:var(--blue); font-size:9px; }
        .home-content-copy strong { font-family:var(--display-serif); font-size:18px; font-weight:600; line-height:1.35; }
        .home-content-copy p { display:-webkit-box; overflow:hidden; margin:2px 0 0; color:var(--muted); font-size:11px; line-height:1.65; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
        .home-content-row time { color:var(--quiet); font-size:9px; white-space:nowrap; }
        .home-content-row.is-featured { grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(170px,1fr) auto; min-height:100%; padding:0; overflow:hidden; }
        .home-content-row.is-featured .home-content-cover { min-height:180px; background-position:center; background-size:cover; }
        .home-content-row.is-featured .home-content-copy { padding:18px 18px 6px; }
        .home-content-row.is-featured .home-content-copy strong { font-size:clamp(24px,3vw,34px); }
        .home-content-row.is-featured time { padding:0 18px 17px; }
        .home-lower-grid { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr); gap:20px; margin-top:20px; }
        .home-panel { border-radius:28px; padding:20px; }
        .home-category-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .home-category-grid a { display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid rgba(17,63,49,.075); border-radius:14px; padding:13px 14px; background:rgba(255,255,255,.46); }
        .home-category-grid strong { color:var(--leaf); font-family:var(--display-serif); font-size:23px; }
        .home-panel footer { display:flex; gap:14px; margin-top:15px; padding-top:14px; border-top:1px solid rgba(17,63,49,.07); }
        .home-panel footer a { color:var(--leaf); font-size:10px; }
        .home-tool-panel > div { display:grid; gap:8px; }
        .home-tool-panel > div > a { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:11px; border:1px solid rgba(17,63,49,.075); border-radius:14px; padding:11px 12px; background:rgba(255,255,255,.46); }
        .home-tool-panel a > span { display:grid; gap:2px; }
        .home-tool-panel a strong { font-size:12px; }
        .home-tool-panel a small { color:var(--quiet); font-size:9px; }
        .home-tool-panel a b { color:var(--leaf); }
        .home-empty { margin:0; padding:28px; color:var(--quiet); text-align:center; }
        @media (max-width:900px) {
          .home-masthead,.home-updates-grid,.home-lower-grid { grid-template-columns:1fr; }
          .home-content-row.is-featured { min-height:0; }
        }
        @media (max-width:620px) {
          .home-masthead { padding-top:22px; }
          .home-intro h1 { margin-top:25px; }
          .home-command nav,.home-category-grid { grid-template-columns:1fr; }
          .home-updates,.home-panel { padding:15px; }
        }
      `}</style>
    </main>
    <LawTechDeskStyles />
  </>
}

HomePage.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'law-tech-home' })

  return {
    props: {
      recentContent: selectRecentPublicContent(items, 7),
      contentCount: items.length,
      categories: categorySummary(items)
    },
    revalidate: 1800
  }
}
