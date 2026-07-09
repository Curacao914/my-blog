import Head from 'next/head'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
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
const homePanels = ['最近', '路径', '工具', '工作台']

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

function stableKey(item) {
  return item?.id || `${item?.source || 'content'}:${item?.slug || item?.title || 'untitled'}`
}

function RecentRow({ item }) {
  const meta = [publicContentTypeLabel(item?.type), publicContentCategory(item)].filter(Boolean).join(' · ')
  return <Link className='home-recent-row' href={publicContentHref(item)}>
    <time>{formatDate(publicContentDate(item))}</time>
    <span><strong>{item?.title || '未命名内容'}</strong><small>{meta}</small></span>
    <b>↗</b>
  </Link>
}

function RecentRotor({ items }) {
  return <div className='home-widget-rotor' aria-label='近期笔记轮转'>
    {items.slice(0, 5).map(item => {
      const date = formatDate(publicContentDate(item))
      const meta = [publicContentTypeLabel(item?.type), publicContentCategory(item)].filter(Boolean).join(' · ')
      return <Link className='home-rotor-card' href={publicContentHref(item)} key={stableKey(item)}>
        <div className={`home-rotor-cover ${item?.cover ? 'has-cover' : ''}`} style={item?.cover ? { backgroundImage: `url("${item.cover}")` } : undefined}>
          {!item?.cover ? <span>{publicContentCategory(item)}</span> : null}
        </div>
        <div>
          <small>{date}</small>
          <strong>{item?.title || '未命名内容'}</strong>
          <span>{meta}</span>
        </div>
      </Link>
    })}
  </div>
}

function PathPlot({ categories }) {
  return <div className='home-path-plot'>
    <div className='home-orbit' aria-hidden='true' />
    {categoryOrder.map((category, index) => <Link
      className={`home-path-folder folder-${index + 1}`}
      href={`/category/${encodeURIComponent(category)}`}
      key={category}
    >
      <strong>{category}</strong>
      <span>{categories[category] || 0} 条</span>
    </Link>)}
  </div>
}

function ToolGrid() {
  const tools = [
    { label: 'OCR', meta: '图片与 PDF 识别整理', href: 'https://law-tech.dev/ocr/' },
    { label: '引注', meta: '脚注与参考文献辅助', href: 'https://law-tech.dev/citation/' },
    { label: '搜索', meta: '内容、课程与标签入口', href: '/search' },
    { label: '写作', meta: '草稿、材料与发布流程', href: '/desk/writing' }
  ]
  return <div className='home-tool-grid'>
    {tools.map(tool => <Link className='home-tool-tile' href={tool.href} key={tool.label} rel={tool.href.startsWith('http') ? 'noreferrer' : undefined}>
      <strong>{tool.label}</strong>
      <span>{tool.meta}</span>
    </Link>)}
  </div>
}

function DeskGrid() {
  const items = [
    { label: 'Today', meta: '今日与待办', href: '/desk/today', icon: 'today' },
    { label: 'Writing', meta: '草稿与发布', href: '/desk/writing', icon: 'writing' },
    { label: 'Courses', meta: '课程整理', href: '/desk/courses', icon: 'courses' },
    { label: 'Agent', meta: '命令入口', href: '/desk/agent', icon: 'spark' }
  ]
  return <div className='home-desk-grid'>
    {items.map(item => <Link className='home-desk-app' href={item.href} key={item.label}>
      <i><LawTechIcon name={item.icon} size={18} /></i>
      <strong>{item.label}</strong>
      <span>{item.meta}</span>
    </Link>)}
  </div>
}

function HomePanelTabs({ recentContent, categories }) {
  const [active, setActive] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const tabsRef = useRef(null)
  const buttonRefs = useRef([])
  const dragRef = useRef({ startX: 0, deltaX: 0 })

  const moveIndicator = useCallback((index, transient = false) => {
    const tabs = tabsRef.current
    const button = buttonRefs.current[index]
    if (!tabs || !button) return
    const parent = tabs.getBoundingClientRect()
    const box = button.getBoundingClientRect()
    tabs.style.setProperty('--home-tab-x', `${box.left - parent.left}px`)
    tabs.style.setProperty('--home-tab-w', `${box.width}px`)
    if (transient) tabs.classList.add('is-following')
  }, [])

  useEffect(() => {
    moveIndicator(active)
  }, [active, moveIndicator])

  const finishDrag = useCallback(() => {
    const deltaX = dragRef.current.deltaX
    setDragging(false)
    setDragOffset(0)
    if (Math.abs(deltaX) > 78) {
      setActive(value => Math.max(0, Math.min(homePanels.length - 1, value + (deltaX < 0 ? 1 : -1))))
    } else {
      moveIndicator(active)
    }
    dragRef.current.deltaX = 0
  }, [active, moveIndicator])

  const trackStyle = {
    transform: `translateX(calc(${-active * 100}% - ${active * 12}px + ${dragOffset}px))`,
    transition: dragging ? 'none' : 'transform .62s cubic-bezier(.2,1.32,.28,1)'
  }

  return <section className='home-app-window' aria-label='law-tech.dev 首页'>
    <div className='home-window-top'>
      <div className='home-traffic' aria-hidden='true'><i /><i /><i /></div>
      <nav className='home-panel-tabs' ref={tabsRef} onMouseLeave={() => { tabsRef.current?.classList.remove('is-following'); moveIndicator(active) }}>
        <i className='home-panel-indicator' aria-hidden='true' />
        {homePanels.map((label, index) => <button
          className={active === index ? 'is-active' : ''}
          key={label}
          onClick={() => setActive(index)}
          onMouseEnter={() => moveIndicator(index, true)}
          ref={node => { buttonRefs.current[index] = node }}
          type='button'
        >{label}</button>)}
      </nav>
      <span className='home-window-hint'>滑动切换</span>
    </div>

    <div
      className='home-panel-viewport'
      onPointerDown={event => {
        setDragging(true)
        dragRef.current.startX = event.clientX
        dragRef.current.deltaX = 0
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }}
      onPointerMove={event => {
        if (!dragging) return
        const delta = event.clientX - dragRef.current.startX
        dragRef.current.deltaX = delta
        const resisted = Math.sign(delta) * Math.pow(Math.abs(delta), 0.92)
        setDragOffset(resisted)
        const tabs = tabsRef.current
        const currentButton = buttonRefs.current[active]
        if (tabs && currentButton) {
          const parent = tabs.getBoundingClientRect()
          const box = currentButton.getBoundingClientRect()
          const wiggle = Math.max(-34, Math.min(34, delta * 0.16))
          tabs.style.setProperty('--home-tab-x', `${box.left - parent.left + wiggle}px`)
          tabs.style.setProperty('--home-tab-w', `${box.width * (1 + Math.min(Math.abs(delta) / 640, .14))}px`)
        }
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div className='home-panel-track' style={trackStyle}>
        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-intro'>
              <span>Recent</span>
              <h1>最近</h1>
              <div className='home-action-row'>
                <Link href='/content'>内容库</Link>
                <Link href='/archive'>归档</Link>
                <Link href='/search'>搜索一句话</Link>
              </div>
            </section>
            <section className='home-screen-card'><div className='home-recent-list'>{recentContent.slice(0, 5).map(item => <RecentRow item={item} key={stableKey(item)} />)}</div></section>
          </div>
        </article>

        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-intro'><span>Paths</span><h1>路径</h1><div className='home-action-row'><Link href='/category'>栏目</Link><Link href='/tag'>标签</Link><Link href='/archive'>时间</Link></div></section>
            <section className='home-screen-card'><PathPlot categories={categories} /></section>
          </div>
        </article>

        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-intro'><span>Tools</span><h1>工具</h1><div className='home-action-row'><Link href='/tools'>工具页</Link><Link href='https://law-tech.dev/ocr/' rel='noreferrer'>OCR</Link><Link href='https://law-tech.dev/citation/' rel='noreferrer'>引注</Link></div></section>
            <section className='home-screen-card'><ToolGrid /></section>
          </div>
        </article>

        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-intro'><span>Desk</span><h1>工作台</h1><div className='home-action-row'><Link href='/desk'>进入工作台</Link><Link href='/desk/today'>Today</Link><Link href='/desk/writing'>Writing</Link></div></section>
            <section className='home-screen-card'><DeskGrid /></section>
          </div>
        </article>
      </div>
    </div>
  </section>
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {}, types = {} }) {
  const updates = recentContent.slice(0, 7)
  const randomHref = useMemo(() => updates[0] ? publicContentHref(updates[Math.floor(updates.length / 2) || 0]) : '/content', [updates])
  const articleCount = types.article || 0
  const courseCount = types['course-note'] || 0

  return <>
    <Head>
      <title>law-tech.dev</title>
      <meta name='description' content='法学笔记、写作与工具实验。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-macos-home home-macos-unified-v2'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell home-shell'>
        <PublicHeader active='content' />

        <section className='home-desktop-grid'>
          <HomePanelTabs recentContent={updates} categories={categories} />

          <aside className='home-widget-column' aria-label='首页侧栏'>
            <section className='home-widget home-widget-counts'>
              <span>Library</span>
              <div><strong>{contentCount}</strong><small>公开内容</small></div>
              <p>{articleCount} 篇文章 · {courseCount} 份课程笔记</p>
            </section>

            <section className='home-widget home-widget-recent'>
              <span>Recent</span>
              <RecentRotor items={updates} />
            </section>

            <section className='home-widget home-widget-desk'>
              <span>Desk</span>
              <h2>工作台</h2>
              <div className='home-widget-actions'>
                <Link href='/desk'>进入</Link>
                <Link href='/desk/today'>Today</Link>
              </div>
            </section>

            <footer className='home-signature'><DynamicSignature compact /></footer>
          </aside>
        </section>

        <nav className='home-thin-dock' aria-label='常用入口'>
          <Link href='/content' data-label='内容库'><LawTechIcon name='content' size={16} /><i /></Link>
          <Link href='/archive' data-label='归档'><LawTechIcon name='reading' size={16} /><i /></Link>
          <Link href='/tools' data-label='工具'><LawTechIcon name='spark' size={16} /><i /></Link>
          <Link href='/desk' data-label='工作台'><LawTechIcon name='today' size={16} /><i /></Link>
          <Link className='home-random-link' href={randomHref} data-label='随机一页'><LawTechIcon name='expand' size={16} /><i /></Link>
        </nav>
      </div>

      <style jsx global>{`
        .home-macos-unified-v2 {
          min-height:100vh;
          overflow:hidden;
          padding:0;
        }
        .home-macos-unified-v2 .home-shell {
          position:relative;
          display:grid;
          grid-template-rows:auto minmax(0,1fr) auto;
          gap:14px;
          width:min(1500px,calc(100vw - 32px));
          height:100vh;
          padding:14px 0 12px;
        }
        .home-desktop-grid {
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(248px,300px);
          gap:14px;
          min-height:0;
        }
        .home-app-window,
        .home-widget,
        .home-thin-dock {
          border:1px solid rgba(255,255,255,.7);
          background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.2));
          box-shadow:0 22px 70px rgba(24,63,50,.1),inset 0 1px 0 rgba(255,255,255,.74);
          backdrop-filter:blur(24px) saturate(1.12);
        }
        .home-app-window {
          min-width:0;
          min-height:0;
          overflow:hidden;
          border-radius:30px;
          padding:12px;
        }
        .home-window-top {
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          gap:12px;
          align-items:center;
          padding:4px 6px 12px;
        }
        .home-traffic { display:flex; gap:8px; }
        .home-traffic i { width:11px; height:11px; border-radius:50%; box-shadow:inset 0 1px 0 rgba(255,255,255,.34); }
        .home-traffic i:nth-child(1) { background:#ff6057; }
        .home-traffic i:nth-child(2) { background:#ffbd2f; }
        .home-traffic i:nth-child(3) { background:#28c840; }
        .home-panel-tabs {
          --home-tab-x: 0px;
          --home-tab-w: 86px;
          position:relative;
          display:flex;
          justify-self:center;
          gap:4px;
          width:max-content;
          max-width:100%;
          padding:5px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.58);
          border-radius:999px;
          background:rgba(255,255,255,.18);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.6);
        }
        .home-panel-indicator {
          position:absolute;
          top:5px;
          left:5px;
          width:var(--home-tab-w);
          height:36px;
          border-radius:999px;
          background:radial-gradient(circle at 38% 24%,rgba(255,255,255,.32),transparent 34%),linear-gradient(135deg,rgba(15,60,49,.95),rgba(45,89,138,.88));
          box-shadow:0 12px 28px rgba(17,61,49,.2),inset 0 1px 0 rgba(255,255,255,.28);
          transform:translateX(var(--home-tab-x));
          transition:transform .48s cubic-bezier(.2,1.32,.28,1),width .48s cubic-bezier(.2,1.32,.28,1),border-radius .48s cubic-bezier(.2,1.32,.28,1);
        }
        .home-panel-tabs button {
          position:relative;
          z-index:2;
          min-width:86px;
          height:36px;
          border:0;
          border-radius:999px;
          padding:0 14px;
          color:var(--muted);
          background:transparent;
          cursor:pointer;
          font-size:12px;
          font-weight:720;
        }
        .home-panel-tabs button.is-active { color:#fffcef; }
        .home-window-hint {
          border:1px solid rgba(255,255,255,.52);
          border-radius:999px;
          padding:7px 10px;
          color:var(--muted);
          background:rgba(255,255,255,.16);
          font-size:11px;
        }
        .home-panel-viewport {
          height:calc(100% - 60px);
          overflow:hidden;
          border-radius:24px;
          cursor:grab;
        }
        .home-panel-viewport:active { cursor:grabbing; }
        .home-panel-track { display:flex; height:100%; will-change:transform; }
        .home-panel-screen {
          flex:0 0 100%;
          min-width:0;
          padding:14px;
          border:1px solid rgba(255,255,255,.54);
          border-radius:24px;
          background:linear-gradient(135deg,rgba(255,255,255,.34),rgba(255,255,255,.14)),radial-gradient(circle at 88% 10%,rgba(227,239,244,.4),transparent 34%);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.62);
        }
        .home-panel-screen + .home-panel-screen { margin-left:12px; }
        .home-screen-grid {
          display:grid;
          grid-template-columns:minmax(250px,.86fr) minmax(0,1.14fr);
          gap:14px;
          height:100%;
          min-height:0;
        }
        .home-screen-card {
          min-height:0;
          overflow:auto;
          border:1px solid rgba(255,255,255,.56);
          border-radius:22px;
          padding:18px;
          background:rgba(255,252,244,.28);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.58);
        }
        .home-screen-intro span,
        .home-widget > span {
          color:var(--leaf);
          font-size:10px;
          font-weight:850;
          letter-spacing:.18em;
          text-transform:uppercase;
        }
        .home-screen-card h1 {
          margin:12px 0 0;
          font-family:var(--display-serif);
          font-size:clamp(46px,6vw,76px);
          font-weight:620;
          letter-spacing:-.075em;
          line-height:.98;
        }
        .home-action-row,
        .home-widget-actions {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:22px;
        }
        .home-action-row a,
        .home-widget-actions a {
          border:1px solid rgba(255,255,255,.62);
          border-radius:999px;
          padding:8px 12px;
          color:var(--green);
          background:rgba(255,255,255,.24);
          box-shadow:0 10px 24px rgba(24,63,50,.05),inset 0 1px 0 rgba(255,255,255,.58);
          font-size:12px;
        }
        .home-recent-list { display:grid; gap:10px; align-content:start; }
        .home-recent-row {
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          gap:12px;
          align-items:center;
          border:1px solid rgba(255,255,255,.56);
          border-radius:18px;
          padding:13px 14px;
          background:rgba(255,255,255,.24);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.54);
          transition:transform .24s var(--ease), border-radius .24s var(--ease);
        }
        .home-recent-row:hover { transform:translateY(-2px); border-radius:15px; }
        .home-recent-row time,
        .home-recent-row small { color:var(--quiet); font-size:11px; white-space:nowrap; }
        .home-recent-row strong { display:block; overflow:hidden; font-family:var(--display-serif); font-size:19px; font-weight:610; text-overflow:ellipsis; white-space:nowrap; }
        .home-recent-row b { color:var(--green); }
        .home-path-plot { position:relative; height:100%; min-height:320px; }
        .home-orbit { position:absolute; inset:10% 8% 8%; border:1px dashed rgba(21,26,23,.12); border-radius:47% 53% 52% 48%; transform:rotate(-8deg); }
        .home-path-folder { position:absolute; border:1px solid rgba(255,255,255,.62); border-radius:20px; padding:13px 16px; color:var(--leaf); background:rgba(255,255,255,.26); box-shadow:0 14px 30px rgba(24,63,50,.06),inset 0 1px 0 rgba(255,255,255,.58); backdrop-filter:blur(14px); transition:transform .32s cubic-bezier(.2,1.32,.28,1),border-radius .32s cubic-bezier(.2,1.32,.28,1); }
        .home-path-folder:hover { transform:translateY(-6px) scale(1.03,.98); border-radius:16px; }
        .home-path-folder strong { display:block; font-family:var(--display-serif); font-size:24px; font-weight:610; }
        .home-path-folder span { display:block; margin-top:5px; color:var(--muted); font-size:11px; }
        .folder-1 { left:4%; top:10%; }
        .folder-2 { right:8%; top:18%; }
        .folder-3 { left:18%; bottom:18%; }
        .folder-4 { right:16%; bottom:6%; }
        .home-tool-grid,
        .home-desk-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .home-tool-tile,
        .home-desk-app { border:1px solid rgba(255,255,255,.56); border-radius:20px; padding:14px; background:rgba(255,255,255,.24); box-shadow:inset 0 1px 0 rgba(255,255,255,.56); }
        .home-tool-tile strong,
        .home-desk-app strong { display:block; font-family:var(--display-serif); font-size:22px; font-weight:610; }
        .home-tool-tile span,
        .home-desk-app span { display:block; margin-top:8px; color:var(--muted); font-size:12px; line-height:1.6; }
        .home-desk-app i { display:grid; place-items:center; width:40px; height:40px; border:1px solid rgba(255,255,255,.66); border-radius:14px; margin-bottom:12px; color:var(--leaf); background:rgba(255,255,255,.26); }
        .home-widget-column { display:grid; grid-template-rows:auto minmax(0,1fr) auto auto; gap:14px; min-height:0; }
        .home-widget { overflow:hidden; border-radius:28px; padding:16px; }
        .home-widget-counts strong { display:block; margin-top:10px; font-family:var(--display-serif); color:var(--leaf); font-size:60px; line-height:.88; letter-spacing:-.08em; }
        .home-widget-counts small { color:var(--muted); }
        .home-widget-counts p { margin:10px 0 0; color:var(--muted); font-size:12px; line-height:1.7; }
        .home-widget-recent { min-height:0; }
        .home-widget-rotor { display:grid; gap:10px; max-height:100%; margin-top:12px; overflow-y:auto; scroll-snap-type:y proximity; padding-right:2px; }
        .home-rotor-card { display:grid; grid-template-columns:74px minmax(0,1fr); gap:10px; align-items:center; scroll-snap-align:start; border:1px solid rgba(255,255,255,.56); border-radius:18px; padding:9px; background:rgba(255,255,255,.24); box-shadow:inset 0 1px 0 rgba(255,255,255,.56); }
        .home-rotor-cover { display:grid; place-items:end start; width:74px; height:58px; border-radius:14px; padding:8px; color:#fffaf0; background:linear-gradient(145deg,#245044,#315a8c); background-size:cover; background-position:center; }
        .home-rotor-cover span { font-size:9px; }
        .home-rotor-card small,
        .home-rotor-card span { display:block; color:var(--muted); font-size:10px; }
        .home-rotor-card strong { display:block; overflow:hidden; margin:4px 0; font-family:var(--display-serif); font-size:17px; font-weight:610; text-overflow:ellipsis; white-space:nowrap; }
        .home-widget-desk h2 { margin:12px 0 0; font-family:var(--display-serif); font-size:32px; font-weight:620; letter-spacing:-.05em; }
        .home-signature { display:flex; justify-content:flex-end; min-height:78px; padding:0 8px; color:rgba(25,59,49,.72); }
        .home-signature :global(svg) { width:min(220px,100%); }
        .home-thin-dock { justify-self:center; display:flex; align-items:flex-end; gap:8px; width:max-content; max-width:100%; border-radius:22px; padding:8px 10px 10px; }
        .home-thin-dock a { position:relative; display:grid; place-items:center; width:42px; height:42px; border:1px solid rgba(255,255,255,.68); border-radius:14px; color:var(--leaf); background:linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.14)); box-shadow:0 10px 22px rgba(24,63,50,.08),inset 0 1px 0 rgba(255,255,255,.7); transition:transform .14s ease,border-radius .14s ease; }
        .home-thin-dock a:hover { transform:translateY(-5px) scale(1.16); border-radius:17px; }
        .home-thin-dock a::after { content:attr(data-label); position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); opacity:0; pointer-events:none; white-space:nowrap; border:1px solid rgba(255,255,255,.68); border-radius:999px; padding:5px 8px; color:var(--ink); background:rgba(255,255,255,.38); box-shadow:0 8px 20px rgba(24,63,50,.06); backdrop-filter:blur(14px); font-size:11px; transition:opacity .14s ease,transform .14s ease; }
        .home-thin-dock a:hover::after { opacity:1; transform:translateX(-50%) translateY(-2px); }
        .home-thin-dock i { position:absolute; bottom:-8px; width:4px; height:4px; border-radius:50%; background:var(--leaf); opacity:.25; }
        @media (max-width:1120px) {
          .home-macos-unified-v2 { overflow:auto; }
          .home-macos-unified-v2 .home-shell { height:auto; min-height:100vh; }
          .home-desktop-grid { grid-template-columns:1fr; }
          .home-widget-column { grid-template-columns:repeat(3,minmax(0,1fr)); grid-template-rows:auto; }
          .home-signature { grid-column:1 / -1; }
        }
        @media (max-width:760px) {
          .home-screen-grid,
          .home-tool-grid,
          .home-desk-grid,
          .home-widget-column { grid-template-columns:1fr; }
          .home-window-top { grid-template-columns:auto 1fr; }
          .home-window-hint { display:none; }
          .home-panel-tabs { justify-self:end; overflow-x:auto; }
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
