
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
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date)
}

function itemKey(item, fallback) {
  return item?.id || `${item?.source || 'content'}:${item?.slug || fallback}`
}

function LatestCanvas({ items }) {
  const [first, second, third, fourth, fifth] = items
  const notes = [second, third, fourth].filter(Boolean)

  return <section className='desktop-canvas-view latest-canvas' aria-label='最近更新'>
    <div className='canvas-thread' aria-hidden='true' />

    {first ? <Link className='canvas-primary-paper' href={publicContentHref(first)}>
      <span>{formatDate(publicContentDate(first))}</span>
      <strong>{first.title || '未命名内容'}</strong>
      <small>{publicContentTypeLabel(first.type)} · {publicContentCategory(first)}</small>
    </Link> : <div className='canvas-primary-paper is-empty'>还没有公开内容。</div>}

    <div className='floating-note-group'>
      {notes.map((item, index) => <Link className={`floating-note note-${index + 1}`} href={publicContentHref(item)} key={itemKey(item, index)}>
        <time>{formatDate(publicContentDate(item))}</time>
        <strong>{item.title || '未命名内容'}</strong>
        <small>{publicContentCategory(item)}</small>
      </Link>)}
    </div>

    <div className='canvas-mini-strip'>
      <Link href='/content'>内容库</Link>
      <Link href='/archive'>时间归档</Link>
      {fifth ? <Link href={publicContentHref(fifth)}>再看一篇</Link> : null}
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
      <LawTechIcon name={tool.icon} size={20} />
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
  const [index, setIndex] = useState(0)
  const slides = items.slice(0, 6)

  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = window.setInterval(() => {
      setIndex(current => (current + 1) % slides.length)
    }, 5200)
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
          <strong>{item.title || '未命名内容'}</strong>
          <small>{publicContentTypeLabel(item.type)} · {publicContentCategory(item)}</small>
        </Link>)}
      </div>
    </div>
    <div className='update-carousel-controls'>
      <button type='button' onClick={() => move(-1)} aria-label='上一条'>↑</button>
      <div aria-hidden='true'>
        {slides.map((item, dot) => <i className={dot === index ? 'active' : ''} key={itemKey(item, dot)} />)}
      </div>
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
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
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

    <style jsx>{`
      .home-desktop-round3 {
        height: 100dvh;
        overflow: hidden;
        padding-top: 78px;
        padding-bottom: 82px;
      }
      .desktop-grid-shell {
        width: min(1460px, calc(100vw - 42px));
        height: calc(100dvh - 160px);
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 330px;
        gap: 18px;
        align-items: stretch;
      }
      .desktop-main-window,
      .desktop-widget {
        border: 1px solid rgba(255,255,255,.66);
        background:
          radial-gradient(circle at 12% 0%, rgba(244,228,184,.24), transparent 32%),
          radial-gradient(circle at 92% 0%, rgba(226,237,241,.48), transparent 36%),
          linear-gradient(145deg, rgba(255,255,255,.52), rgba(255,255,255,.18));
        box-shadow: 0 24px 80px rgba(24,63,50,.09), inset 0 1px 0 rgba(255,255,255,.76);
        backdrop-filter: blur(22px) saturate(1.08);
      }
      .desktop-main-window {
        min-width: 0;
        height: 100%;
        overflow: hidden;
        border-radius: 32px;
      }
      .desktop-window-bar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        min-height: 58px;
        padding: 12px 18px 6px;
      }
      .traffic-lights {
        display: flex;
        gap: 8px;
      }
      .traffic-lights i {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.32);
      }
      .traffic-lights i:nth-child(1) { background: #ff5f57; }
      .traffic-lights i:nth-child(2) { background: #ffbd2e; }
      .traffic-lights i:nth-child(3) { background: #28c840; }
      .desktop-view-switcher {
        justify-self: center;
        display: flex;
        gap: 4px;
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 999px;
        padding: 4px;
        background: rgba(255,255,255,.16);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.62);
      }
      .desktop-view-switcher button {
        min-width: 92px;
        border: 0;
        border-radius: 999px;
        padding: 9px 15px;
        color: var(--muted);
        background: transparent;
        font-size: 12px;
        font-weight: 760;
        cursor: pointer;
        transition: background .18s ease, color .18s ease, transform .18s cubic-bezier(.2,1.18,.28,1);
      }
      .desktop-view-switcher button:hover {
        color: var(--ink);
        background: rgba(255,255,255,.24);
      }
      .desktop-view-switcher button.active {
        color: #fffaf0;
        background: linear-gradient(135deg, #0f4a3d, #285987);
        box-shadow: 0 12px 26px rgba(24,63,50,.16), inset 0 1px 0 rgba(255,255,255,.26);
      }
      .desktop-canvas-stage {
        position: relative;
        height: calc(100% - 58px);
        margin: 0 16px 16px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.54);
        border-radius: 28px;
        background:
          radial-gradient(circle at 18% 18%, rgba(255,255,255,.42), transparent 28%),
          linear-gradient(145deg, rgba(255,255,255,.25), rgba(255,255,255,.08));
      }
      .desktop-canvas-view {
        position: relative;
        height: 100%;
        overflow: hidden;
        padding: 32px;
      }
      .canvas-thread,
      .path-orbit,
      .tool-compass {
        position: absolute;
        pointer-events: none;
        border: 1px dashed rgba(23,35,29,.11);
      }
      .canvas-thread {
        inset: 46px 58px 56px;
        border-radius: 44% 56% 52% 48%;
        transform: rotate(-4deg);
      }
      .canvas-primary-paper {
        position: absolute;
        left: 7%;
        top: 17%;
        width: min(430px, 39%);
        min-height: 292px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        border: 1px solid rgba(255,255,255,.68);
        border-radius: 30px;
        padding: 28px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.58), rgba(255,255,255,.2)),
          radial-gradient(circle at 78% 8%, rgba(244,228,184,.28), transparent 42%);
        box-shadow: 0 22px 54px rgba(24,63,50,.08), inset 0 1px 0 rgba(255,255,255,.72);
        transition: transform .22s cubic-bezier(.2,1.18,.28,1), border-radius .22s ease;
      }
      .canvas-primary-paper:hover {
        transform: translateY(-5px) rotate(-.4deg);
        border-radius: 26px;
      }
      .canvas-primary-paper span,
      .floating-note time,
      .floating-note small,
      .update-slide-card span,
      .update-slide-card small {
        color: var(--quiet);
        font-size: 11px;
      }
      .canvas-primary-paper strong {
        margin-top: 10px;
        font-family: var(--display-serif);
        font-size: clamp(30px, 3.2vw, 46px);
        line-height: 1.08;
        font-weight: 620;
        letter-spacing: -.045em;
      }
      .canvas-primary-paper small {
        margin-top: 12px;
      }
      .floating-note-group {
        position: absolute;
        right: 7%;
        top: 14%;
        width: min(570px, 48%);
        height: 72%;
      }
      .floating-note {
        position: absolute;
        display: grid;
        gap: 6px;
        width: 68%;
        min-height: 118px;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 24px;
        padding: 18px;
        background: rgba(255,255,255,.34);
        box-shadow: 0 18px 42px rgba(24,63,50,.055), inset 0 1px 0 rgba(255,255,255,.66);
        transition: transform .22s cubic-bezier(.2,1.18,.28,1), border-radius .22s ease;
      }
      .floating-note:hover {
        transform: translateY(-6px) rotate(0deg) !important;
        border-radius: 19px;
      }
      .floating-note strong {
        font-family: var(--display-serif);
        font-size: 24px;
        font-weight: 610;
        line-height: 1.18;
      }
      .note-1 { left: 0; top: 0; transform: rotate(-2deg); }
      .note-2 { right: 0; top: 30%; transform: rotate(2.4deg); }
      .note-3 { left: 8%; bottom: 2%; transform: rotate(1.2deg); }
      .canvas-mini-strip,
      .desk-shortcuts {
        position: absolute;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .canvas-mini-strip {
        left: 7%;
        bottom: 8%;
      }
      .canvas-mini-strip a,
      .desk-shortcuts a,
      .desktop-desk-widget a {
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 999px;
        padding: 9px 13px;
        background: rgba(255,255,255,.24);
        color: var(--leaf);
        font-size: 12px;
      }
      .path-orbit {
        inset: 14% 12%;
        border-radius: 50%;
        transform: rotate(-8deg);
      }
      .path-card {
        position: absolute;
        display: grid;
        min-width: 210px;
        max-width: 260px;
        gap: 6px;
        border: 1px solid rgba(255,255,255,.64);
        border-radius: 26px;
        padding: 18px;
        background: rgba(255,255,255,.28);
        box-shadow: 0 18px 42px rgba(24,63,50,.06), inset 0 1px 0 rgba(255,255,255,.66);
      }
      .path-card span {
        color: var(--blue);
        font-family: var(--display-serif);
        font-size: 24px;
      }
      .path-card strong {
        font-family: var(--display-serif);
        font-size: 29px;
        font-weight: 610;
      }
      .path-card small {
        color: var(--quiet);
        line-height: 1.5;
      }
      .path-1 { left: 9%; top: 14%; }
      .path-2 { right: 13%; top: 20%; }
      .path-3 { left: 20%; bottom: 13%; }
      .path-4 { right: 10%; bottom: 8%; }
      .tool-compass {
        left: 50%;
        top: 50%;
        width: 360px;
        height: 360px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
      }
      .tool-launch {
        position: absolute;
        display: grid;
        grid-template-columns: 40px minmax(0,1fr);
        align-items: center;
        gap: 12px;
        min-width: 220px;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 22px;
        padding: 14px;
        background: rgba(255,255,255,.28);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.64);
      }
      .tool-launch strong {
        display: block;
        font-family: var(--display-serif);
        font-size: 25px;
        font-weight: 610;
      }
      .tool-launch small {
        color: var(--muted);
      }
      .tool-1 { left: 13%; top: 18%; }
      .tool-2 { right: 14%; top: 18%; }
      .tool-3 { left: 18%; bottom: 18%; }
      .tool-4 { right: 18%; bottom: 18%; }
      .desk-window-preview {
        position: absolute;
        inset: 16% 9% 28%;
        display: grid;
        align-content: center;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 32px;
        padding: 34px;
        background: rgba(255,255,255,.25);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.64);
      }
      .desk-window-preview span,
      .desktop-widget > span,
      .desktop-update-widget header span {
        color: var(--leaf);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: .28em;
        text-transform: uppercase;
      }
      .desk-window-preview strong {
        margin-top: 14px;
        font-family: var(--display-serif);
        font-size: clamp(40px, 5vw, 76px);
        line-height: .95;
        font-weight: 610;
        letter-spacing: -.055em;
      }
      .desk-window-preview small {
        margin-top: 14px;
        color: var(--muted);
        font-size: 15px;
      }
      .desk-shortcuts {
        left: 9%;
        right: 9%;
        bottom: 12%;
      }
      .desktop-widget-rail {
        min-width: 0;
        height: 100%;
        display: grid;
        grid-template-rows: 136px minmax(250px, 1fr) 154px auto;
        gap: 14px;
      }
      .desktop-widget {
        border-radius: 30px;
        padding: 18px;
      }
      .desktop-stat-widget strong {
        display: block;
        margin-top: 12px;
        font-family: var(--display-serif);
        font-size: 62px;
        line-height: .85;
        font-weight: 520;
      }
      .desktop-stat-widget small {
        display: block;
        margin-top: 13px;
        color: var(--muted);
      }
      .desktop-update-widget {
        min-height: 0;
        overflow: hidden;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
      }
      .desktop-update-widget header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .desktop-update-widget header a {
        color: var(--green);
        font-size: 11px;
      }
      .single-column-updates {
        position: relative;
        min-height: 0;
        height: 100%;
        margin-top: 14px;
      }
      .update-carousel-window {
        height: 100%;
        min-height: 230px;
        overflow: hidden;
        border-radius: 24px;
      }
      .update-carousel-track {
        height: 100%;
        display: flex;
        flex-direction: column;
        transition: transform .52s cubic-bezier(.2,1.18,.28,1);
      }
      .update-slide-card {
        flex: 0 0 100%;
        display: flex;
        min-height: 100%;
        flex-direction: column;
        justify-content: flex-end;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 24px;
        padding: 18px;
        background:
          radial-gradient(circle at 80% 10%, rgba(226,237,241,.6), transparent 44%),
          linear-gradient(145deg, rgba(255,255,255,.34), rgba(255,255,255,.16));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.64);
      }
      .update-slide-card strong {
        display: block;
        margin: 8px 0 9px;
        font-family: var(--display-serif);
        font-size: 26px;
        line-height: 1.12;
        font-weight: 610;
      }
      .update-carousel-controls {
        position: absolute;
        right: 12px;
        top: 14px;
        display: grid;
        gap: 8px;
        justify-items: center;
      }
      .update-carousel-controls button {
        width: 30px;
        height: 30px;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 50%;
        background: rgba(255,255,255,.32);
        color: var(--leaf);
        cursor: pointer;
      }
      .update-carousel-controls div {
        display: grid;
        gap: 6px;
      }
      .update-carousel-controls i {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(255,255,255,.58);
      }
      .update-carousel-controls i.active {
        background: var(--leaf);
      }
      .desktop-desk-widget strong {
        display: block;
        margin-top: 12px;
        font-family: var(--display-serif);
        font-size: 34px;
        font-weight: 600;
      }
      .desktop-desk-widget div {
        display: flex;
        gap: 8px;
        margin-top: 18px;
      }
      .desktop-signature-widget {
        min-height: 104px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translateY(12px);
        color: rgba(25,59,49,.88);
      }
      .desktop-signature-widget :global(svg) {
        width: min(260px, 80%);
      }
      @media (max-width: 1120px) {
        .home-desktop-round3 {
          height: auto;
          overflow: visible;
        }
        .desktop-grid-shell {
          height: auto;
          grid-template-columns: 1fr;
        }
        .desktop-main-window {
          min-height: 640px;
        }
        .desktop-widget-rail {
          grid-template-rows: none;
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 720px) {
        .desktop-grid-shell {
          width: min(100% - 24px, 720px);
        }
        .desktop-view-switcher {
          max-width: 100%;
          overflow-x: auto;
          justify-self: end;
        }
        .desktop-view-switcher button {
          min-width: 78px;
        }
        .desktop-main-window {
          min-height: 760px;
        }
        .canvas-primary-paper,
        .floating-note-group,
        .path-card,
        .tool-launch,
        .desk-window-preview {
          position: relative;
          inset: auto;
          left: auto;
          right: auto;
          top: auto;
          bottom: auto;
          width: 100%;
          max-width: none;
          transform: none;
        }
        .desktop-canvas-view {
          display: grid;
          gap: 12px;
          align-content: start;
          overflow: auto;
        }
        .floating-note-group {
          display: grid;
          height: auto;
          gap: 10px;
        }
        .floating-note {
          position: relative;
          width: 100%;
          transform: none;
        }
        .canvas-mini-strip,
        .desk-shortcuts {
          position: relative;
          left: auto;
          right: auto;
          bottom: auto;
        }
        .desktop-widget-rail {
          grid-template-columns: 1fr;
        }
      }
    `}</style>

    <LawTechDeskStyles />
  </>
}

HomePage.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'law-tech-home-round3' })

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
