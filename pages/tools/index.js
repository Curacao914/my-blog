import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'

const tools = [
  { name: 'OCR', href: 'https://law-tech.dev/ocr/', icon: 'materials', meta: '图片、扫描件、PDF', external: true },
  { name: '引注', href: 'https://law-tech.dev/citation/', icon: 'writing', meta: '论文、作业、读书笔记', external: true },
  { name: '搜索', href: '/search', icon: 'search', meta: '文章、课程、标签' },
  { name: '课程整理', href: '/desk/courses', icon: 'courses', meta: '私人工作台' }
]

export default function ToolsPage() {
  return <>
    <Head><title>工具 · law-tech.dev</title><meta name='description' content='Curacao 的工具入口。' /><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-tools public-tools-app-window-v2'>
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='tools' />
        <section className='tools-window'>
          <div className='tools-window-top'><i /><i /><i /><span>Tools</span></div>
          <div className='tools-window-body'>
            <header>
              <span className='eyebrow'>Tools</span>
              <h1>工具</h1>
            </header>
            <div className='tools-app-grid' aria-label='工具列表'>
              {tools.map(tool => <Link className='tools-app-card' href={tool.href} key={tool.name} rel={tool.external ? 'noreferrer' : undefined}>
                <span><LawTechIcon name={tool.icon} size={20} /></span>
                <strong>{tool.name}</strong>
                <small>{tool.meta}</small>
              </Link>)}
            </div>
          </div>
        </section>
        <style jsx>{`
          .public-tools-app-window-v2 :global(.public-shell) { padding-bottom:70px; }
          .tools-window { overflow:hidden; margin-top:28px; border:1px solid rgba(255,255,255,.7); border-radius:30px; background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.2)); box-shadow:0 22px 70px rgba(24,63,50,.1),inset 0 1px 0 rgba(255,255,255,.74); backdrop-filter:blur(24px) saturate(1.12); }
          .tools-window-top { display:flex; align-items:center; gap:8px; padding:17px 18px 12px; border-bottom:1px solid rgba(255,255,255,.38); color:var(--muted); font-size:12px; }
          .tools-window-top i { width:11px; height:11px; border-radius:50%; }
          .tools-window-top i:nth-child(1){background:#ff6057}.tools-window-top i:nth-child(2){background:#ffbd2f}.tools-window-top i:nth-child(3){background:#28c840}
          .tools-window-top span { margin-left:auto; }
          .tools-window-body { display:grid; grid-template-columns:minmax(260px,.74fr) minmax(0,1.26fr); gap:18px; padding:22px; }
          .tools-window h1 { margin:8px 0 0; font-family:var(--display-serif); font-size:clamp(50px,7vw,86px); font-weight:620; letter-spacing:-.07em; line-height:.98; }
          .tools-app-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
          .tools-app-card { min-height:142px; display:grid; align-content:start; gap:10px; border:1px solid rgba(255,255,255,.58); border-radius:22px; padding:16px; background:rgba(255,255,255,.26); box-shadow:inset 0 1px 0 rgba(255,255,255,.58); transition:transform .22s var(--ease),border-radius .22s var(--ease); }
          .tools-app-card:hover { transform:translateY(-4px); border-radius:18px; }
          .tools-app-card span { display:grid; place-items:center; width:42px; height:42px; border:1px solid rgba(255,255,255,.62); border-radius:14px; color:var(--leaf); background:rgba(255,255,255,.26); }
          .tools-app-card strong { font-family:var(--display-serif); font-size:25px; font-weight:610; }
          .tools-app-card small { color:var(--muted); line-height:1.6; }
          @media (max-width:840px){ .tools-window-body{grid-template-columns:1fr}.tools-app-grid{grid-template-columns:1fr} }
        `}</style>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}

ToolsPage.layout = 'bare'
