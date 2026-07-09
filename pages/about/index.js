import Head from 'next/head'
import Link from 'next/link'

import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { aboutProfile } from '@/lib/domain/aboutProfile'

export default function AboutPage() {
  return <>
    <Head><title>关于 · Curacao</title><meta name='description' content='Curacao 的个人简介。' /><meta name='theme-color' content='#f5f3eb' /></Head>
    <main className='lawtech-public-page public-about public-app-page-v3'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='about' />
        <section className='about-window public-app-window'>
          <header className='public-window-titlebar'><div className='traffic' aria-hidden='true'><i /><i /><i /></div><div><span>About</span><strong>{aboutProfile.name}</strong></div><div className='about-signature'><DynamicSignature compact /></div></header>
          <section className='about-hero'><div><h1>{aboutProfile.headline}</h1><p>{aboutProfile.summary}</p></div></section>
          <section className='about-education'><h2>Education</h2><div>{aboutProfile.education.map(item => <article key={item.school}><div className='school-mark'>{item.mark}</div><div><h3>{item.school}</h3><p>{item.detail}</p><span>{item.period}</span></div></article>)}</div></section>
          <section className='about-story-grid'>{aboutProfile.sections.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{item.title}</h2><p>{item.body}</p><Link href={item.href}>{item.action} ↗</Link></div></article>)}</section>
          <section className='about-skills'><h2>Skills</h2><div>{aboutProfile.skills.map(group => <article key={group.group}><h3>{group.group}</h3><p>{group.tags.map(tag => <span key={tag}>{tag}</span>)}</p></article>)}</div></section>
        </section>
        <style jsx>{`
          /* public-about-app-window-v3 */
          .public-app-window{margin-top:18px;border:1px solid rgba(255,255,255,.72);border-radius:34px;background:linear-gradient(180deg,rgba(255,255,255,.48),rgba(255,255,255,.24));box-shadow:0 26px 74px rgba(24,63,50,.09),inset 0 1px 0 rgba(255,255,255,.76);backdrop-filter:blur(24px) saturate(1.08);overflow:hidden}.public-window-titlebar{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(180px,.28fr);gap:18px;align-items:center;padding:17px 20px;border-bottom:1px solid rgba(23,35,29,.07)}.traffic{display:flex;gap:8px}.traffic i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.traffic i:nth-child(2){background:#ffbd2e}.traffic i:nth-child(3){background:#28c840}.public-window-titlebar span{color:var(--green);font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.public-window-titlebar strong{display:block;margin-top:4px;font-family:var(--display-serif);font-size:32px}.about-signature{justify-self:end;width:180px;color:rgba(25,59,49,.68)}.about-hero{padding:42px 28px 34px}.about-hero h1{margin:0;max-width:760px;font-family:var(--display-serif);font-size:clamp(38px,5.2vw,70px);font-weight:610;line-height:1.04;letter-spacing:-.055em}.about-hero p{max-width:720px;margin:22px 0 0;color:var(--muted);font-size:17px;line-height:1.9}.about-education{display:grid;grid-template-columns:160px minmax(0,1fr);gap:20px;padding:0 28px 28px}.about-education h2,.about-skills h2{margin:0;font:700 28px/1 ui-sans-serif,system-ui,sans-serif}.about-education>div{display:grid;gap:12px}.about-education article{position:relative;display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;min-height:118px;overflow:hidden;border:1px solid rgba(255,255,255,.62);border-radius:24px;padding:20px;background:rgba(255,255,255,.32);box-shadow:inset 0 1px 0 rgba(255,255,255,.64)}.school-mark{position:absolute;right:-20px;top:-34px;color:rgba(49,90,140,.16);font-family:var(--display-serif);font-size:92px;letter-spacing:-.08em}.about-education h3{position:relative;margin:0;font:700 25px/1.25 ui-sans-serif,system-ui,sans-serif}.about-education p{position:relative;margin:8px 0 0;color:var(--ink);font-size:18px}.about-education span{position:relative;display:block;margin-top:8px;color:var(--muted)}.about-story-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0 28px 28px}.about-story-grid article{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;min-height:154px;border:1px solid rgba(255,255,255,.62);border-radius:22px;padding:18px;background:rgba(255,255,255,.32);box-shadow:inset 0 1px 0 rgba(255,255,255,.64)}.about-story-grid>article>span{color:var(--blue);font-family:var(--display-serif);font-size:25px;line-height:1}.about-story-grid h2{margin:0 0 8px;font-family:var(--display-serif);font-size:25px}.about-story-grid p{margin:0;color:var(--muted);font-size:13px;line-height:1.7}.about-story-grid a{display:inline-flex;margin-top:18px;color:var(--green);font-size:12px}.about-skills{display:grid;grid-template-columns:160px minmax(0,1fr);gap:20px;padding:0 28px 34px}.about-skills>div{display:grid;gap:12px}.about-skills article{display:grid;grid-template-columns:150px minmax(0,1fr);gap:20px;align-items:start}.about-skills h3{margin:0;font:700 21px/1.2 ui-sans-serif,system-ui,sans-serif}.about-skills p{display:flex;flex-wrap:wrap;gap:8px;margin:0}.about-skills span{border:1px solid rgba(23,35,29,.12);border-radius:12px;padding:7px 10px;color:var(--muted);background:rgba(255,255,255,.3)}@media(max-width:840px){.public-window-titlebar,.about-education,.about-skills{grid-template-columns:1fr}.about-signature{justify-self:start}.about-story-grid{grid-template-columns:1fr}.about-education article,.about-skills article{grid-template-columns:1fr}}
        `}</style>
      </div>
    </main>
    <LawTechDeskStyles />
  </>
}
AboutPage.layout = 'bare'
