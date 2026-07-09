import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

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
import { publicHomeDailyLines, publicHomeQuickLinks } from '@/lib/domain/publicHome'

const categoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

const panelGap = 12

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

function latestKey(item) {
  return item.id || `${item.source || 'content'}:${item.slug || item.title}`
}

function RecentLine({ item, compact = false }) {
  const category = publicContentCategory(item)
  return <Link className={`mac-recent-line ${compact ? 'is-compact' : ''}`} href={publicContentHref(item)}>
    <time>{formatDate(publicContentDate(item))}</time>
    <span>
      <strong>{item.title || '未命名内容'}</strong>
      <small>{[publicContentTypeLabel(item.type), category].filter(Boolean).join(' · ')}</small>
    </span>
    {!compact ? <b>↗</b> : null}
  </Link>
}

function MacDesktopIcon({ href, icon, label, meta }) {
  return <Link className='mac-desktop-icon' href={href}>
    <span><LawTechIcon name={icon} size={18} /></span>
    <strong>{label}</strong>
    <small>{meta}</small>
  </Link>
}

function HomePanelDeck({ updates = [], categories = {}, quickLinks = [] }) {
  const tabs = ['最近', '路径', '工具', '工作台']
  const viewportRef = useRef(null)
  const tabRefs = useRef([])
  const dragRef = useRef(null)
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(null)
  const [indicator, setIndicator] = useState({ left: 5, width: 86 })

  const activeIndicator = hover ?? active

  useEffect(() => {
    const button = tabRefs.current[activeIndicator]
    const parent = button?.parentElement
    if (!button || !parent) return
    const buttonBox = button.getBoundingClientRect()
    const parentBox = parent.getBoundingClientRect()
    setIndicator({
      left: buttonBox.left - parentBox.left,
      width: buttonBox.width
    })
  }, [activeIndicator])

  function scrollToPanel(index) {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTo({
      left: index * (viewport.clientWidth + panelGap),
      behavior: 'smooth'
    })
  }

  function selectPanel(index) {
    setActive(index)
    scrollToPanel(index)
  }

  function handleScroll() {
    const viewport = viewportRef.current
    if (!viewport) return
    const next = Math.round(viewport.scrollLeft / (viewport.clientWidth + panelGap))
    if (next !== active && next >= 0 && next < tabs.length) setActive(next)
  }

  function handlePointerDown(event) {
    const viewport = viewportRef.current
    if (!viewport) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: viewport.scrollLeft
    }
    viewport.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    const viewport = viewportRef.current
    const drag = dragRef.current
    if (!viewport || !drag) return
    viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX)
  }

  function handlePointerUp() {
    const viewport = viewportRef.current
    const drag = dragRef.current
    if (!viewport || !drag) return
    dragRef.current = null
    const next = Math.round(viewport.scrollLeft / (viewport.clientWidth + panelGap))
    selectPanel(Math.max(0, Math.min(tabs.length - 1, next)))
  }

  const dockLinks = quickLinks.filter(item => item.href !== '/search').slice(0, 5)

  return <section className='mac-main-window' aria-label='首页主工作区'>
    <header className='mac-window-top'>
      <div className='mac-traffic' aria-hidden='true'><i /><i /><i /></div>
      <nav className='home-panel-tabs' aria-label='首页内容切换'>
        <span
          className='home-panel-indicator'
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          aria-hidden='true'
        />
        {tabs.map((tab, index) => <button
          aria-pressed={active === index}
          className={active === index ? 'active' : ''}
          data-home-panel-tab=''
          key={tab}
          onClick={() => selectPanel(index)}
          onMouseEnter={() => setHover(index)}
          onMouseLeave={() => setHover(null)}
          ref={element => { tabRefs.current[index] = element }}
          type='button'
        >
          {tab}
        </button>)}
      </nav>
      <span className='mac-window-hint'>左右拖动切换</span>
    </header>

    <div className='home-panel-viewport'
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onScroll={handleScroll}
      ref={viewportRef}
    >
      <div className='home-panel-track'>
        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-copy'>
              <span>Recent</span>
              <h2>最近翻开的纸页。</h2>
              <div className='home-action-row'>
                <Link href='/content'>内容库</Link>
                <Link href='/archive'>归档</Link>
                <Link href='/search'>搜索一句话</Link>
              </div>
            </section>
            <section className='home-screen-card'>
              <div className='home-recent-list'>
                {updates.map(item => <RecentLine item={item} key={latestKey(item)} />)}
                {!updates.length ? <p className='home-empty'>还没有公开内容。</p> : null}
              </div>
            </section>
          </div>
        </article>

        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-copy'>
              <span>Paths</span>
              <h2>几条反复进入的路。</h2>
              <div className='home-action-row'>
                <Link href='/category'>全部栏目</Link>
                <Link href='/tag'>标签</Link>
              </div>
            </section>
            <section className='home-screen-card'>
              <div className='home-path-map'>
                <i aria-hidden='true' />
                {categoryOrder.map((category, index) => <Link
                  className={`home-folder folder-${index + 1}`}
                  href={`/category/${encodeURIComponent(category)}`}
                  key={category}
                >
                  <strong>{category}</strong>
                  <small>{categories[category] || 0} 条内容</small>
                </Link>)}
              </div>
            </section>
          </div>
        </article>

        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-copy'>
              <span>Tools</span>
              <h2>把麻烦事收进抽屉。</h2>
              <div className='home-action-row'>
                <Link href='/tools'>打开工具页</Link>
                <Link href='https://law-tech.dev/ocr/'>OCR</Link>
                <Link href='https://law-tech.dev/citation/'>引注</Link>
              </div>
            </section>
            <section className='home-screen-card'>
              <div className='home-tool-grid'>
                <Link href='https://law-tech.dev/ocr/'><strong>OCR</strong><span>图片与 PDF 识别整理</span></Link>
                <Link href='https://law-tech.dev/citation/'><strong>引注</strong><span>脚注与参考文献辅助</span></Link>
                <Link href='/search'><strong>搜索</strong><span>内容、课程与标签入口</span></Link>
                <Link href='/desk/writing'><strong>写作</strong><span>草稿、材料与发布流程</span></Link>
              </div>
            </section>
          </div>
        </article>

        <article className='home-panel-screen'>
          <div className='home-screen-grid'>
            <section className='home-screen-card home-screen-copy'>
              <span>Desk</span>
              <h2>继续整理今天的案头。</h2>
              <div className='home-action-row'>
                <Link href='/desk'>进入工作台</Link>
                <Link href='/desk/today'>Today</Link>
                <Link href='/desk/writing'>Writing</Link>
              </div>
            </section>
            <section className='home-screen-card'>
              <div className='home-desk-grid'>
                <MacDesktopIcon href='/desk/today' icon='today' label='Today' meta='今日与待办' />
                <MacDesktopIcon href='/desk/writing' icon='writing' label='Writing' meta='草稿与发布' />
                <MacDesktopIcon href='/desk/courses' icon='courses' label='Courses' meta='课程整理' />
                <MacDesktopIcon href='/desk/agent' icon='spark' label='Agent' meta='命令入口' />
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>

    <nav className='home-mac-dock' aria-label='常用入口'>
      {dockLinks.map(item => <Link
        className='home-mac-dock-item'
        data-label={item.label}
        href={item.href}
        key={item.label}
        rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
      >
        <LawTechIcon name={item.icon} size={17} />
      </Link>)}
    </nav>
  </section>
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {}, types = {} }) {
  const updates = recentContent.slice(0, 5)
  const signatureLine = publicHomeDailyLines[contentCount % publicHomeDailyLines.length]
  const quickLinks = publicHomeQuickLinks

  return <>
    <Head>
      <title>law-tech.dev</title>
      <meta name='description' content='法学笔记、写作与工具实验。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-home mac-home-v3'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='content' />

        <section className='mac-home-workspace' aria-label='law-tech.dev 首页'>
          <HomePanelDeck updates={updates} categories={categories} quickLinks={quickLinks} />

          <aside className='mac-home-widgets' aria-label='首页状态'>
            <section className='mac-widget'>
              <span>Today</span>
              <strong>{contentCount}</strong>
              <p>条公开内容，最近内容会随索引自动更新。</p>
            </section>

            <section className='mac-widget'>
              <span>Recent</span>
              <div className='mac-widget-list'>
                {updates.slice(0, 3).map(item => <RecentLine compact item={item} key={latestKey(item)} />)}
                {!updates.length ? <p className='home-empty'>暂无公开内容。</p> : null}
              </div>
            </section>

            <section className='mac-widget mac-signature-widget'>
              <span>Signature</span>
              <DynamicSignature compact />
              <p>{signatureLine.text}</p>
            </section>

            <section className='mac-widget mac-widget-compact'>
              <span>Desk</span>
              <h2>工作台随时继续。</h2>
              <div>
                <Link href='/desk'>进入工作台</Link>
                <Link href='/desk/today'>Today</Link>
              </div>
            </section>
          </aside>
        </section>
      </div>

      <style jsx global>{`
        .mac-home-v3 {
          min-height:100svh;
          padding-bottom:76px;
        }
        .mac-home-v3 .public-shell {
          width:min(1480px,calc(100vw - 36px));
        }
        .mac-home-workspace {
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(248px,286px);
          gap:16px;
          min-height:calc(100svh - 154px);
          margin-top:16px;
        }
        .mac-main-window,
        .mac-widget,
        .home-panel-screen,
        .home-screen-card,
        .home-mac-dock {
          border:1px solid rgba(255,255,255,.68);
          background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.2));
          box-shadow:0 20px 58px rgba(24,63,50,.08),inset 0 1px 0 rgba(255,255,255,.74);
          backdrop-filter:blur(22px) saturate(1.12);
        }
        .mac-main-window {
          position:relative;
          display:grid;
          grid-template-rows:auto minmax(0,1fr);
          min-width:0;
          overflow:hidden;
          border-radius:30px;
        }
        .mac-main-window::before {
          position:absolute;
          inset:-20%;
          background:linear-gradient(118deg,transparent 41%,rgba(255,255,255,.16),transparent 58%);
          content:'';
          pointer-events:none;
          transform:rotate(8deg);
        }
        .mac-window-top {
          position:relative;
          z-index:2;
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          align-items:center;
          gap:12px;
          padding:16px 18px 12px;
        }
        .mac-traffic {
          display:flex;
          gap:8px;
        }
        .mac-traffic i {
          width:11px;
          height:11px;
          border-radius:50%;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.34);
        }
        .mac-traffic i:nth-child(1) { background:#ff6057; }
        .mac-traffic i:nth-child(2) { background:#ffbd2f; }
        .mac-traffic i:nth-child(3) { background:#28c840; }
        .home-panel-tabs {
          position:relative;
          display:flex;
          gap:4px;
          width:max-content;
          max-width:100%;
          margin:0 auto;
          padding:5px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.58);
          border-radius:999px;
          background:rgba(255,255,255,.18);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.62);
        }
        .home-panel-indicator {
          position:absolute;
          top:5px;
          left:0;
          height:36px;
          border-radius:999px;
          background:radial-gradient(circle at 38% 24%,rgba(255,255,255,.34),transparent 34%),linear-gradient(135deg,rgba(24,63,50,.96),rgba(45,89,138,.88));
          box-shadow:0 12px 28px rgba(24,63,50,.2),inset 0 1px 0 rgba(255,255,255,.28);
          transition:transform .46s cubic-bezier(.2,1.32,.28,1),width .46s cubic-bezier(.2,1.32,.28,1);
        }
        .home-panel-tabs button {
          position:relative;
          z-index:1;
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
        .home-panel-tabs button.active,
        .home-panel-tabs button[aria-pressed='true'] {
          color:#fffcef;
        }
        .mac-window-hint {
          justify-self:end;
          border:1px solid rgba(255,255,255,.54);
          border-radius:999px;
          padding:7px 10px;
          color:var(--muted);
          background:rgba(255,255,255,.18);
          font-size:11px;
        }
        .home-panel-viewport {
          position:relative;
          z-index:2;
          min-height:0;
          margin:0 14px 14px;
          overflow-x:auto;
          overflow-y:hidden;
          border-radius:24px;
          cursor:grab;
          scroll-behavior:smooth;
          scroll-snap-type:x mandatory;
          scrollbar-width:none;
        }
        .home-panel-viewport:active { cursor:grabbing; }
        .home-panel-viewport::-webkit-scrollbar { display:none; }
        .home-panel-track {
          display:grid;
          grid-auto-columns:100%;
          grid-auto-flow:column;
          gap:12px;
          height:100%;
        }
        .home-panel-screen {
          min-width:0;
          padding:14px;
          border-radius:24px;
          scroll-snap-align:start;
        }
        .home-screen-grid {
          display:grid;
          grid-template-columns:minmax(252px,.78fr) minmax(0,1.22fr);
          gap:14px;
          height:100%;
          min-height:0;
        }
        .home-screen-card {
          min-height:0;
          overflow:auto;
          border-radius:22px;
          padding:18px;
          background:rgba(255,252,244,.3);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.58);
        }
        .home-screen-copy {
          display:grid;
          align-content:start;
        }
        .home-screen-card > span,
        .mac-widget > span {
          color:var(--leaf);
          font-size:10px;
          font-weight:850;
          letter-spacing:.18em;
          text-transform:uppercase;
        }
        .home-screen-card h2 {
          margin:12px 0 0;
          font-family:var(--display-serif);
          font-size:clamp(36px,4vw,56px);
          font-weight:620;
          line-height:1.06;
          letter-spacing:-.065em;
        }
        .home-action-row {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:24px;
        }
        .home-action-row a,
        .mac-widget-compact a {
          border:1px solid rgba(255,255,255,.62);
          border-radius:999px;
          padding:9px 13px;
          color:var(--leaf);
          background:rgba(255,255,255,.28);
          box-shadow:0 10px 24px rgba(24,63,50,.045),inset 0 1px 0 rgba(255,255,255,.62);
          font-size:12px;
        }
        .home-recent-list,
        .mac-widget-list {
          display:grid;
          gap:10px;
        }
        .mac-recent-line {
          display:grid;
          grid-template-columns:54px minmax(0,1fr) auto;
          align-items:center;
          gap:12px;
          border:1px solid rgba(255,255,255,.56);
          border-radius:18px;
          padding:12px 14px;
          background:rgba(255,255,255,.25);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.56);
          transition:transform .22s var(--ease),background .22s var(--ease);
        }
        .mac-recent-line:hover {
          transform:translateY(-2px);
          background:rgba(255,255,255,.42);
        }
        .mac-recent-line time,
        .mac-recent-line small {
          color:var(--quiet);
          font-size:10px;
          white-space:nowrap;
        }
        .mac-recent-line span {
          display:grid;
          min-width:0;
          gap:3px;
        }
        .mac-recent-line strong {
          overflow:hidden;
          font-family:var(--display-serif);
          font-size:19px;
          font-weight:610;
          line-height:1.25;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .mac-recent-line b {
          color:var(--leaf);
          font-weight:500;
        }
        .mac-recent-line.is-compact {
          grid-template-columns:minmax(0,1fr);
          gap:2px;
          padding:0;
          border:0;
          background:transparent;
          box-shadow:none;
        }
        .mac-recent-line.is-compact time { display:none; }
        .mac-recent-line.is-compact strong {
          font-family:var(--sans-serif);
          font-size:12px;
          font-weight:650;
        }
        .home-path-map {
          position:relative;
          min-height:320px;
          height:100%;
        }
        .home-path-map > i {
          position:absolute;
          inset:10% 7% 7%;
          border:1px dashed rgba(23,35,29,.12);
          border-radius:47% 53% 52% 48%;
          transform:rotate(-8deg);
        }
        .home-folder {
          position:absolute;
          display:grid;
          gap:4px;
          min-width:140px;
          border:1px solid rgba(255,255,255,.62);
          border-radius:20px;
          padding:13px 16px;
          background:rgba(255,255,255,.28);
          box-shadow:0 14px 30px rgba(24,63,50,.055),inset 0 1px 0 rgba(255,255,255,.58);
          transition:transform .28s var(--ease),border-radius .28s var(--ease);
        }
        .home-folder:hover {
          transform:translateY(-6px) scale(1.03,.98);
          border-radius:16px;
        }
        .home-folder strong {
          font-family:var(--display-serif);
          font-size:23px;
          font-weight:610;
        }
        .home-folder small {
          color:var(--muted);
          font-size:11px;
        }
        .folder-1 { top:9%; left:4%; }
        .folder-2 { top:18%; right:8%; }
        .folder-3 { bottom:19%; left:17%; }
        .folder-4 { right:13%; bottom:6%; }
        .home-tool-grid,
        .home-desk-grid {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        }
        .home-tool-grid a,
        .mac-desktop-icon {
          border:1px solid rgba(255,255,255,.56);
          border-radius:20px;
          padding:14px;
          background:rgba(255,255,255,.25);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.56);
          transition:transform .22s var(--ease),background .22s var(--ease);
        }
        .home-tool-grid a:hover,
        .mac-desktop-icon:hover {
          transform:translateY(-4px);
          background:rgba(255,255,255,.4);
        }
        .home-tool-grid strong,
        .mac-desktop-icon strong {
          display:block;
          font-family:var(--display-serif);
          font-size:22px;
          font-weight:610;
        }
        .home-tool-grid span,
        .mac-desktop-icon small {
          display:block;
          margin-top:7px;
          color:var(--muted);
          font-size:12px;
          line-height:1.6;
        }
        .mac-desktop-icon span {
          display:grid;
          place-items:center;
          width:42px;
          height:42px;
          margin-bottom:9px;
          border:1px solid rgba(255,255,255,.66);
          border-radius:14px;
          color:var(--leaf);
          background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,.14));
          box-shadow:0 10px 24px rgba(24,63,50,.055),inset 0 1px 0 rgba(255,255,255,.64);
        }
        .mac-home-widgets {
          display:grid;
          gap:14px;
          align-content:start;
          min-width:0;
        }
        .mac-widget {
          overflow:hidden;
          border-radius:28px;
          padding:16px;
        }
        .mac-widget strong {
          display:block;
          margin-top:10px;
          color:var(--leaf);
          font-family:var(--display-serif);
          font-size:64px;
          font-weight:560;
          line-height:.86;
          letter-spacing:-.08em;
        }
        .mac-widget h2 {
          margin:10px 0 0;
          font-family:var(--display-serif);
          font-size:28px;
          font-weight:610;
          line-height:1.06;
          letter-spacing:-.05em;
        }
        .mac-widget p {
          margin:10px 0 0;
          color:var(--muted);
          font-size:13px;
          line-height:1.68;
        }
        .mac-signature-widget {
          display:grid;
          gap:10px;
          min-height:190px;
        }
        .mac-signature-widget :global(svg) {
          width:100%;
          color:rgba(25,59,49,.76);
        }
        .mac-widget-compact div {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:14px;
        }
        .home-mac-dock {
          position:absolute;
          left:50%;
          bottom:14px;
          z-index:5;
          display:flex;
          align-items:flex-end;
          gap:8px;
          width:max-content;
          max-width:calc(100% - 36px);
          border-radius:22px;
          padding:8px 10px 10px;
          transform:translateX(-50%);
        }
        .home-mac-dock-item {
          position:relative;
          display:grid;
          place-items:center;
          width:42px;
          height:42px;
          border:1px solid rgba(255,255,255,.68);
          border-radius:14px;
          color:var(--leaf);
          background:radial-gradient(circle at 34% 22%,rgba(255,255,255,.42),transparent 35%),linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.14));
          box-shadow:0 10px 22px rgba(24,63,50,.07),inset 0 1px 0 rgba(255,255,255,.7);
          transition:transform .16s ease,border-radius .16s ease;
        }
        .home-mac-dock-item:hover {
          border-radius:17px;
          transform:translateY(-5px) scale(1.16);
        }
        .home-mac-dock-item::after {
          position:absolute;
          bottom:calc(100% + 8px);
          left:50%;
          transform:translateX(-50%);
          opacity:0;
          border:1px solid rgba(255,255,255,.68);
          border-radius:999px;
          padding:5px 8px;
          color:var(--ink);
          background:rgba(255,255,255,.42);
          box-shadow:0 8px 20px rgba(24,63,50,.055);
          content:attr(data-label);
          font-size:11px;
          pointer-events:none;
          transition:opacity .14s ease,transform .14s ease;
          white-space:nowrap;
        }
        .home-mac-dock-item:hover::after {
          opacity:1;
          transform:translateX(-50%) translateY(-2px);
        }
        .home-empty {
          margin:0;
          color:var(--quiet);
          font-size:12px;
        }
        @media (max-width:1120px) {
          .mac-home-workspace {
            grid-template-columns:1fr;
            min-height:auto;
          }
          .mac-main-window {
            min-height:680px;
          }
          .mac-home-widgets {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }
        @media (max-width:760px) {
          .mac-home-v3 .public-shell {
            width:min(100% - 24px,1480px);
          }
          .mac-window-top,
          .home-screen-grid,
          .home-tool-grid,
          .home-desk-grid,
          .mac-home-widgets {
            grid-template-columns:1fr;
          }
          .mac-window-hint {
            display:none;
          }
          .home-panel-tabs {
            justify-self:start;
            overflow-x:auto;
          }
          .mac-main-window {
            min-height:760px;
          }
          .home-mac-dock {
            position:sticky;
            bottom:12px;
            margin:12px auto 0;
            transform:none;
          }
        }
        @media (prefers-reduced-motion:reduce) {
          .home-panel-viewport {
            scroll-behavior:auto;
          }
          .home-panel-indicator,
          .home-folder,
          .home-mac-dock-item,
          .mac-recent-line,
          .home-tool-grid a,
          .mac-desktop-icon {
            transition-duration:.01ms!important;
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
