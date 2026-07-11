import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechIcon } from '@/components/LawTechIcons'
import { getWorkspaceSession } from '@/lib/auth/serverAdmin'
import { DEFAULT_SITE_PROFILE, getPublicSiteProfile, normalizeSiteProfile } from '@/lib/siteProfile'

function ProfileImage({ profile }) {
  return (
    <span className='about-profile-image'>
      {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.name} 头像`} /> : <b>{profile.name.slice(0, 1)}</b>}
    </span>
  )
}

function SchoolMark({ school }) {
  return (
    <span className='about-school-mark'>
      {school.logoUrl ? <img src={school.logoUrl} alt='' /> : <b>{school.school.slice(0, 1)}</b>}
    </span>
  )
}

export default function AboutPage({ initialProfile = DEFAULT_SITE_PROFILE }) {
  const [profile, setProfile] = useState(() => normalizeSiteProfile(initialProfile))

  useEffect(() => {
    let cancelled = false
    fetch('/api/site-profile', { credentials: 'same-origin' })
      .then(response => response.json())
      .then(data => {
        if (!cancelled && data?.profile) setProfile(normalizeSiteProfile(data.profile))
      })
      .catch(() => null)
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <Head>
        <title>关于 · {profile.name}</title>
        <meta name='description' content={profile.intro} />
        <meta name='robots' content='noindex,nofollow' />
        <meta name='theme-color' content='#e8efec' />
      </Head>
      <main className='lawtech-public-page public-about about-app-v2'>
        <PublicHeader active='about' ownerNavigation />
        <div className='public-shell about-window' data-system-app='关于'>
          <section className='about-profile-head'>
            <ProfileImage profile={profile} />
            <div className='about-profile-copy'>
              <span>{profile.location}</span>
              <h1>{profile.name}</h1>
              <p>{profile.subtitle}</p>
              <nav aria-label='个人链接'>
                {profile.links.map(link => (
                  <Link href={link.href} key={`${link.label}:${link.href}`} rel={link.href.startsWith('http') ? 'noreferrer' : undefined}>
                    {link.label}<span aria-hidden='true'>↗</span>
                  </Link>
                ))}
              </nav>
            </div>
            <div className='about-profile-monogram' aria-hidden='true'>C</div>
          </section>

          <section className='about-section about-section-copy'>
            <header><span>About</span><h2>关于</h2></header>
            <div>
              <p className='about-intro'>{profile.intro}</p>
              {profile.about.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>

          <section className='about-section about-section-education'>
            <header><span>Education</span><h2>教育经历</h2></header>
            <div className='about-education-list'>
              {profile.education.map((school, index) => (
                <Link href={school.href || '#'} key={`${school.school}:${index}`} rel={school.href?.startsWith('http') ? 'noreferrer' : undefined}>
                  <SchoolMark school={school} />
                  <span><strong>{school.school}</strong><small>{school.program}</small></span>
                  <time>{school.period}</time>
                </Link>
              ))}
            </div>
          </section>

          <section className='about-section about-section-skills'>
            <header><span>Skills</span><h2>方向与工具</h2></header>
            <div className='about-skill-grid'>
              {profile.skills.map(group => (
                <article key={group.group}><h3>{group.group}</h3><div>{group.items.map(item => <span key={item}>{item}</span>)}</div></article>
              ))}
            </div>
          </section>

          <footer className='about-window-foot'>
            <Link href='/content'><LawTechIcon name='content' size={15} />内容</Link>
            <Link href='/tools'><LawTechIcon name='tools' size={15} />工具</Link>
            <Link href='/desk/system?section=public-profile'><LawTechIcon name='system' size={15} />编辑资料</Link>
          </footer>
        </div>
      </main>
    </>
  )
}

AboutPage.layout = 'bare'

export async function getServerSideProps(ctx) {
  const session = await getWorkspaceSession(ctx.req)
  if (session.code === 'handshake' && session.redirectUrl) {
    return { redirect: { destination: session.redirectUrl, permanent: false } }
  }
  if (session.code === 'signed_out') {
    return { redirect: { destination: `/sign-in?redirect_url=${encodeURIComponent(ctx.resolvedUrl || '/about')}`, permanent: false } }
  }
  if (!session.ok || !session.isOwner) return { notFound: true }
  return {
    props: {
      initialProfile: await getPublicSiteProfile(),
      workspaceSession: {
        actor: session.publicActor,
        profile: session.publicProfile,
        isOwner: session.isOwner,
        impersonating: session.impersonating
      }
    }
  }
}
