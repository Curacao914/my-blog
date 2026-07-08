import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'

const tools = [
  { name: 'OCR', href: 'https://law-tech.dev/ocr/', icon: 'materials', meta: '图片、扫描件、PDF', tone: 'blue', external: true },
  { name: '引注', href: 'https://law-tech.dev/citation/', icon: 'writing', meta: '论文、作业、读书笔记', tone: 'honey', external: true },
  { name: '课程整理', href: '/desk/courses', icon: 'courses', meta: '私人工作台', tone: 'leaf' }
]

export default function ToolsPage() {
  return <>
    <Head><title>工具 · law-tech.dev</title><meta name='description' content='Curacao 的工具入口。' /><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-tools'>
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='tools' />
        <section className='public-page-hero compact'>
          <span className='eyebrow'>Tools</span>
          <h1>工具</h1>
        </section>
        <section className='public-tool-grid' aria-label='工具列表'>
          {tools.map(tool => <Link className={`public-tool-card tone-${tool.tone}`} href={tool.href} key={tool.name} rel={tool.external ? 'noreferrer' : undefined}>
            <header><span className='public-entry-icon'><LawTechIcon name={tool.icon} size={22} /></span></header>
            <div><h2>{tool.name}</h2><p>{tool.meta}</p></div>
            <b>打开 <span>↗</span></b>
          </Link>)}
        </section>
        <style jsx>{`
          /* public-tools-surface-v1: compact public tools */
          .public-tools :global(.public-page-hero.compact) { padding:38px 0 22px; }
          .public-tools :global(.public-page-hero.compact h1) { font-size:clamp(40px,5.6vw,62px); }
          .public-tool-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; padding:0 0 72px; }
          .public-tool-card { display:grid; min-height:168px; border:1px solid rgba(255,255,255,.68); border-radius:18px; padding:16px; background:rgba(255,255,255,.52); box-shadow:0 12px 34px rgba(24,63,50,.05),inset 0 1px 0 rgba(255,255,255,.82); transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease; }
          .public-tool-card:hover { transform:translateY(-2px); border-color:rgba(49,90,140,.18); box-shadow:0 16px 38px rgba(24,63,50,.08),inset 0 1px 0 rgba(255,255,255,.86); }
          .public-tool-card header { display:flex; justify-content:flex-start; }
          .public-entry-icon { display:grid; place-items:center; width:38px; height:38px; border-radius:14px; background:rgba(226,237,241,.68); color:var(--leaf); }
          .public-tool-card h2 { margin:18px 0 5px; font-family:var(--display-serif); font-size:24px; font-weight:600; }
          .public-tool-card p { margin:0; color:var(--muted); font-size:12px; line-height:1.6; }
          .public-tool-card b { align-self:end; margin-top:20px; color:var(--green); font-size:11px; }
        `}</style>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}

ToolsPage.layout = 'bare'
