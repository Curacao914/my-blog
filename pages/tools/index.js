import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'

const tools = [
  { name: 'OCR', href: 'https://law-tech.dev/ocr/', icon: 'materials', meta: '图片、扫描件、PDF', external: true },
  { name: '引注', href: 'https://law-tech.dev/citation/', icon: 'writing', meta: '论文、作业、读书笔记', external: true },
  { name: '内容搜索', href: '/search', icon: 'search', meta: '全文、栏目与标签' },
  { name: '课程整理', href: '/desk/courses', icon: 'courses', meta: '私人工作台' }
]

export default function ToolsPage() {
  return <>
    <Head><title>工具 · law-tech.dev</title><meta name='description' content='Curacao 的工具入口。' /><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-tools public-app-page-v3'>
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='tools' />
        <section className='public-tool-window public-app-window'>
          <header className='public-window-titlebar'><div className='traffic' aria-hidden='true'><i /><i /><i /></div><div><span>Tools</span><strong>工具</strong></div></header>
          <section className='public-tool-grid' aria-label='工具列表'>{tools.map(tool => <Link className='public-tool-card public-tool-card-v3' href={tool.href} key={tool.name} rel={tool.external ? 'noreferrer' : undefined}><header><span className='public-entry-icon'><LawTechIcon name={tool.icon} size={22} /></span></header><div><h2>{tool.name}</h2><p>{tool.meta}</p></div><b>打开 <span>↗</span></b></Link>)}</section>
        </section>
        <style jsx>{`
          /* public-tools-app-window-v3 */
          .public-app-window{margin-top:18px;border:1px solid rgba(255,255,255,.72);border-radius:34px;background:linear-gradient(180deg,rgba(255,255,255,.48),rgba(255,255,255,.24));box-shadow:0 26px 74px rgba(24,63,50,.09),inset 0 1px 0 rgba(255,255,255,.76);backdrop-filter:blur(24px) saturate(1.08);overflow:hidden}.public-window-titlebar{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center;padding:17px 20px;border-bottom:1px solid rgba(23,35,29,.07)}.traffic{display:flex;gap:8px}.traffic i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.traffic i:nth-child(2){background:#ffbd2e}.traffic i:nth-child(3){background:#28c840}.public-window-titlebar span{color:var(--green);font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.public-window-titlebar strong{display:block;margin-top:4px;font-family:var(--display-serif);font-size:32px}.public-tool-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:20px}.public-tool-card-v3{display:grid;min-height:178px;border:1px solid rgba(255,255,255,.64);border-radius:22px;padding:18px;background:rgba(255,255,255,.32);box-shadow:inset 0 1px 0 rgba(255,255,255,.64);transition:transform .2s var(--ease),border-radius .2s var(--ease)}.public-tool-card-v3:hover{transform:translateY(-3px);border-radius:18px}.public-entry-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(255,255,255,.62);border-radius:16px;background:rgba(255,255,255,.28);color:var(--leaf)}.public-tool-card h2{margin:18px 0 5px;font-family:var(--display-serif);font-size:26px;font-weight:600}.public-tool-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.public-tool-card b{align-self:end;margin-top:20px;color:var(--green);font-size:11px}
        `}</style>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}
ToolsPage.layout = 'bare'
