import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'

const tools = [
  { name: 'OCR', href: '/ocr/', icon: 'materials', meta: '图片、扫描件、PDF', tone: 'blue' },
  { name: '引注', href: '/citation/', icon: 'writing', meta: '论文、作业、读书笔记', tone: 'honey' },
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
          {tools.map(tool => <Link className={`public-tool-card tone-${tool.tone}`} href={tool.href} key={tool.name}>
            <header><span className='public-entry-icon'><LawTechIcon name={tool.icon} size={22} /></span></header>
            <div><h2>{tool.name}</h2><p>{tool.meta}</p></div>
            <b>打开 <span>↗</span></b>
          </Link>)}
        </section>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}

ToolsPage.layout = 'bare'
