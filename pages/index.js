import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
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

const categoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']
const panels = ['最近', '路径', '工具', '工作台']

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
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date)
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
  return <Link className='home-path-card' href={`/category/${encodeURIComponent(category)}`}>
    <span>栏目</span>
    <strong>{category}</strong>
    <small>{count || 0} 条内容</small>
  </Link>
}

function RecentCarousel({ items = [] }) {
  const [index, setIndex] = useState(0)
  const total = Math.max(1, items.length)
  useEffect(() => {
    if (items.length <= 1) return undefined
    const timer = window.setInterval(() => setIndex(value => (value + 1) % items.length), 5200)
    return () => window.clearInterval(timer)
  }, [items.length])
  const go = offset => setIndex(value => (value + offset + total) % total)
  if (!items.length) return <div className='home-carousel-empty'>暂无公开内容</div>
  return <div className='home-recent-carousel'>
    <div className='home-carousel-viewport'>
      <div className='home-carousel-track' style={{ transform: `translateY(-${index * 100}%)` }}>
        {items.map(item => <Link className={`home-carousel-card ${item.cover ? 'has-cover' : ''}`} href={publicContentHref(item)} key={item.id || `${item.source}:${item.slug}`}>
          <div className='home-carousel-cover' style={item.cover ? { backgroundImage: `url("${item.cover}")` } : undefined}>
            {!item.cover ? <span>{publicContentCategory(item)}</span> : null}
          </div>
          <div className='home-carousel-copy'>
            <time>{formatDate(publicContentDate(item))}</time>
            <strong>{item.title || '未命名内容'}</strong>
            <small>{[publicContentTypeLabel(item.type), publicContentCategory(item)].filter(Boolean).join(' · ')}</small>
          </div>
        </Link>)}
      </div>
    </div>
    <div className='home-carousel-controls'>
      <button type='button' aria-label='上一条' onClick={() => go(-1)}>↑</button>
      <div>{items.map((item, itemIndex) => <button className={itemIndex === index ? 'active' : ''} type='button' key={item.id || itemIndex} aria-label={`第 ${itemIndex + 1} 条`} onClick={() => setIndex(itemIndex)} />)}</div>
      <button type='button' aria-label='下一条' onClick={() => go(1)}>↓</button>
    </div>
  </div>
}

export default function HomePage({ recentContent = [], randomContent = [], contentCount = 0, categories = {}, types = {} }) {
  const updates = recentContent.slice(0, 6)
  const [panel, setPanel] = useState(0)
  const startX = useRef(0)
  const articleCount = types.article || 0
  const courseCount = types['course-note'] || 0
  const randomPool = randomContent.length ? randomContent : updates

  function openRandom(event) {
    event.preventDefault()
    if (!randomPool.length) return
    const item = randomPool[Math.floor(Math.random() * randomPool.length)]
    window.location.href = publicContentHref(item)
  }

  function onPointerDown(event) {
    startX.current = event.clientX
  }

  function onPointerUp(event) {
    const delta = event.clientX - startX.current
    if (Math.abs(delta) < 70) return
    setPanel(value => Math.max(0, Math.min(panels.length - 1, value + (delta < 0 ? 1 : -1))))
  }

  return <>
    <Head>
      <title>law-tech.dev</title>
      <meta name='description' content='法学笔记、写作与工具实验。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-home home-os-v3'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell home-shell'>
        <PublicHeader active='content' />

        <section className='home-workspace'>
          <section className='home-window' onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
            <header className='home-window-bar'>
              <div className='traffic' aria-hidden='true'><i /><i /><i /></div>
              <nav className='home-tabs' aria-label='首页面板' style={{ '--panel-index': panel }}>
                <i aria-hidden='true' />
                {panels.map((item, index) => <button type='button' className={index === panel ? 'active' : ''} key={item} onClick={() => setPanel(index)}>{item}</button>)}
              </nav>
            </header>
            <div className='home-panel-viewport'>
              <div className='home-panel-track' style={{ transform: `translateX(-${panel * 100}%)` }}>
                <article className='home-panel home-panel-recent'>
                  <div className='home-summary-card'>
                    <span className='eyebrow'>law-tech.dev</span>
                    <h1>法学笔记、写作与工具实验。</h1>
                    <dl>
                      <div><dt>{contentCount}</dt><dd>内容</dd></div>
                      <div><dt>{articleCount}</dt><dd>文章</dd></div>
                      <div><dt>{courseCount}</dt><dd>课程笔记</dd></div>
                    </dl>
                    <div className='home-actions'>
                      <Link href='/content'>内容库</Link>
                      <Link href='/archive'>归档</Link>
                      <button type='button' onClick={openRandom}>随机一页</button>
                    </div>
                  </div>
                  <div className='home-list-card'>
                    <header><span>最近更新</span><Link href='/archive'>全部 ↗</Link></header>
                    <div>{updates.map(item => <RecentLine item={item} key={item.id || `${item.source}:${item.slug}`} />)}</div>
                  </div>
                </article>

                <article className='home-panel home-panel-paths'>
                  <div className='home-path-grid'>
                    {categoryOrder.map(category => <TopicPath category={category} count={categories[category] || 0} key={category} />)}
                  </div>
                </article>

                <article className='home-panel home-panel-tools'>
                  <div className='home-tool-grid'>
                    <Link href='https://law-tech.dev/ocr/' rel='noreferrer'><span>OCR</span><strong>图片与 PDF</strong></Link>
                    <Link href='https://law-tech.dev/citation/' rel='noreferrer'><span>引注</span><strong>论文与脚注</strong></Link>
                    <Link href='/tools'><span>工具</span><strong>全部入口</strong></Link>
                    <Link href='/search'><span>搜索</span><strong>全文与标签</strong></Link>
                  </div>
                </article>

                <article className='home-panel home-panel-desk'>
                  <div className='home-desk-grid'>
                    <Link href='/desk'><span>Desk</span><strong>工作台</strong><small>进入私人工作区</small></Link>
                    <Link href='/desk/today'><span>Today</span><strong>今日</strong><small>日程与待办</small></Link>
                    <Link href='/desk/writing'><span>Writing</span><strong>写作</strong><small>草稿与发布</small></Link>
                    <Link href='/desk/courses'><span>Courses</span><strong>课程</strong><small>材料与整理</small></Link>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <aside className='home-widgets'>
            <section className='home-widget home-widget-library'>
              <span>Library</span>
              <strong>{contentCount}</strong>
              <small>{Object.keys(categories).length} 个栏目 · {articleCount} 篇文章</small>
            </section>
            <section className='home-widget home-widget-recent'>
              <span>Recent</span>
              <RecentCarousel items={updates} />
            </section>
            <section className='home-widget home-widget-desk'>
              <span>Desk</span>
              <strong>工作台</strong>
              <div><Link href='/desk'>进入</Link><Link href='/desk/today'>Today</Link></div>
            </section>
            <div className='home-signature-corner' aria-hidden='true'><DynamicSignature compact /></div>
          </aside>
        </section>

        <nav className='home-dock' aria-label='常用入口'>
          <Link href='/content'><span>内</span><small>内容</small></Link>
          <Link href='/archive'><span>时</span><small>归档</small></Link>
          <button type='button' onClick={openRandom}><span>↯</span><small>随机</small></button>
          <Link href='/tools'><span>工</span><small>工具</small></Link>
          <Link href='/desk'><span>桌</span><small>工作台</small></Link>
        </nav>
      </div>
    </main>

    <style jsx global>{`
      .home-os-v3 { height:100dvh; padding:0; overflow:hidden; }
      .home-os-v3 .home-shell { width:min(1500px,calc(100vw - 28px)); height:100dvh; padding:14px 0; display:grid; grid-template-rows:auto minmax(0,1fr) auto; gap:12px; }
      .home-workspace { min-height:0; display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:14px; align-items:stretch; }
      .home-window,
      .home-widget,
      .home-dock {
        border:1px solid rgba(255,255,255,.72);
        background:linear-gradient(180deg,rgba(255,255,255,.46),rgba(255,255,255,.22));
        box-shadow:0 24px 70px rgba(24,63,50,.09),inset 0 1px 0 rgba(255,255,255,.74);
        backdrop-filter:blur(24px) saturate(1.08);
      }
      .home-window { min-width:0; border-radius:32px; overflow:hidden; }
      .home-window-bar { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:14px; padding:14px 18px 10px; }
      .traffic { display:flex; gap:8px; }
      .traffic i { width:11px; height:11px; border-radius:50%; background:#ff5f57; }
      .traffic i:nth-child(2) { background:#ffbd2e; }
      .traffic i:nth-child(3) { background:#28c840; }
      .home-tabs { position:relative; justify-self:center; display:grid; grid-template-columns:repeat(4,minmax(86px,1fr)); gap:3px; min-width:430px; padding:5px; border:1px solid rgba(255,255,255,.58); border-radius:999px; background:rgba(255,255,255,.14); overflow:hidden; }
      .home-tabs > i { position:absolute; top:5px; left:5px; width:calc((100% - 10px) / 4); height:calc(100% - 10px); border-radius:999px; background:linear-gradient(135deg,rgba(12,67,54,.96),rgba(45,89,138,.86)); box-shadow:0 12px 28px rgba(24,63,50,.18),inset 0 1px 0 rgba(255,255,255,.28); transform:translateX(calc(var(--panel-index) * 100%)); transition:transform .42s cubic-bezier(.2,1.18,.24,1); }
      .home-tabs button { position:relative; z-index:1; border:0; border-radius:999px; min-height:34px; color:var(--muted); background:transparent; cursor:pointer; font-weight:680; }
      .home-tabs button.active { color:#fffaf0; }
      .home-panel-viewport { height:calc(100% - 64px); overflow:hidden; padding:0 16px 16px; }
      .home-panel-track { display:flex; height:100%; transition:transform .52s cubic-bezier(.2,1.18,.24,1); }
      .home-panel { flex:0 0 100%; min-width:0; height:100%; border:1px solid rgba(255,255,255,.56); border-radius:26px; background:rgba(255,255,255,.22); box-shadow:inset 0 1px 0 rgba(255,255,255,.58); padding:16px; }
      .home-panel-recent { display:grid; grid-template-columns:minmax(300px,.64fr) minmax(0,1fr); gap:14px; }
      .home-summary-card,
      .home-list-card,
      .home-path-card,
      .home-tool-grid a,
      .home-desk-grid a { border:1px solid rgba(255,255,255,.58); border-radius:24px; background:rgba(255,255,255,.26); box-shadow:inset 0 1px 0 rgba(255,255,255,.6); }
      .home-summary-card { display:grid; align-content:center; padding:24px; }
      .home-summary-card h1 { margin:10px 0 0; max-width:520px; font-family:var(--display-serif); font-size:clamp(38px,4.8vw,66px); font-weight:620; line-height:1.02; letter-spacing:-.065em; }
      .home-summary-card dl { display:flex; gap:20px; margin:24px 0 0; }
      .home-summary-card div { display:grid; }
      .home-summary-card dt { font-family:var(--display-serif); color:var(--green); font-size:30px; line-height:1; }
      .home-summary-card dd { margin:3px 0 0; color:var(--quiet); font-size:10px; }
      .home-actions { display:flex!important; flex-wrap:wrap; gap:8px; margin-top:24px; }
      .home-actions a,
      .home-actions button,
      .home-widget-desk a { border:1px solid rgba(255,255,255,.62); border-radius:999px; padding:8px 12px; color:var(--green); background:rgba(255,255,255,.26); cursor:pointer; font-size:12px; }
      .home-list-card { min-width:0; padding:18px; overflow:hidden; }
      .home-list-card header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; color:var(--quiet); font-size:11px; text-transform:uppercase; letter-spacing:.12em; }
      .home-list-card header a { color:var(--green); letter-spacing:0; text-transform:none; }
      .home-list-card > div { display:grid; gap:9px; }
      .home-recent-line { display:grid; grid-template-columns:54px minmax(0,1fr) auto; align-items:center; gap:12px; border:1px solid rgba(255,255,255,.52); border-radius:18px; padding:12px 14px; background:rgba(255,255,255,.26); }
      .home-recent-line time { color:var(--quiet); font-size:11px; }
      .home-recent-line strong { display:block; overflow:hidden; font-family:var(--display-serif); font-size:21px; text-overflow:ellipsis; white-space:nowrap; }
      .home-recent-line small { display:block; margin-top:2px; color:var(--muted); font-size:10px; }
      .home-recent-line b { color:var(--green); }
      .home-panel-paths,
      .home-panel-tools,
      .home-panel-desk { display:grid; align-content:center; }
      .home-path-grid,
      .home-tool-grid,
      .home-desk-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
      .home-path-card,
      .home-tool-grid a,
      .home-desk-grid a { min-height:138px; padding:20px; transition:transform .2s var(--ease),border-radius .2s var(--ease); }
      .home-path-card:hover,
      .home-tool-grid a:hover,
      .home-desk-grid a:hover { transform:translateY(-3px); border-radius:20px; }
      .home-path-card span,
      .home-tool-grid span,
      .home-desk-grid span,
      .home-widget > span { display:block; color:var(--green); font-size:11px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
      .home-path-card strong,
      .home-tool-grid strong,
      .home-desk-grid strong { display:block; margin-top:12px; font-family:var(--display-serif); font-size:30px; font-weight:610; }
      .home-path-card small,
      .home-desk-grid small { display:block; margin-top:8px; color:var(--muted); }
      .home-widgets { min-height:0; display:grid; grid-template-rows:auto minmax(0,1fr) auto 72px; gap:12px; }
      .home-widget { border-radius:28px; padding:18px; min-width:0; overflow:hidden; }
      .home-widget-library strong { display:block; margin-top:10px; font-family:var(--display-serif); font-size:62px; line-height:.88; color:var(--green); }
      .home-widget-library small { color:var(--muted); }
      .home-widget-recent { display:grid; grid-template-rows:auto minmax(0,1fr); gap:14px; }
      .home-recent-carousel { min-height:0; display:grid; grid-template-columns:minmax(0,1fr) 28px; gap:10px; }
      .home-carousel-viewport { min-height:0; overflow:hidden; border-radius:22px; }
      .home-carousel-track { height:100%; transition:transform .6s cubic-bezier(.2,1.18,.24,1); }
      .home-carousel-card { display:grid; grid-template-columns:86px minmax(0,1fr); gap:14px; align-items:center; height:100%; min-height:150px; border:1px solid rgba(255,255,255,.56); border-radius:22px; padding:14px; background:rgba(255,255,255,.24); }
      .home-carousel-cover { height:86px; border-radius:18px; background:linear-gradient(135deg,#0f4a42,#174272); background-size:cover; background-position:center; display:grid; align-content:end; padding:10px; color:rgba(255,255,255,.72); font-size:10px; }
      .home-carousel-copy time { color:var(--quiet); font-size:11px; }
      .home-carousel-copy strong { display:block; overflow:hidden; margin-top:7px; font-family:var(--display-serif); font-size:23px; text-overflow:ellipsis; white-space:nowrap; }
      .home-carousel-copy small { display:block; margin-top:6px; color:var(--muted); font-size:11px; line-height:1.5; }
      .home-carousel-controls { display:grid; grid-template-rows:auto 1fr auto; gap:8px; align-items:center; }
      .home-carousel-controls button { border:1px solid rgba(255,255,255,.58); border-radius:999px; color:var(--green); background:rgba(255,255,255,.22); cursor:pointer; }
      .home-carousel-controls > button { width:26px; height:26px; }
      .home-carousel-controls div { display:grid; gap:6px; justify-items:center; }
      .home-carousel-controls div button { width:7px; height:7px; padding:0; opacity:.38; }
      .home-carousel-controls div button.active { opacity:1; background:var(--green); }
      .home-widget-desk strong { display:block; margin:12px 0; font-family:var(--display-serif); font-size:30px; }
      .home-widget-desk div { display:flex; gap:8px; }
      .home-signature-corner { align-self:end; justify-self:end; width:min(240px,100%); color:rgba(25,59,49,.72); padding:0 8px 2px; }
      .home-dock { justify-self:center; display:flex; align-items:end; gap:8px; border-radius:24px; padding:8px 10px 9px; }
      .home-dock a,
      .home-dock button { display:grid; place-items:center; gap:2px; width:44px; min-height:44px; border:1px solid rgba(255,255,255,.62); border-radius:16px; color:var(--green); background:rgba(255,255,255,.24); cursor:pointer; transition:transform .16s ease,border-radius .16s ease; }
      .home-dock a:hover,
      .home-dock button:hover { transform:translateY(-4px) scale(1.05); border-radius:18px; }
      .home-dock span { font-family:var(--display-serif); font-size:18px; line-height:1; }
      .home-dock small { color:var(--muted); font-size:9px; }
      @media (max-width:1100px) { .home-os-v3 { height:auto; min-height:100dvh; overflow:auto; } .home-os-v3 .home-shell { height:auto; min-height:100dvh; } .home-workspace { grid-template-columns:1fr; } .home-widgets { grid-template-rows:auto; grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:760px) { .home-panel-recent,.home-path-grid,.home-tool-grid,.home-desk-grid { grid-template-columns:1fr; } .home-tabs { min-width:0; grid-template-columns:repeat(4,minmax(0,1fr)); } .home-widgets { grid-template-columns:1fr; } }
    `}</style>
    <LawTechDeskStyles />
  </>
}

HomePage.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'law-tech-home' })

  return {
    props: {
      recentContent: selectRecentPublicContent(items, 8),
      randomContent: items.filter(item => item?.access?.mode !== 'private').slice(0, 80),
      contentCount: items.length,
      categories: categorySummary(items),
      types: typeSummary(items)
    },
    revalidate: 1800
  }
}
