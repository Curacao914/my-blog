import Head from 'next/head'
import { PublicHeader } from '@/components/law-tech/PublicHeader'

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>关于 · Curacao</title>
      </Head>
      <main className='public-page lawtech-public-home'>
        <div className='shell'>
          <PublicHeader />
          <section className='page-pad'>
            <span className='eyebrow'>About</span>
            <h1 className='page-title'>关于</h1>
            <p className='lede'>
              Curacao。前非法本法学生，现法硕非法学生。这个站点会记录一些法学学习、写作、技术小工具和还没完全想明白的问题。
            </p>
          </section>
        </div>
      </main>
      <style jsx global>{`
        .lawtech-public-home {
          --paper: #f7f6f1;
          --ink: #17231d;
          --muted: #69756f;
          --leaf: #183f32;
          --honey: #d7a43d;
          --blue: #8daab7;
          --line: rgba(23, 35, 29, 0.12);
          --shadow: 0 24px 80px rgba(24, 63, 50, 0.14);
          --ease: cubic-bezier(0.16, 1, 0.3, 1);
          min-height: 100vh;
          padding: 28px 0 72px;
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

        .lawtech-public-home a {
          color: inherit;
          text-decoration: none;
        }

        .lawtech-public-home .shell {
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

        .lawtech-public-home .brand,
        .lawtech-public-home .nav {
          display: flex;
          align-items: center;
        }

        .lawtech-public-home .brand {
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
          gap: 6px;
        }

        .lawtech-public-home .nav a {
          border-radius: 999px;
          padding: 10px 14px;
          color: var(--muted);
          transition:
            transform 0.35s var(--ease),
            background 0.35s var(--ease),
            color 0.35s var(--ease);
        }

        .lawtech-public-home .nav a:hover {
          transform: translateY(-2px);
          color: var(--ink);
          background: rgba(24, 63, 50, 0.08);
        }

        .lawtech-public-home .page-pad {
          padding: 56px 0;
        }

        .lawtech-public-home .eyebrow {
          color: var(--leaf);
          font-size: 13px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .lawtech-public-home .page-title {
          margin: 18px 0 20px;
          max-width: 760px;
          font-size: clamp(38px, 5.4vw, 78px);
          line-height: 1.02;
          letter-spacing: -0.055em;
        }

        .lawtech-public-home .lede {
          max-width: 620px;
          color: var(--muted);
          font-size: 19px;
          line-height: 1.9;
        }

        @media (max-width: 900px) {
          .lawtech-public-home .nav {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

AboutPage.layout = 'bare'
