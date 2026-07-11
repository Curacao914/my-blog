import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechIcon } from '@/components/LawTechIcons'

const tools = [
  {
    name: 'OCR',
    href: 'https://law-tech.dev/ocr/',
    icon: 'scan',
    kicker: 'Document capture',
    detail: '图片、扫描件、PDF',
    output: '可编辑文本',
    external: true,
    tone: 'blue'
  },
  {
    name: '引注',
    href: 'https://law-tech.dev/citation/',
    icon: 'citation',
    kicker: 'Citation',
    detail: '论文、作业、读书笔记',
    output: '脚注与书目',
    external: true,
    tone: 'honey'
  },
  {
    name: '课程整理',
    href: '/desk/courses',
    icon: 'courses',
    kicker: 'Course notes',
    detail: '课程材料、录音与笔记',
    output: '工作台',
    tone: 'leaf'
  }
]

const shortcuts = [
  { label: '写作', href: '/desk/writing', icon: 'writing' },
  { label: '笔记库', href: '/desk/materials', icon: 'materials' },
  { label: '系统设置', href: '/desk/system', icon: 'system' }
]

export default function ToolsPage() {
  return (
    <>
      <Head>
        <title>工具 · law-tech.dev</title>
        <meta name='description' content='OCR、引注与课程整理。' />
        <meta name='theme-color' content='#e8efec' />
      </Head>
      <main className='lawtech-public-page public-tools tools-app-v2'>
        <PublicHeader active='tools' />
        <div className='public-shell tools-window' data-system-app='工具'>
          <section className='tools-app-head'>
            <div><span>Utilities</span><h1>工具</h1></div>
            <div className='tools-availability'><i />3 个入口</div>
          </section>

          <section className='tools-compact-grid' aria-label='工具列表'>
            {tools.map((tool, index) => (
              <Link
                className={`tool-row tone-${tool.tone}`}
                href={tool.href}
                key={tool.name}
                rel={tool.external ? 'noreferrer' : undefined}
              >
                <span className='tool-index'>{String(index + 1).padStart(2, '0')}</span>
                <i className='tool-icon'><LawTechIcon name={tool.icon} size={22} /></i>
                <span className='tool-copy'>
                  <small>{tool.kicker}</small>
                  <strong>{tool.name}</strong>
                  <span>{tool.detail}</span>
                </span>
                <span className='tool-output'>{tool.output}</span>
                <b aria-hidden='true'>↗</b>
              </Link>
            ))}
          </section>

          <section className='tools-bottom-bar'>
            <span>工作台快捷入口</span>
            <nav aria-label='工作台快捷入口'>
              {shortcuts.map(item => (
                <Link href={item.href} key={item.href}>
                  <LawTechIcon name={item.icon} size={15} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </main>
    </>
  )
}

ToolsPage.layout = 'bare'
