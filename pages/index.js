import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'

const navItems = [
  { label: '内容', href: '/content' },
  { label: '项目', href: '#projects' },
  { label: '工具', href: '/tools' },
  { label: '关于', href: '#about' },
  { label: '工作台', href: '/desk', accent: true }
]

const siteSections = [
  {
    id: 'content',
    title: '内容',
    copy: '文章、课程笔记、读书记录。公开的放在这里，没想好的先不打扰别人。'
  },
  {
    id: 'projects',
    title: '项目',
    copy: '一些真正用得上的小东西。能留下来，再慢慢写清楚。'
  },
  {
    id: 'tools',
    title: '工具',
    copy: 'OCR、引注，还有以后可能继续长出来的工具。'
  },
  {
    id: 'about',
    title: '关于',
    copy: '一个前非法本、现法硕非法学生的主页。'
  },
  {
    id: 'workspace',
    title: '工作台',
    copy: '给自己用的地方。事项、课程、资料、草稿，都先在那里安顿。'
  }
]

const fallbackRecent = [
  {
    type: '文章',
    title: '从“比特”到“词元”',
    summary: '技术改变了材料，也改变了问题本身。',
    href: '/article/from_bit_to_token'
  },
  {
    type: '课程笔记',
    title: '刑事诉讼法',
    summary: '课堂、制度和案例之间的来回走动。',
    href: '/article/criminal-procedure-law'
  },
  {
    type: '项目',
    title: '课程整理',
    summary: '把课件、转录稿和笔记放到同一条线上。',
    href: '#projects'
  }
]

const Home = ({ recentItems = fallbackRecent }) => {
  const recent = recentItems.length ? recentItems : fallbackRecent

  return (
    <>
      <Head>
        <title>Curacao · law-tech.dev</title>
        <meta
          name='description'
          content='Curacao 的个人主页：法学笔记、文章、课程整理和一些自己会用的小工具。'
        />
        <meta name='theme-color' content='#f7f9f8' />
      </Head>

      <div className='home-page'>
        <div className='wrap'>
          <nav className='top-nav' aria-label='主导航'>
            <Link className='brand' href='/'>
              law-tech.dev
            </Link>
            <div className='nav-links'>
              {navItems.map(item => (
                <a
                  key={item.label}
                  className={item.accent ? 'desk-link' : ''}
                  href={item.href}>
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          <main className='main'>
            <section className='hero' aria-labelledby='home-title'>
              <div>
                <div className='identity'>
                  <Image
                    className='avatar'
                    src='/curacao-avatar.png'
                    alt='Curacao 的像素头像'
                    width={92}
                    height={92}
                    priority
                  />
                  <div>
                    <h1 id='home-title'>Curacao</h1>
                    <p className='role'>前非法本法学生，现法硕非法学生</p>
                  </div>
                </div>

                <p className='question'>
                  你也在思考<span>意义</span>有什么意义吗？
                </p>

                <div className='map' aria-label='站点栏目'>
                  {siteSections.map(section => (
                    <section
                      className='map-row'
                      id={section.id}
                      key={section.title}>
                      <h2>{section.title}</h2>
                      <p>{section.copy}</p>
                    </section>
                  ))}
                </div>
              </div>

              <aside className='aside' aria-label='最近更新'>
                <div className='aside-head'>
                  <h2>最近</h2>
                  <span>慢慢更新</span>
                </div>
                {recent.map(item => (
                  <a className='recent' href={item.href} key={item.title}>
                    <small>{item.type}</small>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                  </a>
                ))}
              </aside>
            </section>

            <footer className='footer-mark'>
              <span>Curacao · law-tech.dev</span>
              <span>你也在思考意义有什么意义吗？</span>
            </footer>
          </main>
        </div>
      </div>

      <style jsx>{`
        .home-page {
          --bg: #f7f9f8;
          --ink: #1e2322;
          --muted: #66716b;
          --quiet: #87938c;
          --line: #dfe7e1;
          --panel: #ffffff;
          --green: #3f5f3a;
          --blue: #315a8c;
          --gold: #c99a3b;
          min-height: 100vh;
          color: var(--ink);
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(201, 154, 59, 0.085),
              transparent 20rem
            ),
            linear-gradient(
              115deg,
              rgba(63, 95, 58, 0.075),
              transparent 38%
            ),
            linear-gradient(180deg, #fcfefd 0%, var(--bg) 100%);
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .home-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.45;
          background:
            radial-gradient(
              circle at 18% 28%,
              rgba(63, 95, 58, 0.09),
              transparent 22rem
            ),
            radial-gradient(
              circle at 90% 8%,
              rgba(49, 90, 140, 0.07),
              transparent 18rem
            );
        }

        .wrap {
          position: relative;
          z-index: 1;
          width: min(1040px, calc(100% - 40px));
          margin: 0 auto;
        }

        .top-nav {
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
        }

        .brand {
          font-weight: 720;
          letter-spacing: -0.03em;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
          color: var(--muted);
        }

        .nav-links a {
          position: relative;
          padding: 6px 0;
        }

        .nav-links a:hover {
          color: var(--ink);
        }

        .nav-links a:hover::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background: var(--gold);
        }

        .desk-link {
          padding: 8px 12px !important;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          color: var(--blue) !important;
        }

        .main {
          padding: 52px 0 96px;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          gap: 70px;
          align-items: start;
        }

        .identity {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .avatar {
          width: 92px;
          height: 92px;
          object-fit: contain;
          display: block;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: 36px;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .role {
          margin-top: 9px;
          color: var(--muted);
          font-size: 14px;
        }

        .question {
          max-width: 660px;
          font-size: clamp(23px, 3.2vw, 36px);
          line-height: 1.35;
          letter-spacing: -0.035em;
          font-weight: 700;
          color: #202724;
        }

        .question span {
          color: var(--green);
        }

        .map {
          margin-top: 48px;
          display: grid;
          gap: 22px;
          max-width: 720px;
        }

        .map-row {
          display: grid;
          grid-template-columns: 112px 1fr;
          gap: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--line);
          scroll-margin-top: 24px;
        }

        .map-row h2 {
          color: var(--blue);
          font-size: 16px;
          font-weight: 720;
          letter-spacing: -0.02em;
        }

        .map-row p {
          color: #58645e;
          line-height: 1.75;
          font-size: 15px;
        }

        .aside {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.82),
            rgba(250, 252, 250, 0.68)
          );
          border: 1px solid var(--line);
          border-radius: 28px;
          padding: 22px 22px 8px;
          box-shadow: 0 18px 52px rgba(37, 55, 48, 0.055);
        }

        .aside-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }

        .aside-head h2 {
          font-size: 16px;
          letter-spacing: -0.02em;
        }

        .aside-head span {
          color: var(--quiet);
          font-size: 12px;
        }

        .recent {
          display: block;
          padding: 18px 0;
          border-top: 1px solid var(--line);
        }

        .recent small {
          display: block;
          color: var(--green);
          font-size: 12px;
          margin-bottom: 7px;
        }

        .recent strong {
          display: block;
          font-size: 18px;
          line-height: 1.35;
          letter-spacing: -0.025em;
        }

        .recent p {
          margin-top: 8px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .note {
          margin-top: 24px;
          color: #87938c;
          font-size: 12px;
          line-height: 1.7;
        }

        .footer-mark {
          margin-top: 80px;
          border-top: 1px solid var(--line);
          padding-top: 18px;
          color: #87938c;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        @media (max-width: 820px) {
          .top-nav {
            height: auto;
            padding: 24px 0;
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .nav-links {
            width: 100%;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
          }

          .desk-link {
            padding: 6px 9px !important;
          }

          .main {
            padding-top: 36px;
          }

          .hero {
            grid-template-columns: 1fr;
            gap: 44px;
          }

          .identity {
            align-items: flex-start;
          }

          .avatar {
            width: 76px;
            height: 76px;
          }

          h1 {
            font-size: 32px;
          }

          .map-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .footer-mark {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  )
}

Home.layout = 'bare'

export default Home
