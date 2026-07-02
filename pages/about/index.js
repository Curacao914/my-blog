import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export default function AboutPage() {
  return <>
    <Head><title>关于 · Curacao</title><meta name='description' content='Curacao 的个人简介。' /><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-about'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='about' />
        <section className='public-page-hero compact'>
          <span className='eyebrow'>About</span>
          <h1>Curacao</h1>
          <p>北京大学法学院法律硕士（非法学）。本科就读于中南财经政法大学侦查学专业。</p>
        </section>
        <section className='about-grid'>
          <article className='about-story-card'><span>01</span><div><h2>法学</h2><p>课程笔记、案例分析与论文。</p><Link href='/content'>查看内容 ↗</Link></div></article>
          <article className='about-story-card'><span>02</span><div><h2>写作</h2><p>经济法、民法、刑法与国际法。</p><Link href='/archive'>时间归档 ↗</Link></div></article>
          <article className='about-story-card'><span>03</span><div><h2>技术</h2><p>个人网站、OCR 与学习工具。</p><Link href='/tools'>查看工具 ↗</Link></div></article>
        </section>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}

AboutPage.layout = 'bare'
