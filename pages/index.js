import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { PublicHeader } from '@/components/law-tech/PublicHeader'

const sections = [
  {
    title: '内容',
    href: '/content',
    body: '笔记、博客、课程整理和读书记录。'
  },
  {
    title: '工具',
    href: '/tools',
    body: 'OCR、引注，以及一些已经能用的小工具。'
  },
  {
    title: '工作台',
    href: '/desk',
    body: '私人入口，处理事项、材料、课程和发布设置。'
  }
]

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Curacao · law-tech.dev</title>
        <meta
          name='description'
          content='Curacao 的个人主页：法学笔记、文章、课程整理和工具。'
        />
        <meta name='theme-color' content='#f7f6f1' />
      </Head>
      <main className='public-page lawtech-public-home'>
        <div className='shell'>
          <PublicHeader />
          <section className='hero'>
            <div>
              <span className='eyebrow'>Curacao · law-tech.dev</span>
              <h1>你也在思考意义有什么意义吗？</h1>
              <p>
                前非法本法学生，现法硕非法学生。这里放一些写完的东西，也放几个自己真的会用上的小工具。
              </p>
              <div className='hero-actions'>
                <Link className='primary-link' href='/desk'>
                  进入工作台
                </Link>
                <Link className='ghost-link' href='/content'>
                  看公开内容
                </Link>
              </div>
            </div>
            <aside className='portrait-card' aria-label='Curacao'>
              <p className='portrait-note'>写作 / 法学 / 小工具</p>
              <Image
                src='/avatar.png'
                alt='Curacao 头像'
                width={640}
                height={640}
                priority
              />
            </aside>
          </section>
          <section className='section-grid' aria-label='首页入口'>
            {sections.map(section => (
              <Link className='glass-card' key={section.title} href={section.href}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </Link>
            ))}
          </section>
        </div>
      </main>
      <style jsx global>{`
        .lawtech-public-home {
          --paper: #f7f6f1;
          --paper-deep: #ebe8dd;
          --ink: #17231d;
          --muted: #69756f;
          --leaf: #183f32;
          --leaf-soft: #dce9df;
          --honey: #d7a43d;
          --honey-soft: #f4e4b8;
          --blue: #8daab7;
          --blue-soft: #e2edf1;
          --line: rgba(23, 35, 29, 0.12);
          --glass: rgba(255, 255, 255, 0.62);
          --shadow: 0 24px 80px rgba(24, 63, 50, 0.14);
          --ease: cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          min-height: 100vh;
          padding: 28px 0 72px;
          overflow: hidden;
          color: var(--ink);
          background:
            radial-gradient(
              circle at 16% 10%,
              rgba(216, 164, 61, 0.24),
              transparent 28rem
            ),
            radial-gradient(
              circle at 86% 0%,
              rgba(141, 170, 183, 0.24),
              transparent 34rem
            ),
            linear-gradient(135deg, #fbfaf5 0%, #eef4ee 56%, #f7f6f1 100%);
          font-family: ui-serif, 'Songti SC', 'STSong', Georgia, serif;
        }

        .lawtech-public-home::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.28;
          background-image:
            linear-gradient(rgba(23, 35, 29, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(23, 35, 29, 0.035) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, #000, transparent 76%);
        }

        .lawtech-public-home a {
          color: inherit;
          text-decoration: none;
        }

        .lawtech-public-home .shell {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100vw - 40px));
          margin: 0 auto;
        }

        .lawtech-public-home .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(24px) saturate(1.2);
          box-shadow: 0 18px 40px rgba(24, 63, 50, 0.08);
        }

        .lawtech-public-home .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .lawtech-public-home .brand-mark {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--leaf);
          color: #fff7dd;
          box-shadow: inset 0 -4px 10px rgba(0, 0, 0, 0.22);
        }

        .lawtech-public-home .nav {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .lawtech-public-home .nav a,
        .lawtech-public-home .ghost-link,
        .lawtech-public-home .primary-link {
          border-radius: 999px;
          padding: 10px 14px;
          color: var(--muted);
          transition:
            transform 0.35s var(--ease),
            background 0.35s var(--ease),
            color 0.35s var(--ease);
        }

        .lawtech-public-home .nav a:hover,
        .lawtech-public-home .ghost-link:hover {
          transform: translateY(-2px);
          color: var(--ink);
          background: rgba(24, 63, 50, 0.08);
        }

        .lawtech-public-home .primary-link {
          color: #fff8e6;
          background: var(--leaf);
          box-shadow: 0 12px 28px rgba(24, 63, 50, 0.22);
        }

        .lawtech-public-home .primary-link:hover {
          transform: translateY(-2px);
        }

        .lawtech-public-home .hero {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
          padding: 82px 0 64px;
        }

        .lawtech-public-home .eyebrow {
          color: var(--leaf);
          font-size: 13px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .lawtech-public-home .hero h1 {
          margin: 18px 0 20px;
          max-width: 760px;
          font-size: clamp(38px, 5.4vw, 78px);
          line-height: 1.02;
          letter-spacing: -0.055em;
        }

        .lawtech-public-home .hero p {
          max-width: 620px;
          color: var(--muted);
          font-size: 19px;
          line-height: 1.9;
        }

        .lawtech-public-home .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 34px;
        }

        .lawtech-public-home .portrait-card {
          position: relative;
          min-height: 440px;
          border: 1px solid var(--line);
          border-radius: 42px;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.74),
            rgba(255, 255, 255, 0.28)
          );
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .lawtech-public-home .portrait-card::before {
          content: '';
          position: absolute;
          inset: 18px;
          border: 1px solid rgba(24, 63, 50, 0.13);
          border-radius: 32px;
        }

        .lawtech-public-home .portrait-card img {
          position: absolute;
          right: 28px;
          bottom: 28px;
          width: min(62%, 260px);
          height: auto;
          object-fit: contain;
          border-radius: 28px;
          filter: saturate(0.92) contrast(1.02);
        }

        .lawtech-public-home .portrait-note {
          position: absolute;
          left: 34px;
          top: 34px;
          max-width: 220px;
          color: var(--muted);
          line-height: 1.8;
        }

        .lawtech-public-home .section-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .lawtech-public-home .glass-card {
          min-height: 178px;
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 28px;
          background: var(--glass);
          backdrop-filter: blur(22px) saturate(1.1);
          box-shadow: 0 16px 42px rgba(24, 63, 50, 0.09);
          transition:
            transform 0.45s var(--ease),
            box-shadow 0.45s var(--ease),
            border-color 0.45s var(--ease);
        }

        .lawtech-public-home .glass-card:hover {
          transform: translateY(-6px);
          border-color: rgba(24, 63, 50, 0.22);
          box-shadow: 0 26px 58px rgba(24, 63, 50, 0.14);
        }

        .lawtech-public-home .glass-card h2 {
          margin: 18px 0 12px;
          font-size: 28px;
          letter-spacing: -0.04em;
        }

        .lawtech-public-home .glass-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.75;
        }

        @media (max-width: 900px) {
          .lawtech-public-home .hero {
            grid-template-columns: 1fr;
          }

          .lawtech-public-home .section-grid {
            grid-template-columns: 1fr;
          }

          .lawtech-public-home .nav {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

HomePage.layout = 'bare'
