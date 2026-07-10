
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

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

const viewTabs = [
  { key: 'recent', label: '最近' },
  { key: 'paths', label: '路径' },
  { key: 'tools', label: '工具' },
  { key: 'desk', label: '工作台' }
]

const pathNodes = [
  { label: '遇事不决', href: '/category/遇事不决', note: '案例、判断与临时问题' },
  { label: '法与算法', href: '/category/法与算法', note: '技术、工具与法律信息' },
  { label: '法律之上', href: '/category/法律之上', note: '论文、课程与规范分析' },
  { label: '秘密花园', href: '/category/秘密花园', note: '私人化写作与碎片' }
]

const toolNodes = [
  { label: 'OCR', href: 'https://law-tech.dev/ocr/', icon: 'materials', note: '图片与扫描件' },
  { label: '引注', href: 'https://law-tech.dev/citation/', icon: 'writing', note: '论文与脚注' },
  { label: '搜索', href: '/search', icon: 'search', note: '站内内容索引' },
  { label: '全部工具', href: '/tools', icon: 'tools', note: '工具启动器' }
]

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
  if (!value) return '未标注'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未标注'
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date)
}

function itemKey(item, fallback) {
  return item?.id || `${item?.source || 'content'}:${item?.slug || fallback}`
}

function shortTitle(item) {
  return item?.title || '未命名内容'
}

function LatestCanvas({ items }) {
  const [first, ...rest] = items
  const notes = rest.slice(0, 4)

  return <section className='desktop-canvas-view latest-canvas' aria-label='最近更新'>
    <div className='canvas-map-line' aria-hidden='true' />
    {first ? <Link className='canvas-primary-paper' href={publicContentHref(first)}>
      <span>{formatDate(publicContentDate(first))}</span>
      <strong>{shortTitle(first)}</strong>
      <small>{publicContentTypeLabel(first.type)} · {publicContentCategory(first)}</small>
    </Link> : <div className='canvas-primary-paper is-empty'>还没有公开内容。</div>}

    <div className='canvas-note-stack'>
      {notes.map((item, index) => <Link className={`canvas-note note-${index + 1}`} href={publicContentHref(item)} key={itemKey(item, index)}>
        <time>{formatDate(publicContentDate(item))}</time>
        <strong>{shortTitle(item)}</strong>
        <small>{publicContentCategory(item)}</small>
      </Link>)}
    </div>

    <div className='canvas-mini-strip'>
      <Link href='/content'>内容库</Link>
      <Link href='/archive'>时间归档</Link>
      <Link href='/search'>检索</Link>
    </div>
  </section>
}

function PathsCanvas({ categories }) {
  return <section className='desktop-canvas-view paths-canvas' aria-label='内容路径'>
    <div className='path-orbit' aria-hidden='true' />
    {pathNodes.map((node, index) => <Link className={`path-card path-${index + 1}`} href={node.href} key={node.label}>
      <span>0{index + 1}</span>
      <strong>{node.label}</strong>
      <small>{categories[node.label] || 0} 条 · {node.note}</small>
    </Link>)}
  </section>
}

function ToolsCanvas() {
  return <section className='desktop-canvas-view tools-canvas' aria-label='工具入口'>
    <div className='tool-compass' aria-hidden='true' />
    {toolNodes.map((tool, index) => <Link className={`tool-launch tool-${index + 1}`} href={tool.href} key={tool.label} rel={tool.href.startsWith('http') ? 'noreferrer' : undefined}>
      <LawTechIcon name={tool.icon} size={19} />
      <span><strong>{tool.label}</strong><small>{tool.note}</small></span>
    </Link>)}
  </section>
}

function DeskCanvas() {
  return <section className='desktop-canvas-view desk-canvas' aria-label='工作台入口'>
    <Link className='desk-window-preview' href='/desk/today'>
      <span>Workspace</span>
      <strong>工作台</strong>
      <small>今日、写作、课程与资料入口。</small>
    </Link>
    <div className='desk-shortcuts'>
      <Link href='/desk/today'>Today</Link>
      <Link href='/desk/writing'>Writing</Link>
      <Link href='/desk/courses'>Courses</Link>
      <Link href='/desk/system'>System</Link>
    </div>
  </section>
}

function SingleColumnUpdates({ items }) {
  const slides = items.slice(0, 6)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = window.setInterval(() => setIndex(current => (current + 1) % slides.length), 5200)
    return () => window.clearInterval(timer)
  }, [slides.length])

  if (!slides.length) return <div className='single-column-updates empty'>暂无公开内容</div>

  function move(delta) {
    setIndex(current => (current + delta + slides.length) % slides.length)
  }

  return <div className='single-column-updates'>
    <div className='update-carousel-window'>
      <div className='update-carousel-track' style={{ transform: `translateY(${-index * 100}%)` }}>
        {slides.map((item, slideIndex) => <Link className='update-slide-card' href={publicContentHref(item)} key={itemKey(item, slideIndex)}>
          <span>{formatDate(publicContentDate(item))}</span>
          <strong>{shortTitle(item)}</strong>
          <small>{publicContentTypeLabel(item.type)} · {publicContentCategory(item)}</small>
        </Link>)}
      </div>
    </div>
    <div className='update-carousel-controls'>
      <button type='button' onClick={() => move(-1)} aria-label='上一条'>↑</button>
      <div aria-hidden='true'>{slides.map((item, dot) => <i className={dot === index ? 'active' : ''} key={itemKey(item, dot)} />)}</div>
      <button type='button' onClick={() => move(1)} aria-label='下一条'>↓</button>
    </div>
  </div>
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {}, types = {} }) {
  const [activeView, setActiveView] = useState('recent')
  const updates = recentContent.slice(0, 8)
  const randomItems = useMemo(() => updates.map(item => publicContentHref(item)), [updates])

  return <>
    <Head>
      <title>law-tech.dev</title>
      <meta name='description' content='法学笔记、写作与工具实验。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page home-desktop-round3'>
      <div className='home-stage-glow glow-a' aria-hidden='true' />
      <div className='home-stage-glow glow-b' aria-hidden='true' />
      <PublicHeader active='content' randomItems={randomItems} />

      <div className='desktop-grid-shell'>
        <section className='desktop-main-window' aria-label='首页桌面窗口'>
          <header className='desktop-window-bar'>
            <div className='traffic-lights' aria-hidden='true'><i /><i /><i /></div>
            <nav className='desktop-view-switcher' aria-label='首页视图'>
              {viewTabs.map(tab => <button type='button' className={activeView === tab.key ? 'active' : ''} onClick={() => setActiveView(tab.key)} key={tab.key}>{tab.label}</button>)}
            </nav>
          </header>
          <div className='desktop-canvas-stage'>
            {activeView === 'recent' ? <LatestCanvas items={updates} /> : null}
            {activeView === 'paths' ? <PathsCanvas categories={categories} /> : null}
            {activeView === 'tools' ? <ToolsCanvas /> : null}
            {activeView === 'desk' ? <DeskCanvas /> : null}
          </div>
        </section>

        <aside className='desktop-widget-rail' aria-label='首页小组件'>
          <section className='desktop-widget desktop-stat-widget'>
            <span>Library</span>
            <strong>{contentCount}</strong>
            <small>{Object.keys(categories).length} 个栏目 · {types.article || 0} 篇文章</small>
          </section>

          <section className='desktop-widget desktop-update-widget'>
            <header><span>Recent</span><Link href='/content'>全部</Link></header>
            <SingleColumnUpdates items={updates} />
          </section>

          <section className='desktop-widget desktop-desk-widget'>
            <span>Desk</span>
            <strong>工作台</strong>
            <div><Link href='/desk/today'>进入</Link><Link href='/desk/system'>系统</Link></div>
          </section>

          <div className='desktop-signature-widget'><DynamicSignature compact /></div>
        </aside>
      </div>
    </main>

    <style jsx global>{`
      .home-desktop-round3 {
        position: relative;
        height: 100dvh;
        min-height: 760px;
        overflow: hidden;
        padding: 78px 22px 82px;
        background:
          radial-gradient(circle at 10% 14%, rgba(246,229,188,.52), transparent 28%),
          radial-gradient(circle at 88% 12%, rgba(210,231,235,.66), transparent 32%),
          linear-gradient(135deg, #f4efe2 0%, #edf4ef 48%, #d8e8e8 100%);
      }
      .home-desktop-round3 .system-menu-bar {
        max-width: calc(100vw - 32px);
      }
      .home-stage-glow {
        position: fixed;
        pointer-events: none;
        border-radius: 999px;
        filter: blur(2px);
        opacity: .72;
      }
      .home-stage-glow.glow-a {
        left: -120px;
        top: 12%;
        width: 360px;
        height: 360px;
        background: radial-gradient(circle, rgba(250,232,188,.58), transparent 66%);
      }
      .home-stage-glow.glow-b {
        right: -120px;
        bottom: 8%;
        width: 420px;
        height: 420px;
        background: radial-gradient(circle, rgba(184,215,223,.58), transparent 68%);
      }
      .home-desktop-round3 .desktop-grid-shell {
        position: relative;
        z-index: 2;
        width: min(1360px, 100%);
        height: 100%;
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) clamp(280px, 23vw, 340px);
        gap: 18px;
        align-items: stretch;
      }
      .home-desktop-round3 .desktop-main-window,
      .home-desktop-round3 .desktop-widget {
        border: 1px solid rgba(255,255,255,.68);
        background:
          radial-gradient(circle at 12% 0%, rgba(244,228,184,.22), transparent 30%),
          radial-gradient(circle at 94% 0%, rgba(226,237,241,.46), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.56), rgba(255,255,255,.22));
        box-shadow: 0 24px 76px rgba(24,63,50,.09), inset 0 1px 0 rgba(255,255,255,.76);
        backdrop-filter: blur(22px) saturate(1.08);
      }
      .home-desktop-round3 .desktop-main-window {
        min-width: 0;
        height: 100%;
        overflow: hidden;
        border-radius: 31px;
        display: grid;
        grid-template-rows: 58px minmax(0, 1fr);
      }
      .home-desktop-round3 .desktop-window-bar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        padding: 12px 18px 6px;
      }
      .home-desktop-round3 .traffic-lights {
        display: flex;
        gap: 8px;
      }
      .home-desktop-round3 .traffic-lights i {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.32);
      }
      .home-desktop-round3 .traffic-lights i:nth-child(1) { background: #ff5f57; }
      .home-desktop-round3 .traffic-lights i:nth-child(2) { background: #ffbd2e; }
      .home-desktop-round3 .traffic-lights i:nth-child(3) { background: #28c840; }
      .home-desktop-round3 .desktop-view-switcher {
        justify-self: center;
        display: flex;
        max-width: 100%;
        gap: 4px;
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 999px;
        padding: 4px;
        background: rgba(255,255,255,.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.62);
      }
      .home-desktop-round3 .desktop-view-switcher button {
        min-width: 88px;
        border: 0;
        border-radius: 999px;
        padding: 9px 14px;
        color: var(--muted);
        background: transparent;
        font-size: 12px;
        font-weight: 760;
        cursor: pointer;
      }
      .home-desktop-round3 .desktop-view-switcher button:hover {
        color: var(--ink);
        background: rgba(255,255,255,.24);
      }
      .home-desktop-round3 .desktop-view-switcher button.active {
        color: #fffaf0;
        background: linear-gradient(135deg, #0f4a3d, #285987);
        box-shadow: 0 12px 26px rgba(24,63,50,.16), inset 0 1px 0 rgba(255,255,255,.26);
      }
      .home-desktop-round3 .desktop-canvas-stage {
        min-height: 0;
        margin: 0 16px 16px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.55);
        border-radius: 28px;
        background:
          radial-gradient(circle at 18% 18%, rgba(255,255,255,.44), transparent 28%),
          linear-gradient(145deg, rgba(255,255,255,.28), rgba(255,255,255,.10));
      }
      .home-desktop-round3 .desktop-canvas-view {
        position: relative;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        padding: clamp(18px, 2vw, 30px);
      }
      .home-desktop-round3 .latest-canvas {
        display: grid;
        grid-template-columns: minmax(260px, .9fr) minmax(300px, 1.1fr);
        grid-template-rows: minmax(0, 1fr) auto;
        gap: 16px;
      }
      .home-desktop-round3 .canvas-map-line {
        position: absolute;
        inset: 38px 52px 48px;
        pointer-events: none;
        border: 1px dashed rgba(23,35,29,.11);
        border-radius: 44% 56% 52% 48%;
        transform: rotate(-3deg);
      }
      .home-desktop-round3 .canvas-primary-paper,
      .home-desktop-round3 .canvas-note,
      .home-desktop-round3 .path-card,
      .home-desktop-round3 .tool-launch,
      .home-desktop-round3 .desk-window-preview,
      .home-desktop-round3 .update-slide-card {
        border: 1px solid rgba(255,255,255,.66);
        background:
          radial-gradient(circle at 82% 8%, rgba(244,228,184,.24), transparent 42%),
          linear-gradient(180deg, rgba(255,255,255,.56), rgba(255,255,255,.22));
        box-shadow: 0 20px 50px rgba(24,63,50,.065), inset 0 1px 0 rgba(255,255,255,.72);
        color: var(--ink);
      }
      .home-desktop-round3 .canvas-primary-paper {
        position: relative;
        z-index: 1;
        align-self: stretch;
        display: flex;
        min-height: 0;
        flex-direction: column;
        justify-content: flex-end;
        border-radius: 28px;
        padding: clamp(20px, 2.5vw, 30px);
      }
      .home-desktop-round3 .canvas-primary-paper strong {
        display: -webkit-box;
        overflow: hidden;
        margin-top: 10px;
        font-family: var(--display-serif);
        font-size: clamp(24px, 2.4vw, 36px);
        line-height: 1.12;
        font-weight: 620;
        letter-spacing: -.035em;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
      }
      .home-desktop-round3 .canvas-primary-paper span,
      .home-desktop-round3 .canvas-primary-paper small,
      .home-desktop-round3 .canvas-note time,
      .home-desktop-round3 .canvas-note small,
      .home-desktop-round3 .update-slide-card span,
      .home-desktop-round3 .update-slide-card small {
        color: var(--quiet);
        font-size: 11px;
      }
      .home-desktop-round3 .canvas-note-stack {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-auto-rows: minmax(108px, 1fr);
        gap: 12px;
        min-height: 0;
      }
      .home-desktop-round3 .canvas-note {
        display: grid;
        gap: 6px;
        align-content: start;
        overflow: hidden;
        border-radius: 23px;
        padding: 16px;
      }
      .home-desktop-round3 .canvas-note strong {
        display: -webkit-box;
        overflow: hidden;
        font-family: var(--display-serif);
        font-size: clamp(18px, 1.5vw, 24px);
        line-height: 1.18;
        font-weight: 610;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }
      .home-desktop-round3 .note-1 { transform: rotate(-1.2deg); }
      .home-desktop-round3 .note-2 { transform: rotate(1deg); }
      .home-desktop-round3 .note-3 { transform: rotate(.7deg); }
      .home-desktop-round3 .note-4 { transform: rotate(-.7deg); }
      .home-desktop-round3 .canvas-mini-strip {
        position: relative;
        z-index: 1;
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-self: end;
      }
      .home-desktop-round3 .canvas-mini-strip a,
      .home-desktop-round3 .desk-shortcuts a,
      .home-desktop-round3 .desktop-desk-widget a {
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 999px;
        padding: 9px 13px;
        background: rgba(255,255,255,.24);
        color: var(--leaf);
        font-size: 12px;
      }
      .home-desktop-round3 .paths-canvas {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .home-desktop-round3 .path-orbit,
      .home-desktop-round3 .tool-compass {
        position: absolute;
        pointer-events: none;
        border: 1px dashed rgba(23,35,29,.11);
      }
      .home-desktop-round3 .path-orbit {
        inset: 16% 14%;
        border-radius: 50%;
        transform: rotate(-8deg);
      }
      .home-desktop-round3 .path-card {
        position: relative;
        z-index: 1;
        display: grid;
        align-content: start;
        gap: 6px;
        border-radius: 25px;
        padding: 18px;
      }
      .home-desktop-round3 .path-card span {
        color: var(--blue);
        font-family: var(--display-serif);
        font-size: 24px;
      }
      .home-desktop-round3 .path-card strong {
        font-family: var(--display-serif);
        font-size: clamp(24px, 2vw, 32px);
        font-weight: 610;
      }
      .home-desktop-round3 .path-card small {
        color: var(--quiet);
        line-height: 1.5;
      }
      .home-desktop-round3 .tools-canvas {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 260px));
        grid-template-rows: repeat(2, minmax(0, 118px));
        align-content: center;
        justify-content: center;
        gap: 20px;
      }
      .home-desktop-round3 .tool-compass {
        left: 50%;
        top: 50%;
        width: min(360px, 70%);
        aspect-ratio: 1;
        border-radius: 50%;
        transform: translate(-50%, -50%);
      }
      .home-desktop-round3 .tool-launch {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 40px minmax(0,1fr);
        align-items: center;
        gap: 12px;
        border-radius: 22px;
        padding: 14px;
      }
      .home-desktop-round3 .tool-launch strong {
        display: block;
        font-family: var(--display-serif);
        font-size: 24px;
        font-weight: 610;
      }
      .home-desktop-round3 .tool-launch small {
        display: block;
        margin-top: 3px;
        color: var(--muted);
      }
      .home-desktop-round3 .desk-canvas {
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        gap: 14px;
      }
      .home-desktop-round3 .desk-window-preview {
        display: grid;
        align-content: center;
        border-radius: 30px;
        padding: clamp(24px, 3vw, 38px);
      }
      .home-desktop-round3 .desk-window-preview span,
      .home-desktop-round3 .desktop-widget > span,
      .home-desktop-round3 .desktop-update-widget header span {
        color: var(--leaf);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: .28em;
        text-transform: uppercase;
      }
      .home-desktop-round3 .desk-window-preview strong {
        margin-top: 12px;
        font-family: var(--display-serif);
        font-size: clamp(38px, 4.6vw, 70px);
        line-height: .98;
        font-weight: 610;
        letter-spacing: -.05em;
      }
      .home-desktop-round3 .desk-window-preview small {
        margin-top: 14px;
        color: var(--muted);
        font-size: 15px;
      }
      .home-desktop-round3 .desk-shortcuts {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .home-desktop-round3 .desktop-widget-rail {
        min-width: 0;
        height: 100%;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 124px minmax(250px, 1fr) 142px 96px;
        gap: 14px;
      }
      .home-desktop-round3 .desktop-widget {
        min-width: 0;
        overflow: hidden;
        border-radius: 28px;
        padding: 18px;
      }
      .home-desktop-round3 .desktop-stat-widget strong {
        display: block;
        margin-top: 12px;
        font-family: var(--display-serif);
        font-size: 58px;
        line-height: .86;
        font-weight: 520;
      }
      .home-desktop-round3 .desktop-stat-widget small {
        display: block;
        margin-top: 12px;
        color: var(--muted);
      }
      .home-desktop-round3 .desktop-update-widget {
        min-height: 0;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
      }
      .home-desktop-round3 .desktop-update-widget header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .home-desktop-round3 .desktop-update-widget header a {
        color: var(--green);
        font-size: 12px;
      }
      .home-desktop-round3 .single-column-updates {
        position: relative;
        min-height: 0;
        height: 100%;
        margin-top: 14px;
      }
      .home-desktop-round3 .update-carousel-window {
        height: 100%;
        min-height: 0;
        overflow: hidden;
        border-radius: 23px;
      }
      .home-desktop-round3 .update-carousel-track {
        height: 100%;
        display: flex;
        flex-direction: column;
        transition: transform .52s cubic-bezier(.2,1.18,.28,1);
      }
      .home-desktop-round3 .update-slide-card {
        flex: 0 0 100%;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        border-radius: 23px;
        padding: 18px;
      }
      .home-desktop-round3 .update-slide-card strong {
        display: -webkit-box;
        overflow: hidden;
        margin: 8px 0 9px;
        font-family: var(--display-serif);
        font-size: clamp(21px, 1.7vw, 27px);
        line-height: 1.14;
        font-weight: 610;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
      }
      .home-desktop-round3 .update-carousel-controls {
        position: absolute;
        right: 12px;
        top: 14px;
        display: grid;
        gap: 8px;
        justify-items: center;
      }
      .home-desktop-round3 .update-carousel-controls button {
        width: 30px;
        height: 30px;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 50%;
        background: rgba(255,255,255,.36);
        color: var(--leaf);
        cursor: pointer;
      }
      .home-desktop-round3 .update-carousel-controls div {
        display: grid;
        gap: 6px;
      }
      .home-desktop-round3 .update-carousel-controls i {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(255,255,255,.58);
      }
      .home-desktop-round3 .update-carousel-controls i.active {
        background: var(--leaf);
      }
      .home-desktop-round3 .desktop-desk-widget strong {
        display: block;
        margin-top: 12px;
        font-family: var(--display-serif);
        font-size: 32px;
        font-weight: 600;
      }
      .home-desktop-round3 .desktop-desk-widget div {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      .home-desktop-round3 .desktop-signature-widget {
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(25,59,49,.88);
      }
      .home-desktop-round3 .desktop-signature-widget svg {
        max-width: 230px;
        width: 78%;
      }
      @media (max-width: 1120px) {
        .home-desktop-round3 {
          height: auto;
          overflow: visible;
          padding-bottom: 100px;
        }
        .home-desktop-round3 .desktop-grid-shell {
          height: auto;
          grid-template-columns: 1fr;
        }
        .home-desktop-round3 .desktop-main-window {
          min-height: 640px;
        }
        .home-desktop-round3 .desktop-widget-rail {
          grid-template-columns: 1fr;
          grid-template-rows: auto minmax(280px, 360px) auto 100px;
        }
      }
      @media (max-width: 720px) {
        .home-desktop-round3 {
          padding-left: 12px;
          padding-right: 12px;
        }
        .home-desktop-round3 .desktop-window-bar {
          grid-template-columns: 1fr;
        }
        .home-desktop-round3 .desktop-view-switcher {
          justify-self: stretch;
          overflow-x: auto;
        }
        .home-desktop-round3 .desktop-view-switcher button {
          min-width: 72px;
        }
        .home-desktop-round3 .desktop-main-window {
          min-height: 760px;
        }
        .home-desktop-round3 .latest-canvas,
        .home-desktop-round3 .paths-canvas,
        .home-desktop-round3 .tools-canvas {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: none;
          gap: 12px;
          overflow: auto;
        }
        .home-desktop-round3 .canvas-note-stack {
          grid-template-columns: 1fr;
        }
        .home-desktop-round3 .path-orbit,
        .home-desktop-round3 .tool-compass,
        .home-desktop-round3 .canvas-map-line {
          display: none;
        }
      }
    `}</style>

    <LawTechDeskStyles />
  </>
}

HomePage.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'law-tech-home-round3-rewrite' })

  return {
    props: {
      recentContent: selectRecentPublicContent(items, 8),
      contentCount: items.length,
      categories: categorySummary(items),
      types: typeSummary(items)
    },
    revalidate: 1800
  }
}
