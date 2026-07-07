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
import { publicHomeQuickLinks } from '@/lib/domain/publicHome'

const categoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

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

function coverStyle(item, key) {
  if (item?.cover) return { backgroundImage: `url("${item.cover}")` }
  return { '--home-card-hue': String(publicContentStableHue(key)) }
}

function FeaturedContent({ item }) {
  if (!item) return <div className='home-feature home-empty'>还没有公开内容。</div>
  const category = publicContentCategory(item)
  const collection = publicContentCollection(item)

  return <Link className={`home-feature ${item.cover ? 'has-cover' : 'generated-cover'}`} href={publicContentHref(item)}>
    <span className='home-feature-cover' style={coverStyle(item, `${category}:${collection}:${item.title}`)} aria-hidden='true'>
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
  const generated = !item?.cover

  return <Link className='home-content-row' href={publicContentHref(item)}>
    <span
      className={`home-content-thumb ${generated ? 'generated-cover' : 'has-cover'}`}
      style={coverStyle(item, `${item?.slug}:${category}:${item?.title}`)}
      aria-hidden='true'
    >
      {generated ? <small>{category}</small> : null}
    </span>
    <span className='home-content-copy'>
      <small>{[publicContentTypeLabel(item.type), category, collection].filter(Boolean).join(' · ')}</small>
      <strong>{item.title || '未命名内容'}</strong>
      {item.summary ? <p>{item.summary}</p> : null}
    </span>
    <time>{formatDate(publicContentDate(item))}</time>
  </Link>
}

function TopicCard({ category, count, index }) {
  const hue = publicContentStableHue(`${category}:${index}`)
  return <Link className='home-topic-card' href={`/category/${encodeURIComponent(category)}`} style={{ '--topic-hue': String(hue) }}>
    <span>{category}</span>
    <strong>{count}</strong>
    <small>查看专题 ↗</small>
  </Link>
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {} }) {
  const featured = recentContent[0] || null
  const updates = recentContent.slice(1, 7)

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
        <PublicHeader />

        <section className='home-dashboard'>
          <FeaturedContent item={featured} />

          <aside className='home-command'>
            <form action='/search' method='get'>
              <LawTechIcon name='search' size={17} />
              <input name='q' type='search' placeholder='搜索内容' aria-label='搜索公开内容' />
              <button type='submit'>搜索</button>
            </form>

            <div className='home-command-title'>
              <span>常用入口</span>
              <Link href='/tools'>全部工具 ↗</Link>
            </div>
            <nav className='home-command-links' aria-label='常用入口'>
              {publicHomeQuickLinks.map(item => <Link href={item.href} key={item.label} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
                <LawTechIcon name={item.icon} size={16} />
                <span><strong>{item.label}</strong><small>{item.meta}</small></span>
                <b>↗</b>
              </Link>)}
            </nav>

            <div className='home-command-foot'>
              <strong>{contentCount}</strong>
              <span>条公开内容</span>
            </div>
          </aside>
        </section>

        <section className='home-topic-strip' aria-label='专题栏目'>
          <header>
            <div><span>Topics</span><h2>专题</h2></div>
            <Link href='/content'>进入内容库 ↗</Link>
          </header>
          <div className='home-topic-track'>
            {categoryOrder.map((category, index) => <TopicCard category={category} count={categories[category] || 0} index={index} key={category} />)}
          </div>
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
        /* homepage-surface-polish-v1 */
        .public-home { padding-bottom:68px; }
        .home-dashboard { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(290px,.72fr); gap:16px; align-items:start; padding:24px 0 16px; }
        .home-feature,.home-command,.home-topic-strip,.home-updates,.home-utility-strip {
          border:1px solid rgba(255,255,255,.72);
          background:rgba(255,255,255,.5);
          box-shadow:0 14px 42px rgba(49,67,79,.06),inset 0 1px 0 rgba(255,255,255,.9);
          backdrop-filter:blur(18px) saturate(1.04);
          -webkit-backdrop-filter:blur(18px) saturate(1.04);
        }
        .home-feature { display:grid; grid-template-columns:minmax(190px,.52fr) minmax(0,1.48fr); min-height:312px; overflow:hidden; border-radius:26px; transition:transform .2s ease,box-shadow .2s ease; }
        .home-feature:hover { transform:translateY(-2px); box-shadow:0 21px 56px rgba(49,67,79,.1),inset 0 1px 0 rgba(255,255,255,.94); }
        .home-feature-cover { display:grid; align-content:end; gap:6px; min-height:100%; padding:24px; color:#fff; background-position:center; background-size:cover; }
        .home-feature.generated-cover .home-feature-cover,.home-content-thumb.generated-cover { background:radial-gradient(circle at 76% 16%,hsla(var(--home-card-hue),46%,78%,.52),transparent 36%),radial-gradient(circle at 18% 88%,hsla(calc(var(--home-card-hue) + 24),42%,62%,.2),transparent 34%),linear-gradient(145deg,hsl(var(--home-card-hue),28%,26%),hsl(calc(var(--home-card-hue) + 22),30%,38%)); }
        .home-feature-cover small { font-size:10px; letter-spacing:.12em; opacity:.76; }
        .home-feature-cover strong { max-width:220px; font-family:var(--display-serif); font-size:clamp(24px,2.8vw,38px); font-weight:560; line-height:1.08; }
        .home-feature-copy { display:flex; min-width:0; flex-direction:column; justify-content:flex-end; padding:clamp(24px,3.2vw,38px); }
        .home-feature-copy > small { color:var(--blue); font-size:10px; }
        .home-feature-copy > strong { margin-top:12px; font-family:var(--display-serif); font-size:clamp(30px,4vw,52px); font-weight:600; line-height:1.08; letter-spacing:-.045em; }
        .home-feature-copy p { display:-webkit-box; overflow:hidden; margin:12px 0 0; color:var(--muted); font-size:13px; line-height:1.72; -webkit-box-orient:vertical; -webkit-line-clamp:3; }
        .home-feature-copy b { margin-top:18px; color:var(--leaf); font-size:11px; font-weight:680; }
        .home-command { display:grid; min-width:0; align-content:start; gap:11px; overflow:hidden; border-radius:26px; padding:15px; }
        .home-command form { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:9px; border:1px solid rgba(17,63,49,.075); border-radius:16px; padding:7px 7px 7px 12px; background:rgba(255,255,255,.78); box-shadow:inset 0 1px 0 rgba(255,255,255,.82); }
        .home-command input { min-width:0; border:0; padding:7px 0; color:var(--ink); background:transparent; outline:none; font-size:12px; }
        .home-command input::placeholder { color:#8d98a9; }
        .home-command button { border:0; border-radius:11px; padding:8px 11px; color:#fffaf0; background:var(--leaf); cursor:pointer; }
        .home-command-title { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:1px 2px 0; }
        .home-command-title span { color:var(--quiet); font-size:9px; letter-spacing:.11em; text-transform:uppercase; }
        .home-command-title a { color:var(--leaf); font-size:9px; }
        .home-command-links { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; overflow:visible; padding-bottom:0; }
        .home-command-links::-webkit-scrollbar { display:none; }
        .home-command-links a { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:8px; min-width:0; min-height:72px; border:1px solid rgba(17,63,49,.065); border-radius:15px; padding:12px; color:var(--muted); background:rgba(255,255,255,.5); scroll-snap-align:start; }
        .home-command-links a:hover { color:var(--leaf); background:rgba(220,233,223,.55); }
        .home-command-links span { display:grid; min-width:0; gap:2px; }
        .home-command-links strong { font-size:11px; }
        .home-command-links small { overflow:hidden; color:var(--quiet); font-size:8.5px; line-height:1.45; text-overflow:ellipsis; white-space:normal; }
        .home-command-links b { color:var(--leaf); font-weight:500; }
        .home-command-foot { display:flex; align-items:baseline; gap:6px; border-top:1px solid rgba(17,63,49,.06); padding:10px 3px 0; color:var(--quiet); }
        .home-command-foot strong { color:var(--leaf); font-family:var(--display-serif); font-size:25px; }
        .home-command-foot span { font-size:9px; }
        .home-topic-strip { margin-bottom:16px; overflow:hidden; border-radius:26px; padding:16px; }
        .home-topic-strip > header,.home-updates > header { display:flex; align-items:end; justify-content:space-between; gap:16px; margin-bottom:15px; }
        .home-topic-strip header span,.home-updates header span { color:var(--quiet); font-size:9px; letter-spacing:.11em; text-transform:uppercase; }
        .home-topic-strip h2,.home-updates h2 { margin:4px 0 0; font-family:var(--display-serif); font-size:29px; font-weight:600; }
        .home-topic-strip header a,.home-updates header a { color:var(--leaf); font-size:10px; }
        .home-topic-track { display:flex; gap:10px; overflow-x:auto; padding-bottom:3px; scroll-snap-type:x proximity; scrollbar-width:none; }
        .home-topic-track::-webkit-scrollbar { display:none; }
        .home-topic-card { position:relative; display:grid; flex:1 0 180px; min-height:98px; overflow:hidden; border-radius:16px; padding:14px; color:#fff; background:radial-gradient(circle at 84% 14%,hsla(var(--topic-hue),54%,78%,.45),transparent 34%),linear-gradient(145deg,hsl(var(--topic-hue),30%,26%),hsl(calc(var(--topic-hue) + 22),32%,39%)); scroll-snap-align:start; }
        .home-topic-card::after { position:absolute; inset:auto -22px -48px auto; width:96px; height:96px; border:1px solid rgba(255,255,255,.2); border-radius:50%; content:''; }
        .home-topic-card span { font-family:var(--display-serif); font-size:19px; }
        .home-topic-card strong { position:absolute; top:12px; right:14px; font-family:var(--display-serif); font-size:25px; font-weight:500; opacity:.76; }
        .home-topic-card small { align-self:end; font-size:9px; opacity:.74; }
        .home-topic-card:nth-child(2) { background:radial-gradient(circle at 78% 18%,rgba(184,215,237,.42),transparent 35%),linear-gradient(145deg,#183c54,#496d91); }
        .home-topic-card:nth-child(3) { background:radial-gradient(circle at 78% 16%,rgba(113,213,213,.34),transparent 34%),linear-gradient(145deg,#174f4c,#3d7c82); }
        .home-topic-card:nth-child(4) { background:radial-gradient(circle at 80% 18%,rgba(145,220,173,.36),transparent 35%),linear-gradient(145deg,#16533e,#408365); }
        .home-section { margin-top:0; }
        .home-updates { border-radius:26px; padding:18px; }
        .home-updates header > div:last-child { display:flex; gap:13px; }
        .home-update-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
        .home-content-row { display:grid; grid-template-columns:96px minmax(0,1fr) auto; gap:12px; align-items:stretch; min-height:112px; overflow:hidden; border:1px solid rgba(17,63,49,.07); border-radius:16px; padding:8px 12px 8px 8px; background:rgba(255,255,255,.48); transition:transform .18s ease,background .18s ease; }
        .home-content-row:hover { transform:translateY(-2px); background:rgba(255,255,255,.76); }
        .home-content-thumb { display:grid; align-content:end; min-height:96px; overflow:hidden; border-radius:12px; padding:10px; color:#fff; background-position:center; background-size:cover; }
        .home-content-thumb small { overflow:hidden; font-size:9px; opacity:.8; text-overflow:ellipsis; white-space:nowrap; }
        .home-content-copy { display:grid; min-width:0; align-content:center; gap:5px; }
        .home-content-copy small { color:var(--blue); font-size:9px; }
        .home-content-copy strong { font-family:var(--display-serif); font-size:19px; font-weight:600; line-height:1.34; }
        .home-content-copy p { display:-webkit-box; overflow:hidden; margin:2px 0 0; color:var(--muted); font-size:11px; line-height:1.65; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
        .home-content-row time { align-self:start; padding-top:4px; color:var(--quiet); font-size:9px; white-space:nowrap; }
        .home-utility-strip { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:16px; border-radius:22px; padding:9px; }
        .home-utility-strip a { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:11px; border-radius:15px; padding:12px 13px; background:rgba(255,255,255,.43); }
        .home-utility-strip a:hover { background:rgba(220,233,223,.5); }
        .home-utility-strip span { display:grid; gap:2px; }
        .home-utility-strip strong { font-size:12px; }
        .home-utility-strip small { color:var(--quiet); font-size:9px; }
        .home-utility-strip b { color:var(--leaf); }
        .home-empty { display:grid; place-items:center; min-height:220px; border-radius:30px; color:var(--quiet); }
        @media (max-width:1040px) {
          .home-content-row { grid-template-columns:92px minmax(0,1fr) auto; }
        }
        @media (max-width:940px) {
          .home-dashboard { grid-template-columns:1fr; }
          .home-feature { min-height:300px; }
          .home-command-links { grid-template-columns:repeat(3,minmax(0,1fr)); }
        }
        @media (max-width:700px) {
          .home-feature { grid-template-columns:1fr; }
          .home-feature-cover { min-height:160px; }
          .home-update-list,.home-utility-strip { grid-template-columns:1fr; }
        }
        @media (max-width:520px) {
          .home-dashboard { padding-top:20px; }
          .home-updates,.home-topic-strip { padding:15px; }
          .home-content-row { grid-template-columns:78px minmax(0,1fr); min-height:110px; padding-right:10px; }
          .home-content-thumb { min-height:92px; }
          .home-content-row time { display:none; }
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
