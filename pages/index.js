import Head from 'next/head'
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
  publicContentStableHue,
  publicContentTypeLabel,
  selectRecentPublicContent
} from '@/lib/content/publicContent'

const categoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

const quickLinks = [
  { label: '内容库', href: '/content', icon: 'content' },
  { label: 'OCR', href: 'https://law-tech.dev/ocr/', icon: 'materials' },
  { label: '引注', href: 'https://law-tech.dev/citation/', icon: 'writing' },
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

function FeaturedContent({ item }) {
  if (!item) return <div className='home-feature home-empty'>还没有公开内容。</div>
  const category = publicContentCategory(item)
  const collection = publicContentCollection(item)
  const hue = publicContentStableHue(`${category}:${collection}:${item.title}`)
  const coverStyle = item.cover
    ? { backgroundImage: `url("${item.cover}")` }
    : { '--home-cover-hue': String(hue) }

  return <Link className={`home-feature ${item.cover ? 'has-cover' : 'generated-cover'}`} href={publicContentHref(item)}>
    <span className='home-feature-cover' style={coverStyle} aria-hidden='true'>
      {!item.cover ? <><small>{category}</small><strong>{collection || publicContentTypeLabel(item.type)}</strong></> : null}
    </span>
    <span className='home-feature-copy'>
      <small>{[publicContentTypeLabel(item.type), category, formatDate(publicContentDate(item))].filter(Boolean).join(' · ')}</small>
      <strong>{item.title || '未命名内容'}</strong>
      {item.summary ? <p>{item.summary}</p> : null}
      <b>阅读全文 ↗</b>
    </span>
  </Link>
}

function ContentRow({ item }) {
  const category = publicContentCategory(item)
  const collection = publicContentCollection(item)
  return <Link className='home-content-row' href={publicContentHref(item)}>
    <span className='home-content-copy'>
      <small>{[publicContentTypeLabel(item.type), category, collection].filter(Boolean).join(' · ')}</small>
      <strong>{item.title || '未命名内容'}</strong>
      {item.summary ? <p>{item.summary}</p> : null}
    </span>
    <time>{formatDate(publicContentDate(item))}</time>
  </Link>
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {} }) {
  const featured = recentContent[0] || null
  const updates = recentContent.slice(1, 7)
  const latestDate = formatDate(publicContentDate(featured))
  const summary = [contentCount ? `${contentCount} 条内容` : '', latestDate ? `更新 ${latestDate}` : ''].filter(Boolean).join(' · ')

  return <>
    <Head>
      <title>law-tech.dev</title>
      <meta name='description' content='法学笔记、文章、课程整理与工具。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-home'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader summary={summary} />

        <section className='home-dashboard'>
          <FeaturedContent item={featured} />

          <aside className='home-command'>
            <form action='/search' method='get'>
              <LawTechIcon name='search' size={17} />
              <input name='q' type='search' placeholder='搜索文章、课程或关键词' aria-label='搜索公开内容' />
              <button type='submit'>搜索</button>
            </form>

            <nav aria-label='常用入口'>
              {quickLinks.map(item => <Link href={item.href} key={item.label} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
                <LawTechIcon name={item.icon} size={15} />
                <span>{item.label}</span>
                <b>↗</b>
              </Link>)}
            </nav>

            <div className='home-category-summary'>
              {categoryOrder.map(category => <Link href={`/category/${encodeURIComponent(category)}`} key={category}>
                <span>{category}</span><strong>{categories[category] || 0}</strong>
              </Link>)}
            </div>
          </aside>
        </section>

        <section className='home-section home-updates'>
          <header>
            <div><span>Latest</span><h2>最近更新</h2></div>
            <div><Link href='/archive'>时间归档</Link><Link href='/content'>全部内容 ↗</Link></div>
          </header>
          <div className='home-update-list'>
            {updates.map(item => <ContentRow item={item} key={item.id || `${item.source}:${item.slug}`} />)}
            {!updates.length ? <p className='home-empty'>还没有更多公开内容。</p> : null}
          </div>
        </section>

        <section className='home-utility-strip'>
          <Link href='/desk/writing'><LawTechIcon name='writing' size={18} /><span><strong>Writing Studio</strong><small>草稿、预览与发布</small></span><b>→</b></Link>
          <Link href='/tag'><LawTechIcon name='content' size={18} /><span><strong>标签</strong><small>按主题继续浏览</small></span><b>→</b></Link>
          <Link href='/about'><LawTechIcon name='spark' size={18} /><span><strong>关于</strong><small>学习与项目经历</small></span><b>→</b></Link>
        </section>
      </div>

      <style jsx global>{`
        .public-home { padding-bottom: 76px; }
        .home-dashboard { display:grid; grid-template-columns:minmax(0,1.42fr) minmax(310px,.58fr); gap:20px; padding:32px 0 20px; }
        .home-feature,.home-command,.home-updates,.home-utility-strip {
          border:1px solid rgba(255,255,255,.78);
          background:rgba(255,255,255,.56);
          box-shadow:0 18px 55px rgba(24,63,50,.07),inset 0 1px 0 rgba(255,255,255,.9);
          backdrop-filter:blur(22px) saturate(1.06);
        }
        .home-feature { display:grid; grid-template-columns:minmax(230px,.82fr) minmax(0,1.18fr); min-height:390px; overflow:hidden; border-radius:30px; transition:transform .2s ease,box-shadow .2s ease; }
        .home-feature:hover { transform:translateY(-3px); box-shadow:0 26px 70px rgba(24,63,50,.12),inset 0 1px 0 rgba(255,255,255,.94); }
        .home-feature-cover { display:grid; align-content:end; gap:6px; min-height:100%; padding:30px; color:#fff; background-position:center; background-size:cover; }
        .home-feature.generated-cover .home-feature-cover { background:radial-gradient(circle at 78% 10%,hsla(var(--home-cover-hue),58%,76%,.86),transparent 42%),linear-gradient(145deg,hsl(var(--home-cover-hue),34%,25%),hsl(calc(var(--home-cover-hue) + 28),38%,44%)); }
        .home-feature-cover small { font-size:10px; letter-spacing:.12em; opacity:.76; }
        .home-feature-cover strong { max-width:260px; font-family:var(--display-serif); font-size:clamp(28px,3.2vw,44px); font-weight:560; line-height:1.08; }
        .home-feature-copy { display:flex; min-width:0; flex-direction:column; justify-content:flex-end; padding:clamp(26px,4vw,46px); }
        .home-feature-copy > small { color:var(--blue); font-size:10px; }
        .home-feature-copy > strong { margin-top:14px; font-family:var(--display-serif); font-size:clamp(32px,4.6vw,58px); font-weight:600; line-height:1.08; letter-spacing:-.045em; }
        .home-feature-copy p { display:-webkit-box; overflow:hidden; margin:16px 0 0; color:var(--muted); font-size:13px; line-height:1.8; -webkit-box-orient:vertical; -webkit-line-clamp:4; }
        .home-feature-copy b { margin-top:24px; color:var(--leaf); font-size:11px; font-weight:680; }
        .home-command { display:grid; align-content:start; gap:13px; border-radius:30px; padding:18px; }
        .home-command form { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:9px; border:1px solid rgba(17,63,49,.09); border-radius:16px; padding:7px 7px 7px 12px; background:rgba(255,255,255,.72); }
        .home-command input { min-width:0; border:0; padding:7px 0; color:var(--ink); background:transparent; outline:none; }
        .home-command button { border:0; border-radius:11px; padding:8px 11px; color:#fffaf0; background:var(--leaf); cursor:pointer; }
        .home-command nav { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
        .home-command nav a { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:8px; border:1px solid rgba(17,63,49,.07); border-radius:13px; padding:10px; color:var(--muted); background:rgba(255,255,255,.46); font-size:11px; }
        .home-command nav a:hover { color:var(--leaf); background:rgba(220,233,223,.55); }
        .home-command nav b { color:var(--leaf); font-weight:500; }
        .home-category-summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; border-top:1px solid rgba(17,63,49,.07); padding-top:13px; }
        .home-category-summary a { display:flex; align-items:center; justify-content:space-between; gap:8px; border-radius:11px; padding:8px 9px; color:var(--muted); background:rgba(255,255,255,.34); font-size:10px; }
        .home-category-summary strong { color:var(--leaf); font-family:var(--display-serif); font-size:17px; }
        .home-section { margin-top:0; }
        .home-updates { border-radius:30px; padding:20px; }
        .home-updates > header { display:flex; align-items:end; justify-content:space-between; gap:16px; margin-bottom:15px; }
        .home-updates header span { color:var(--quiet); font-size:9px; letter-spacing:.11em; text-transform:uppercase; }
        .home-updates h2 { margin:4px 0 0; font-family:var(--display-serif); font-size:29px; font-weight:600; }
        .home-updates header > div:last-child { display:flex; gap:13px; }
        .home-updates header a { color:var(--leaf); font-size:10px; }
        .home-update-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
        .home-content-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:start; min-height:128px; border:1px solid rgba(17,63,49,.075); border-radius:17px; padding:15px 16px; background:rgba(255,255,255,.5); transition:transform .18s ease,background .18s ease; }
        .home-content-row:hover { transform:translateY(-2px); background:rgba(255,255,255,.76); }
        .home-content-copy { display:grid; min-width:0; gap:5px; }
        .home-content-copy small { color:var(--blue); font-size:9px; }
        .home-content-copy strong { font-family:var(--display-serif); font-size:19px; font-weight:600; line-height:1.34; }
        .home-content-copy p { display:-webkit-box; overflow:hidden; margin:2px 0 0; color:var(--muted); font-size:11px; line-height:1.65; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
        .home-content-row time { color:var(--quiet); font-size:9px; white-space:nowrap; }
        .home-utility-strip { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:20px; border-radius:24px; padding:10px; }
        .home-utility-strip a { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:11px; border-radius:15px; padding:12px 13px; background:rgba(255,255,255,.43); }
        .home-utility-strip a:hover { background:rgba(220,233,223,.5); }
        .home-utility-strip span { display:grid; gap:2px; }
        .home-utility-strip strong { font-size:12px; }
        .home-utility-strip small { color:var(--quiet); font-size:9px; }
        .home-utility-strip b { color:var(--leaf); }
        .home-empty { display:grid; place-items:center; min-height:220px; border-radius:30px; color:var(--quiet); }
        @media (max-width:940px) {
          .home-dashboard { grid-template-columns:1fr; }
          .home-feature { min-height:340px; }
        }
        @media (max-width:700px) {
          .home-feature { grid-template-columns:1fr; }
          .home-feature-cover { min-height:190px; }
          .home-update-list,.home-utility-strip { grid-template-columns:1fr; }
        }
        @media (max-width:520px) {
          .home-dashboard { padding-top:20px; }
          .home-command nav,.home-category-summary { grid-template-columns:1fr; }
          .home-updates { padding:15px; }
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
