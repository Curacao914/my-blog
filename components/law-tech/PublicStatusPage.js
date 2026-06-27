import Head from 'next/head'
import Link from 'next/link'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export function PublicStatusPage({ code, title, description, primary, secondary, noIndex = false }) {
  return <>
    <Head>
      <title>{title} · law-tech.dev</title>
      {noIndex ? <meta name='robots' content='noindex,nofollow' /> : null}
      <meta name='theme-color' content='#f5f3eb' />
    </Head>
    <main className='lawtech-public-page public-status-page'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader />
        <section className='public-status-card'>
          <span>{code}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div>
            {primary ? <Link className='primary' href={primary.href}>{primary.label}</Link> : null}
            {secondary ? <Link href={secondary.href}>{secondary.label}</Link> : null}
          </div>
        </section>
      </div>
      <style jsx>{`
        .public-status-page { min-height:100dvh; }
        .public-status-card { display:grid; justify-items:start; width:min(620px,100%); margin:12vh auto 0; border:1px solid rgba(255,255,255,.76); border-radius:32px; padding:clamp(28px,6vw,58px); background:linear-gradient(145deg,rgba(255,255,255,.72),rgba(239,245,241,.5)); box-shadow:0 28px 90px rgba(24,63,50,.1),inset 0 1px 0 rgba(255,255,255,.92); backdrop-filter:blur(24px); }
        .public-status-card > span { color:var(--honey); font-size:11px; letter-spacing:.16em; text-transform:uppercase; }
        h1 { margin:14px 0 12px; font-family:var(--display-serif); font-size:clamp(38px,7vw,66px); font-weight:600; letter-spacing:-.05em; line-height:1.05; }
        p { max-width:500px; margin:0; color:var(--muted); font-size:15px; line-height:1.8; }
        .public-status-card > div { display:flex; flex-wrap:wrap; gap:9px; margin-top:28px; }
        .public-status-card a { border:1px solid rgba(17,63,49,.1); border-radius:999px; padding:10px 14px; color:var(--green); background:rgba(255,255,255,.55); font-size:12px; }
        .public-status-card a.primary { color:#fffaf0; border-color:transparent; background:var(--leaf); }
      `}</style>
    </main>
    <LawTechDeskStyles />
  </>
}
