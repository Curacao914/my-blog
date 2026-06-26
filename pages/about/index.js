import Head from 'next/head'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { LawTechIcon } from '@/components/LawTechIcons'

export default function AboutPage() {
  return <>
    <Head><title>关于 · Curacao</title><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-about'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='about' />
        <section className='public-page-hero'>
          <span className='eyebrow'>About</span>
          <h1>一个法律学生，和一间还在生长的数字书房。</h1>
          <p>Curacao。前非法本法学生，现法硕非法学生。这里记录法学学习、写作、技术小工具，以及那些一时还讲不完整的问题。</p>
        </section>
        <section className='about-grid'>
          <article className='about-story-card'><span>01</span><div><h2>从侦查学到法律</h2><p>关心事实如何被发现，也关心制度如何判断事实。不同的学习路径，最后汇入同一个问题：规则如何真正作用于人。</p></div></article>
          <article className='about-story-card'><span>02</span><div><h2>把理解写成结构</h2><p>课程笔记、论文与案例分析都在训练同一种能力：从杂乱材料中辨认结构，再把结构讲得足够清楚。</p></div></article>
          <article className='about-story-card'><span>03</span><div><h2>工具应该安静一点</h2><p>技术最好的状态，是替人承担重复劳动，却不把使用者拖进另一套复杂术语里。</p></div></article>
        </section>
        <section className='about-quote-card'><LawTechIcon name='spark' size={24} /><p>这里不试图展示一个已经完成的人，只保存一些真实推进过的事情。</p></section>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}
AboutPage.layout = 'bare'
