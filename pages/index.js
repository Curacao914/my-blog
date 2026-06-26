import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'

const entries = [
  { icon: 'content', eyebrow: 'Notes & essays', title: '内容', href: '/content', body: '法学笔记、文章、课程整理和仍在继续想的问题。', tone: 'leaf' },
  { icon: 'spark', eyebrow: 'Small but useful', title: '工具', href: '/tools', body: 'OCR、引注，以及确实会在日常学习里打开的工具。', tone: 'blue' },
  { icon: 'today', eyebrow: 'Private workspace', title: '工作台', href: '/desk', body: '处理事项、阅读、课程与写作的私人编辑室。', tone: 'honey' }
]

export default function HomePage() {
  return <>
    <Head>
      <title>Curacao · law-tech.dev</title>
      <meta name='description' content='Curacao 的个人主页：法学笔记、文章、课程整理和工具。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>
    <main className='lawtech-public-page public-home'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader />
        <section className='public-hero'>
          <div className='public-hero-copy'>
            <div className='public-live-note'><i />最近在整理：法学课程、写作与一点点技术</div>
            <span className='eyebrow'>Curacao · law-tech.dev</span>
            <h1>你也在思考，<br /><em>意义有什么意义</em>吗？</h1>
            <p>前非法本法学生，现法硕非法学生。这里放写完的东西，也放几个自己真的会用上的小工具。</p>
            <div className='public-hero-actions'>
              <Link className='primary-link' href='/desk'><LawTechIcon name='spark' size={17} />进入工作台</Link>
              <Link className='ghost-link' href='/content'>看公开内容 <span>↗</span></Link>
            </div>
            <div className='public-signals'>
              <span><b>法律</b>在制度与生活之间</span>
              <span><b>写作</b>把混乱慢慢讲清楚</span>
              <span><b>工具</b>少一点重复劳动</span>
            </div>
          </div>
          <aside className='public-portrait-card' aria-label='Curacao'>
            <div className='portrait-glow' aria-hidden='true' />
            <div className='portrait-label'><span>Currently</span><strong>在北京学习法律，偶尔修理网页。</strong></div>
            <div className='portrait-frame'>
              <Image src='/avatar.png' alt='Curacao 头像' width={640} height={640} priority />
            </div>
            <div className='portrait-foot'><span>PKU Law</span><i /> <span>Curacao</span></div>
          </aside>
        </section>

        <section className='public-entry-grid' aria-label='首页入口'>
          {entries.map(entry => (
            <Link className={`public-entry-card tone-${entry.tone}`} key={entry.title} href={entry.href}>
              <span className='public-entry-icon'><LawTechIcon name={entry.icon} size={22} /></span>
              <div><small>{entry.eyebrow}</small><h2>{entry.title}</h2><p>{entry.body}</p></div>
              <b>打开 <span>↗</span></b>
            </Link>
          ))}
        </section>

        <section className='public-now-card'>
          <div><span className='eyebrow'>Now</span><h2>这个站点正在从“能用”长成“愿意每天打开”。</h2></div>
          <p>课程整理已经开始真正跑起来；接下来继续把阅读、写作和材料之间的关系做得更自然一点。</p>
        </section>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}
HomePage.layout = 'bare'
