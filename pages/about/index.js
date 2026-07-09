import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'

const skills = [
  ['法学', ['刑法', '民法', '经济法', '国际法', '论文写作']],
  ['工具', ['OCR', '引注', '个人网站', '学习工作流']],
  ['写作', ['课程笔记', '案例分析', '读书记录', '项目文档']]
]

export default function AboutPage() {
  return <>
    <Head><title>关于 · Curacao</title><meta name='description' content='Curacao 的个人简介。' /><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-about public-about-resume-v2'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='about' />
        <section className='about-resume-window'>
          <div className='about-window-top'><i /><i /><i /><span>About</span></div>
          <div className='about-resume-body'>
            <header className='about-intro'>
              <span className='eyebrow'>About</span>
              <h1>Curacao</h1>
              <p>北京大学法学院法律硕士（非法学）。本科就读于中南财经政法大学侦查学专业。</p>
            </header>

            <section className='about-section'>
              <h2>Education</h2>
              <div className='about-edu-list'>
                <article><div><strong>北京大学法学院</strong><span>法律硕士（非法学）</span></div><b>Graduate</b></article>
                <article><div><strong>中南财经政法大学</strong><span>侦查学本科</span></div><b>Undergraduate</b></article>
              </div>
            </section>

            <section className='about-section about-skills'>
              <h2>Skills</h2>
              <div>
                {skills.map(group => <div className='skill-row' key={group[0]}><strong>{group[0]}</strong><p>{group[1].map(item => <span key={item}>{item}</span>)}</p></div>)}
              </div>
            </section>

            <section className='about-links'>
              <Link href='/content'>内容库 ↗</Link>
              <Link href='/archive'>时间归档 ↗</Link>
              <Link href='/tools'>工具 ↗</Link>
            </section>
            <footer><DynamicSignature compact /></footer>
          </div>
        </section>
        <style jsx>{`
          .public-about-resume-v2 :global(.public-shell) { padding-bottom:70px; }
          .about-resume-window { overflow:hidden; margin-top:28px; border:1px solid rgba(255,255,255,.7); border-radius:30px; background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.2)); box-shadow:0 22px 70px rgba(24,63,50,.1),inset 0 1px 0 rgba(255,255,255,.74); backdrop-filter:blur(24px) saturate(1.12); }
          .about-window-top { display:flex; align-items:center; gap:8px; padding:17px 18px 12px; border-bottom:1px solid rgba(255,255,255,.38); color:var(--muted); font-size:12px; }
          .about-window-top i { width:11px; height:11px; border-radius:50%; }
          .about-window-top i:nth-child(1){background:#ff6057}.about-window-top i:nth-child(2){background:#ffbd2f}.about-window-top i:nth-child(3){background:#28c840}
          .about-window-top span { margin-left:auto; }
          .about-resume-body { display:grid; gap:26px; padding:28px; }
          .about-intro { max-width:760px; }
          .about-intro h1 { margin:10px 0 14px; font-family:var(--display-serif); font-size:clamp(58px,8vw,96px); font-weight:620; letter-spacing:-.07em; line-height:.96; }
          .about-intro p { margin:0; max-width:640px; color:var(--muted); font-size:17px; line-height:1.9; }
          .about-section { display:grid; grid-template-columns:190px minmax(0,1fr); gap:24px; align-items:start; }
          .about-section h2 { margin:0; font-family:var(--sans-serif); font-size:28px; letter-spacing:-.03em; }
          .about-edu-list { display:grid; gap:12px; }
          .about-edu-list article { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:16px; align-items:center; overflow:hidden; border:1px solid rgba(255,255,255,.58); border-radius:22px; padding:18px 20px; background:rgba(255,255,255,.26); box-shadow:inset 0 1px 0 rgba(255,255,255,.58); }
          .about-edu-list strong { display:block; font-family:var(--display-serif); font-size:26px; font-weight:610; }
          .about-edu-list span { display:block; margin-top:8px; color:var(--muted); }
          .about-edu-list b { color:var(--blue); font-weight:600; }
          .about-skills > div { display:grid; gap:14px; }
          .skill-row { display:grid; grid-template-columns:120px minmax(0,1fr); gap:16px; align-items:start; }
          .skill-row > strong { font-size:20px; }
          .skill-row p { display:flex; flex-wrap:wrap; gap:8px; margin:0; }
          .skill-row span { border:1px solid rgba(23,35,29,.1); border-radius:12px; padding:7px 11px; color:var(--ink); background:rgba(255,255,255,.28); }
          .about-links { display:flex; flex-wrap:wrap; gap:8px; }
          .about-links a { border:1px solid rgba(255,255,255,.62); border-radius:999px; padding:9px 13px; color:var(--green); background:rgba(255,255,255,.24); box-shadow:inset 0 1px 0 rgba(255,255,255,.58); }
          footer { display:flex; justify-content:flex-end; color:rgba(25,59,49,.72); }
          footer :global(svg) { width:min(220px,40vw); }
          @media (max-width:840px){ .about-section{grid-template-columns:1fr}.skill-row{grid-template-columns:1fr}.about-edu-list article{grid-template-columns:1fr} }
        `}</style>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}

AboutPage.layout = 'bare'
