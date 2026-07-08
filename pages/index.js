import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  publicContentCategory,
  publicContentDate,
  publicContentHref,
  publicContentTypeLabel,
  selectRecentPublicContent
} from '@/lib/content/publicContent'
import { publicHomeQuickLinks } from '@/lib/domain/publicHome'

const categoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

function categorySummary(items = []) {
  return items.reduce((summary, item) => {
    const category = publicContentCategory(item)
    summary[category] = (summary[category] || 0) + 1
    return summary
  }, {})
}

function typeSummary(items = []) {
  return items.reduce((summary, item) => {
    const type = item?.type || 'page'
    summary[type] = (summary[type] || 0) + 1
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

function HomeEntry({ href, icon, label, meta }) {
  return <Link className='home-entry' href={href}>
    <LawTechIcon name={icon} size={17} />
    <span><strong>{label}</strong><small>{meta}</small></span>
    <b>↗</b>
  </Link>
}

function RecentLine({ item }) {
  const category = publicContentCategory(item)
  return <Link className='home-recent-line' href={publicContentHref(item)}>
    <time>{formatDate(publicContentDate(item))}</time>
    <span>
      <strong>{item.title || '未命名内容'}</strong>
      <small>{[publicContentTypeLabel(item.type), category].filter(Boolean).join(' · ')}</small>
    </span>
    <b>↗</b>
  </Link>
}

function TopicPath({ category, count }) {
  return <Link className='home-topic-path' href={`/category/${encodeURIComponent(category)}`}>
    <strong>{category}</strong>
    <span>{count} 条内容</span>
  </Link>
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {}, types = {} }) {
  const updates = recentContent.slice(0, 6)
  const articleCount = types.article || 0
  const courseCount = types['course-note'] || 0
  const quickLinks = publicHomeQuickLinks.slice(0, 6)

  return <>
    <Head>
      <title>law-tech.dev</title>
      <meta name='description' content='法学笔记、写作与工具实验。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-home home-editorial-v3'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader />

        <section className='home-editorial-hero' aria-label='law-tech.dev'>
          <div className='home-hero-copy'>
            <div className='home-hero-kicker'>
              <span>law-tech.dev</span>
              <small>私人法学工作台</small>
            </div>
            <h1>法学笔记、写作与工具实验。</h1>
            <p>课程、文章、读书记录、OCR 与引注工具在这里汇合；公开内容留给阅读，工作台留给继续整理。</p>
          </div>

          <form className='home-search' action='/search' method='get'>
            <LawTechIcon name='search' size={18} />
            <input name='q' type='search' placeholder='搜索文章、课程、栏目或标签' aria-label='搜索公开内容' />
            <button type='submit'>搜索</button>
          </form>

          <div className='home-stat-row' aria-label='站点统计'>
            <div><strong>{contentCount}</strong><span>公开内容</span></div>
            <div><strong>{articleCount}</strong><span>文章</span></div>
            <div><strong>{courseCount}</strong><span>课程笔记</span></div>
            <div><strong>{Object.keys(categories).length}</strong><span>栏目</span></div>
          </div>

          <nav className='home-entry-grid' aria-label='核心入口'>
            <HomeEntry href='/content' icon='content' label='内容库' meta='文章、课程与项目' />
            <HomeEntry href='/search' icon='search' label='搜索' meta='全文与标签' />
            <HomeEntry href='/tools' icon='spark' label='工具' meta='OCR、引注与工作流' />
            <HomeEntry href='/desk' icon='calendar' label='工作台' meta='日程、课程与写作' />
          </nav>
        </section>

        <section className='home-editorial-board' aria-label='内容路径与最近更新'>
          <div className='home-paths'>
            <header><span>Paths</span><h2>路径</h2></header>
            <div>
              {categoryOrder.map(category => <TopicPath category={category} count={categories[category] || 0} key={category} />)}
            </div>
          </div>

          <div className='home-latest'>
            <header>
              <div><span>Latest</span><h2>最近更新</h2></div>
              <Link href='/archive'>时间归档 ↗</Link>
            </header>
            <div className='home-recent-list'>
              {updates.map(item => <RecentLine item={item} key={item.id || `${item.source}:${item.slug}`} />)}
              {!updates.length ? <p className='home-empty'>还没有公开内容。</p> : null}
            </div>
          </div>
        </section>

        <section className='home-dock' aria-label='常用入口'>
          <header><span>Dock</span><h2>常用入口</h2></header>
          <div>
            {quickLinks.map(item => <Link className='home-dock-item' href={item.href} key={item.label} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
              <LawTechIcon name={item.icon} size={16} />
              <span><strong>{item.label}</strong><small>{item.meta}</small></span>
            </Link>)}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .home-editorial-v3 { padding-bottom:82px; }
        .home-editorial-hero,
        .home-editorial-board,
        .home-dock {
          border:1px solid rgba(255,255,255,.7);
          background:rgba(255,255,255,.48);
          box-shadow:0 18px 48px rgba(24,63,50,.055),inset 0 1px 0 rgba(255,255,255,.84);
          backdrop-filter:blur(14px) saturate(1.04);
        }
        .home-editorial-hero {
          position:relative;
          display:grid;
          grid-template-columns:minmax(0,1fr);
          gap:20px;
          overflow:hidden;
          margin-top:28px;
          border-radius:30px;
          padding:clamp(28px,4.6vw,50px);
        }
        .home-editorial-hero::after {
          position:absolute;
          right:-120px;
          bottom:-190px;
          width:420px;
          height:420px;
          border:1px solid rgba(141,170,183,.2);
          border-radius:50%;
          content:'';
          pointer-events:none;
        }
        .home-hero-copy {
          position:relative;
          z-index:1;
          display:grid;
          gap:16px;
          max-width:820px;
        }
        .home-hero-kicker {
          display:flex;
          flex-wrap:wrap;
          gap:10px 14px;
          align-items:baseline;
        }
        .home-hero-kicker span {
          color:var(--leaf);
          font-size:12px;
          font-weight:760;
          letter-spacing:.24em;
          text-transform:uppercase;
        }
        .home-hero-kicker small {
          color:var(--quiet);
          font-size:11px;
        }
        .home-hero-copy h1 {
          margin:0;
          max-width:760px;
          font-family:var(--display-serif);
          font-size:clamp(42px,5.6vw,70px);
          font-weight:620;
          line-height:1.02;
          letter-spacing:-.065em;
        }
        .home-hero-copy p {
          margin:0;
          max-width:680px;
          color:var(--muted);
          font-size:15px;
          line-height:1.9;
        }
        .home-search {
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          align-items:center;
          gap:10px;
          max-width:760px;
          border:1px solid rgba(17,63,49,.08);
          border-radius:18px;
          padding:8px 8px 8px 14px;
          background:rgba(255,255,255,.64);
          box-shadow:0 10px 30px rgba(24,63,50,.045),inset 0 1px 0 rgba(255,255,255,.9);
        }
        .home-search input {
          min-width:0;
          border:0;
          padding:10px 0;
          color:var(--ink);
          background:transparent;
          outline:none;
          font-size:13px;
        }
        .home-search button {
          border:0;
          border-radius:12px;
          padding:10px 15px;
          color:#fffaf0;
          background:var(--leaf);
          cursor:pointer;
          font-weight:680;
        }
        .home-stat-row {
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:8px;
          max-width:760px;
        }
        .home-stat-row div {
          border:1px solid rgba(17,63,49,.06);
          border-radius:15px;
          padding:11px 12px;
          background:rgba(255,255,255,.36);
        }
        .home-stat-row strong {
          display:block;
          color:var(--leaf);
          font-family:var(--display-serif);
          font-size:27px;
          font-weight:520;
          line-height:1;
        }
        .home-stat-row span {
          display:block;
          margin-top:4px;
          color:var(--quiet);
          font-size:9px;
        }
        .home-entry-grid {
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:9px;
          margin-top:2px;
        }
        .home-entry,
        .home-topic-path,
        .home-recent-line,
        .home-dock-item {
          border:1px solid rgba(17,63,49,.06);
          background:rgba(255,255,255,.42);
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .home-entry:hover,
        .home-topic-path:hover,
        .home-recent-line:hover,
        .home-dock-item:hover {
          transform:translateY(-2px);
          border-color:rgba(49,90,140,.16);
          background:rgba(255,255,255,.7);
        }
        .home-entry {
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          align-items:center;
          gap:9px;
          min-width:0;
          border-radius:16px;
          padding:12px;
          color:var(--muted);
        }
        .home-entry span,
        .home-dock-item span {
          display:grid;
          min-width:0;
          gap:2px;
        }
        .home-entry strong,
        .home-dock-item strong {
          font-size:12px;
        }
        .home-entry small,
        .home-dock-item small {
          overflow:hidden;
          color:var(--quiet);
          font-size:9px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .home-entry b {
          color:var(--leaf);
          font-weight:500;
        }
        .home-editorial-board {
          display:grid;
          grid-template-columns:minmax(260px,.48fr) minmax(0,1fr);
          gap:18px;
          margin-top:18px;
          border-radius:30px;
          padding:18px;
        }
        .home-paths,
        .home-latest {
          min-width:0;
        }
        .home-paths header,
        .home-latest header,
        .home-dock header {
          display:flex;
          align-items:end;
          justify-content:space-between;
          gap:16px;
          margin-bottom:13px;
        }
        .home-paths header span,
        .home-latest header span,
        .home-dock header span {
          color:var(--quiet);
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
        }
        .home-paths h2,
        .home-latest h2,
        .home-dock h2 {
          margin:4px 0 0;
          font-family:var(--display-serif);
          font-size:27px;
          font-weight:600;
        }
        .home-latest header a {
          color:var(--leaf);
          font-size:10px;
        }
        .home-paths > div,
        .home-recent-list {
          display:grid;
          gap:8px;
        }
        .home-topic-path {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          border-radius:16px;
          padding:13px 14px;
        }
        .home-topic-path strong {
          font-family:var(--display-serif);
          font-size:20px;
          font-weight:580;
        }
        .home-topic-path span {
          color:var(--quiet);
          font-size:10px;
        }
        .home-recent-line {
          display:grid;
          grid-template-columns:52px minmax(0,1fr) auto;
          align-items:center;
          gap:12px;
          border-radius:16px;
          padding:12px;
        }
        .home-recent-line time {
          color:var(--blue);
          font-size:10px;
        }
        .home-recent-line span {
          display:grid;
          min-width:0;
          gap:3px;
        }
        .home-recent-line strong {
          overflow:hidden;
          font-family:var(--display-serif);
          font-size:18px;
          line-height:1.25;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .home-recent-line small {
          color:var(--quiet);
          font-size:9px;
        }
        .home-recent-line b {
          color:var(--leaf);
          font-weight:500;
        }
        .home-dock {
          margin-top:18px;
          border-radius:28px;
          padding:16px 18px 18px;
        }
        .home-dock > div {
          display:grid;
          grid-template-columns:repeat(6,minmax(0,1fr));
          gap:8px;
        }
        .home-dock-item {
          display:grid;
          grid-template-columns:auto minmax(0,1fr);
          align-items:center;
          gap:8px;
          min-width:0;
          border-radius:15px;
          padding:11px;
          color:var(--muted);
        }
        .home-empty {
          margin:0;
          color:var(--quiet);
          font-size:12px;
        }
        @media (max-width:1080px) {
          .home-entry-grid,
          .home-dock > div {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
          .home-editorial-board {
            grid-template-columns:1fr;
          }
        }
        @media (max-width:720px) {
          .home-editorial-hero {
            margin-top:20px;
            padding:24px;
          }
          .home-search {
            grid-template-columns:1fr;
          }
          .home-search svg {
            display:none;
          }
          .home-search button {
            min-height:42px;
          }
          .home-stat-row,
          .home-entry-grid,
          .home-dock > div {
            grid-template-columns:1fr;
          }
        }
        @media (max-width:560px) {
          .home-editorial-hero,
          .home-editorial-board,
          .home-dock {
            border-radius:22px;
          }
          .home-hero-copy h1 {
            font-size:clamp(36px,11vw,52px);
          }
          .home-topic-path,
          .home-recent-line {
            grid-template-columns:1fr;
          }
          .home-recent-line b {
            display:none;
          }
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
      categories: categorySummary(items),
      types: typeSummary(items)
    },
    revalidate: 1800
  }
}
