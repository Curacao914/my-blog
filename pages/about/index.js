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
        <style jsx>{`
          /* public-about-surface-v1: compact about cards */
          .public-about :global(.public-page-hero.compact) { max-width:760px; padding:38px 0 24px; }
          .public-about :global(.public-page-hero.compact h1) { font-size:clamp(42px,6vw,66px); }
          .public-about :global(.public-page-hero.compact p) { max-width:560px; color:var(--muted); line-height:1.75; }
          .about-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; padding:0 0 76px; }
          .about-story-card { display:grid; grid-template-columns:auto minmax(0,1fr); gap:14px; min-height:154px; border:1px solid rgba(255,255,255,.68); border-radius:18px; padding:16px; background:rgba(255,255,255,.52); box-shadow:0 12px 34px rgba(24,63,50,.05),inset 0 1px 0 rgba(255,255,255,.82); }
          .about-story-card > span { color:var(--blue); font-family:var(--display-serif); font-size:24px; line-height:1; }
          .about-story-card h2 { margin:0 0 7px; font-family:var(--display-serif); font-size:23px; font-weight:600; }
          .about-story-card p { margin:0; color:var(--muted); font-size:12px; line-height:1.65; }
          .about-story-card a { display:inline-flex; margin-top:18px; color:var(--green); font-size:11px; }
        `}</style>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}

AboutPage.layout = 'bare'
