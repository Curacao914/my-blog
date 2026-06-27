import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'

import { PublicContentCard } from '@/components/content/PublicContentCard'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  publicContentCategory,
  selectRecentPublicContent
} from '@/lib/content/publicContent'

const entries = [
  { icon: 'content', eyebrow: 'Notes & essays', title: '内容', href: '/content', body: '法学笔记、文章、课程整理和仍在继续想的问题。', tone: 'leaf' },
  { icon: 'spark', eyebrow: 'Small but useful', title: '工具', href: '/tools', body: 'OCR、引注，以及确实会在日常学习里打开的工具。', tone: 'blue' },
  { icon: 'today', eyebrow: 'Private workspace', title: '工作台', href: '/desk', body: '处理事项、阅读、课程与写作的私人编辑室。', tone: 'honey' }
]

function categorySummary(items = []) {
  return items.reduce((summary, item) => {
    const category = publicContentCategory(item)
    summary[category] = (summary[category] || 0) + 1
    return summary
  }, {})
}

export default function HomePage({ recentContent = [], contentCount = 0, categories = {} }) {
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
            <div className='public-live-note'><i />法律、写作与技术，在同一个工作台里慢慢长出来</div>
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

        <section className='public-home-content' aria-labelledby='home-recent-title'>
          <header>
            <div>
              <span className='eyebrow'>Recently published</span>
              <h2 id='home-recent-title'>最近内容</h2>
              <p>来自 Notion 与工作台的公开内容，统一进入同一套目录与搜索。</p>
            </div>
            <div className='public-home-content-actions'>
              <span>{contentCount} 条公开内容</span>
              <Link href='/search'><LawTechIcon name='search' size={15} />搜索</Link>
              <Link href='/content'>浏览全部 ↗</Link>
            </div>
          </header>

          {recentContent.length ? <div className='public-home-content-grid'>
            {recentContent.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}
          </div> : <div className='public-home-content-empty'>公开内容整理中。</div>}
        </section>

        <section className='public-now-card public-home-map'>
          <div>
            <span className='eyebrow'>Library map</span>
            <h2>课程、阅读与写作，各自归档，也彼此相连。</h2>
            <div className='public-home-category-list'>
              {['遇事不决', '法与算法', '法律之上', '秘密花园'].map(category => (
                <Link href={`/content?category=${encodeURIComponent(category)}`} key={category}>
                  <span>{category}</span><small>{categories[category] || 0}</small>
                </Link>
              ))}
            </div>
          </div>
          <div className='public-home-signature'>
            <p>公开内容保留清晰的来源、栏目与合集；私人材料仍留在工作台中。</p>
            <DynamicSignature compact />
          </div>
        </section>
      </div>

      <style jsx>{`
        .public-home-content { margin-top: 58px; }
        .public-home-content > header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 28px;
          margin-bottom: 20px;
        }
        .public-home-content h2 {
          margin: 8px 0 7px;
          font-family: var(--display-serif);
          font-size: clamp(32px,4vw,52px);
          font-weight: 600;
          letter-spacing: -.045em;
        }
        .public-home-content header p { margin: 0; color: var(--muted); line-height: 1.7; }
        .public-home-content-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
        .public-home-content-actions > span { color: var(--quiet); font-size: 11px; }
        .public-home-content-actions a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(17,63,49,.1);
          border-radius: 999px;
          padding: 8px 11px;
          color: var(--green);
          background: rgba(255,255,255,.5);
          font-size: 11px;
          backdrop-filter: blur(14px);
        }
        .public-home-content-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }
        .public-home-content-empty { border: 1px dashed rgba(23,35,29,.12); border-radius: 24px; padding: 40px; color: var(--quiet); text-align: center; }
        .public-home-map { align-items: stretch; }
        .public-home-category-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 24px; }
        .public-home-category-list a { display: inline-flex; align-items: center; gap: 9px; border: 1px solid rgba(17,63,49,.09); border-radius: 999px; padding: 7px 10px; background: rgba(255,255,255,.48); }
        .public-home-category-list small { color: var(--quiet); }
        .public-home-signature { display: flex; flex-direction: column; justify-content: space-between; gap: 20px; }
        .public-home-signature :global(svg) { max-width: 250px; color: rgba(25,59,49,.74); }
        @media (max-width: 980px) {
          .public-home-content-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
        }
        @media (max-width: 700px) {
          .public-home-content > header { align-items: flex-start; flex-direction: column; }
          .public-home-content-actions { justify-content: flex-start; }
          .public-home-content-grid { grid-template-columns: 1fr; }
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
      recentContent: selectRecentPublicContent(items, 6),
      contentCount: items.length,
      categories: categorySummary(items)
    },
    revalidate: 1800
  }
}
