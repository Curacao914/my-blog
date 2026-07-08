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
  publicContentTags,
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

function FeaturedSignal({ item }) {
  if (!item) return <div className='home-system-signal is-empty'><span>Latest</span><strong>还没有公开内容</strong><p>内容发布后会出现在这里。</p></div>
  const category = publicContentCategory(item)
  const collection = publicContentCollection(item)
  return <Link className='home-system-signal' href={publicContentHref(item)}>
    <span>{[publicContentTypeLabel(item.type), category, formatDate(publicContentDate(item))].filter(Boolean).join(' · ')}</span>
    <strong>{item.title || '未命名内容'}</strong>
    {item.summary ? <p>{item.summary}</p> : null}
    <small>{collection || '继续阅读'} ↗</small>
  </Link>
}

function HomeEntry({ href, icon, label, meta, primary = false }) {
  return <Link className={`home-entry ${primary ? 'is-primary' : ''}`} href={href}>
    <LawTechIcon name={icon} size={18} />
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
    <span>{category}</span>
    <small>{count} 条内容</small>
    <b>进入路径 ↗</b>
  </Link>
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {}, types = {} }) {
  const featured = recentContent[0] || null
  const updates = recentContent.slice(0, 5)
  const articleCount = types.article || 0
  const courseCount = types['course-note'] || 0
  const tagCount = recentContent.reduce((count, item) => count + publicContentTags(item).length, 0)
  const quickLinks = publicHomeQuickLinks.slice(0, 6)

  return <>
    <Head>
      <title>law-tech.dev</title>
      <meta name='description' content='法学、写作、课程整理与工具实验的个人工作系统。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-home home-revolution-v2'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader />

        <section className='home-system-hero' aria-label='law-tech.dev 入口'>
          <div className='home-system-copy'>
            <span className='eyebrow'>law-tech.dev</span>
            <h1>法学、写作、课程与工具的个人工作系统。</h1>
            <p>这里存放课程笔记、文章、读书记录、工具实验和私人工作台。公开页面负责呈现可以被看见的内容，工作台负责继续生产、整理和回到现实任务。</p>
            <form className='home-command-search' action='/search' method='get'>
              <LawTechIcon name='search' size={18} />
              <input name='q' type='search' placeholder='搜索文章、课程、栏目或标签' aria-label='搜索公开内容' />
              <button type='submit'>搜索</button>
            </form>
            <nav className='home-primary-entries' aria-label='核心入口'>
              <HomeEntry href='/content' icon='content' label='内容库' meta={`${contentCount} 条公开内容`} primary />
              <HomeEntry href='/search' icon='search' label='搜索' meta='全文与标签' />
              <HomeEntry href='/tools' icon='spark' label='工具' meta='OCR、引注与工作流' />
              <HomeEntry href='/desk' icon='calendar' label='工作台' meta='日程、课程与写作' />
            </nav>
          </div>

          <aside className='home-system-panel'>
            <div className='home-system-status'>
              <span>System</span>
              <strong>{contentCount}</strong>
              <small>条公开内容</small>
            </div>
            <dl className='home-system-metrics'>
              <div><dt>{articleCount}</dt><dd>文章</dd></div>
              <div><dt>{courseCount}</dt><dd>课程笔记</dd></div>
              <div><dt>{Object.keys(categories).length}</dt><dd>栏目</dd></div>
              <div><dt>{tagCount}</dt><dd>近期标签</dd></div>
            </dl>
            <FeaturedSignal item={featured} />
          </aside>
        </section>

        <section className='home-operating-board' aria-label='公开内容与工具路径'>
          <div className='home-board-column home-board-routes'>
            <header><span>Paths</span><h2>从哪里进入</h2></header>
            <div className='home-route-list'>
              {categoryOrder.map(category => <TopicPath category={category} count={categories[category] || 0} key={category} />)}
            </div>
          </div>

          <div className='home-board-column home-board-updates'>
            <header>
              <div><span>Latest</span><h2>最近更新</h2></div>
              <Link href='/archive'>时间归档 ↗</Link>
            </header>
            <div className='home-recent-list'>
              {updates.map(item => <RecentLine item={item} key={item.id || `${item.source}:${item.slug}`} />)}
              {!updates.length ? <p className='home-quiet-empty'>还没有公开内容。</p> : null}
            </div>
          </div>
        </section>

        <section className='home-tool-dock' aria-label='常用工具'>
          <header><span>Command Dock</span><h2>常用入口</h2></header>
          <div>
            {quickLinks.map(item => <Link className='home-dock-item' href={item.href} key={item.label} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
              <LawTechIcon name={item.icon} size={16} />
              <span><strong>{item.label}</strong><small>{item.meta}</small></span>
            </Link>)}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .home-revolution-v2 { padding-bottom:82px; }
        .home-system-hero {
          display:grid;
          grid-template-columns:minmax(0,1.06fr) minmax(330px,.52fr);
          gap:18px;
          padding:34px 0 18px;
        }
        .home-system-copy,
        .home-system-panel,
        .home-operating-board,
        .home-tool-dock {
          border:1px solid rgba(255,255,255,.7);
          background:rgba(255,255,255,.48);
          box-shadow:0 18px 48px rgba(24,63,50,.055),inset 0 1px 0 rgba(255,255,255,.84);
          backdrop-filter:blur(14px) saturate(1.04);
        }
        .home-system-copy {
          position:relative;
          overflow:hidden;
          border-radius:30px;
          padding:clamp(28px,5vw,54px);
        }
        .home-system-copy::before {
          position:absolute;
          inset:auto -16% -38% auto;
          width:360px;
          height:360px;
          border:1px solid rgba(141,170,183,.22);
          border-radius:50%;
          content:'';
        }
        .home-system-copy h1 {
          position:relative;
          max-width:820px;
          margin:12px 0 0;
          font-family:var(--display-serif);
          font-size:clamp(42px,6.4vw,82px);
          font-weight:620;
          line-height:.98;
          letter-spacing:-.07em;
        }
        .home-system-copy p {
          position:relative;
          max-width:690px;
          margin:22px 0 0;
          color:var(--muted);
          font-size:15px;
          line-height:1.9;
        }
        .home-command-search {
          position:relative;
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          align-items:center;
          gap:10px;
          max-width:720px;
          margin-top:28px;
          border:1px solid rgba(17,63,49,.08);
          border-radius:18px;
          padding:8px 8px 8px 14px;
          background:rgba(255,255,255,.64);
          box-shadow:0 10px 30px rgba(24,63,50,.045),inset 0 1px 0 rgba(255,255,255,.9);
        }
        .home-command-search input {
          min-width:0;
          border:0;
          padding:10px 0;
          color:var(--ink);
          background:transparent;
          outline:none;
          font-size:13px;
        }
        .home-command-search button {
          border:0;
          border-radius:12px;
          padding:10px 15px;
          color:#fffaf0;
          background:var(--leaf);
          cursor:pointer;
          font-weight:680;
        }
        .home-primary-entries {
          position:relative;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:9px;
          margin-top:18px;
        }
        .home-entry {
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          align-items:center;
          gap:9px;
          min-width:0;
          border:1px solid rgba(17,63,49,.07);
          border-radius:16px;
          padding:12px;
          color:var(--muted);
          background:rgba(255,255,255,.4);
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .home-entry:hover {
          transform:translateY(-2px);
          border-color:rgba(49,90,140,.16);
          background:rgba(255,255,255,.68);
        }
        .home-entry.is-primary {
          color:#fffaf0;
          border-color:rgba(24,63,50,.22);
          background:linear-gradient(145deg,rgba(24,63,50,.96),rgba(37,80,67,.9));
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
          color:inherit;
          opacity:.68;
          font-size:9px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .home-entry b {
          color:currentColor;
          font-weight:500;
        }
        .home-system-panel {
          display:grid;
          align-content:start;
          gap:12px;
          border-radius:30px;
          padding:18px;
        }
        .home-system-status {
          display:grid;
          min-height:150px;
          align-content:end;
          border-radius:22px;
          padding:18px;
          color:#fffaf0;
          background:
            radial-gradient(circle at 80% 12%,rgba(141,170,183,.32),transparent 38%),
            linear-gradient(145deg,#183f32,#315a8c);
        }
        .home-system-status span {
          font-size:9px;
          letter-spacing:.14em;
          text-transform:uppercase;
          opacity:.7;
        }
        .home-system-status strong {
          margin-top:10px;
          font-family:var(--display-serif);
          font-size:54px;
          font-weight:520;
          line-height:.9;
        }
        .home-system-status small {
          margin-top:4px;
          font-size:11px;
          opacity:.75;
        }
        .home-system-metrics {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:8px;
          margin:0;
        }
        .home-system-metrics div {
          border:1px solid rgba(17,63,49,.06);
          border-radius:16px;
          padding:11px;
          background:rgba(255,255,255,.42);
        }
        .home-system-metrics dt {
          color:var(--leaf);
          font-family:var(--display-serif);
          font-size:26px;
        }
        .home-system-metrics dd {
          margin:2px 0 0;
          color:var(--quiet);
          font-size:9px;
        }
        .home-system-signal {
          display:grid;
          gap:7px;
          border-top:1px solid rgba(17,63,49,.08);
          padding:14px 3px 0;
        }
        .home-system-signal span {
          color:var(--blue);
          font-size:9px;
        }
        .home-system-signal strong {
          font-family:var(--display-serif);
          font-size:23px;
          line-height:1.22;
        }
        .home-system-signal p {
          display:-webkit-box;
          overflow:hidden;
          margin:0;
          color:var(--muted);
          font-size:11px;
          line-height:1.65;
          -webkit-box-orient:vertical;
          -webkit-line-clamp:3;
        }
        .home-system-signal small {
          color:var(--leaf);
          font-size:10px;
        }
        .home-operating-board {
          display:grid;
          grid-template-columns:minmax(280px,.72fr) minmax(0,1fr);
          gap:18px;
          margin-top:18px;
          border-radius:30px;
          padding:18px;
        }
        .home-board-column {
          min-width:0;
        }
        .home-board-column > header,
        .home-tool-dock > header {
          display:flex;
          align-items:end;
          justify-content:space-between;
          gap:16px;
          margin-bottom:13px;
        }
        .home-board-column header span,
        .home-tool-dock header span {
          color:var(--quiet);
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
        }
        .home-board-column h2,
        .home-tool-dock h2 {
          margin:4px 0 0;
          font-family:var(--display-serif);
          font-size:27px;
          font-weight:600;
        }
        .home-board-column header a {
          color:var(--leaf);
          font-size:10px;
        }
        .home-route-list,
        .home-recent-list {
          display:grid;
          gap:8px;
        }
        .home-topic-path,
        .home-recent-line {
          display:grid;
          align-items:center;
          min-width:0;
          border:1px solid rgba(17,63,49,.06);
          border-radius:16px;
          background:rgba(255,255,255,.42);
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .home-topic-path {
          grid-template-columns:minmax(0,1fr) auto;
          gap:10px;
          padding:13px 14px;
        }
        .home-topic-path:hover,
        .home-recent-line:hover,
        .home-dock-item:hover {
          transform:translateY(-2px);
          border-color:rgba(49,90,140,.16);
          background:rgba(255,255,255,.7);
        }
        .home-topic-path span {
          font-family:var(--display-serif);
          font-size:21px;
        }
        .home-topic-path small {
          color:var(--quiet);
          font-size:10px;
        }
        .home-topic-path b {
          grid-column:1 / -1;
          color:var(--leaf);
          font-size:9px;
          font-weight:600;
        }
        .home-recent-line {
          grid-template-columns:52px minmax(0,1fr) auto;
          gap:12px;
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
        .home-tool-dock {
          margin-top:18px;
          border-radius:28px;
          padding:16px 18px 18px;
        }
        .home-tool-dock > div {
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
          border:1px solid rgba(17,63,49,.06);
          border-radius:15px;
          padding:11px;
          color:var(--muted);
          background:rgba(255,255,255,.38);
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .home-quiet-empty {
          margin:0;
          color:var(--quiet);
          font-size:12px;
        }
        @media (max-width:1080px) {
          .home-system-hero,
          .home-operating-board {
            grid-template-columns:1fr;
          }
          .home-system-panel {
            grid-template-columns:minmax(210px,.7fr) minmax(0,1fr);
          }
          .home-system-signal {
            grid-column:1 / -1;
          }
          .home-tool-dock > div {
            grid-template-columns:repeat(3,minmax(0,1fr));
          }
        }
        @media (max-width:760px) {
          .home-system-hero {
            padding-top:22px;
          }
          .home-primary-entries,
          .home-system-panel,
          .home-tool-dock > div {
            grid-template-columns:1fr;
          }
          .home-command-search {
            grid-template-columns:1fr;
          }
          .home-command-search svg {
            display:none;
          }
          .home-command-search button {
            min-height:42px;
          }
        }
        @media (max-width:560px) {
          .home-system-copy,
          .home-system-panel,
          .home-operating-board,
          .home-tool-dock {
            border-radius:22px;
          }
          .home-system-copy {
            padding:24px;
          }
          .home-system-copy h1 {
            font-size:clamp(38px,12vw,54px);
          }
          .home-system-metrics,
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
