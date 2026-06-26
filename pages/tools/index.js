import Head from 'next/head'
import Link from 'next/link'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'

const tools = [
  { name: 'OCR', href: 'https://law-tech.dev/ocr/', icon: 'materials', status: '可用', scene: '把扫描件、截图和 PDF 里的文字取出来。', note: '适合课件、文献和临时材料。', tone: 'blue' },
  { name: '引注', href: 'https://law-tech.dev/citation/', icon: 'writing', status: '可用', scene: '整理论文、作业和读书笔记里的引用格式。', note: '写东西时顺手用，不必另开复杂软件。', tone: 'honey' },
  { name: '课程整理', href: '/desk/courses', icon: 'courses', status: '私人', scene: '把转录、课件与讲义整理成可核对的课程笔记。', note: '逐节点生成、审查与确认。', tone: 'leaf' }
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
          <h1>少而顺手的小工具。</h1>
          <p>不做工具箱大全。只留下确实会用到的，够用、好找，也尽量不打扰你正在做的事。</p>
        </section>
        <section className='public-tool-grid' aria-label='工具列表'>
          {tools.map(tool => <Link className={`public-tool-card tone-${tool.tone}`} href={tool.href} key={tool.name}>
            <header><span className='public-entry-icon'><LawTechIcon name={tool.icon} size={22} /></span><em><i />{tool.status}</em></header>
            <div><h2>{tool.name}</h2><p>{tool.scene}</p><small>{tool.note}</small></div>
            <b>打开工具 <span>↗</span></b>
          </Link>)}
        </section>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}
ToolsPage.layout = 'bare'
