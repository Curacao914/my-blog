import Head from 'next/head'
import Link from 'next/link'

const tools = [
  {
    name: 'OCR',
    href: 'https://law-tech.dev/ocr/',
    status: '可用',
    scene: '把扫描件、截图、PDF 里的文字取出来。',
    note: '适合临时处理材料。'
  },
  {
    name: '引注',
    href: 'https://law-tech.dev/citation/',
    status: '可用',
    scene: '整理论文、作业、读书笔记里的引用格式。',
    note: '写东西时顺手用。'
  }
]

const ToolsPage = () => {
  return (
    <>
      <Head>
        <title>工具 · law-tech.dev</title>
        <meta
          name='description'
          content='Curacao 的工具入口：OCR、引注、课程整理和内容发布。'
        />
        <meta name='theme-color' content='#f7f9f8' />
      </Head>

      <div className='tools-page'>
        <div className='wrap'>
          <nav className='top-nav' aria-label='主导航'>
            <Link className='brand' href='/'>
              law-tech.dev
            </Link>
            <div className='nav-links'>
              <Link href='/content'>内容</Link>
              <Link href='/#projects'>项目</Link>
              <Link href='/tools'>工具</Link>
              <Link href='/#about'>关于</Link>
              <Link className='desk-link' href='/desk'>
                工作台
              </Link>
            </div>
          </nav>

          <main className='main'>
            <section className='hero'>
              <p className='eyebrow'>Tools</p>
              <h1>一些顺手的小工具。</h1>
              <p className='lead'>
                不做工具箱大全。先放确实会用到的，够用、好找、别打扰首页。
              </p>
            </section>

            <section className='tool-shelf' aria-label='工具列表'>
              {tools.map(tool => (
                <Link className='tool-card' href={tool.href} key={tool.name}>
                  <div className='card-head'>
                    <h2>{tool.name}</h2>
                    <span>{tool.status}</span>
                  </div>
                  <p>{tool.scene}</p>
                  <small>{tool.note}</small>
                </Link>
              ))}
            </section>

          </main>
        </div>
      </div>

      <style jsx>{`
        .tools-page {
          --bg: #f7f9f8;
          --ink: #1e2322;
          --muted: #66716b;
          --quiet: #87938c;
          --line: #dfe7e1;
          --green: #3f5f3a;
          --blue: #315a8c;
          --gold: #c99a3b;
          min-height: 100vh;
          color: var(--ink);
          background:
            radial-gradient(
              circle at 82% 8%,
              rgba(49, 90, 140, 0.08),
              transparent 18rem
            ),
            radial-gradient(
              circle at 8% 18%,
              rgba(201, 154, 59, 0.1),
              transparent 20rem
            ),
            linear-gradient(180deg, #fcfefd 0%, var(--bg) 100%);
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .wrap {
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

        .desk-link {
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          color: var(--blue);
        }

        .main {
          padding: 48px 0 92px;
        }

        .hero {
          max-width: 760px;
          margin-bottom: 52px;
        }

        .eyebrow {
          margin: 0 0 16px;
          color: var(--gold);
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: clamp(32px, 5vw, 56px);
          line-height: 1.12;
          letter-spacing: -0.06em;
          max-width: 780px;
        }

        .lead {
          margin-top: 22px;
          color: #58645e;
          font-size: 16px;
          line-height: 1.85;
          max-width: 680px;
        }

        .tool-shelf {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .tool-card {
          min-height: 190px;
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 18px 52px rgba(37, 55, 48, 0.045);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .tool-card:hover {
          transform: translateY(-3px);
          border-color: rgba(63, 95, 58, 0.25);
          box-shadow: 0 22px 60px rgba(37, 55, 48, 0.07);
        }

        .card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .card-head h2 {
          font-size: 28px;
          letter-spacing: -0.05em;
        }

        .card-head span {
          flex: 0 0 auto;
          border: 1px solid rgba(49, 90, 140, 0.16);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--blue);
          background: rgba(49, 90, 140, 0.055);
          font-size: 12px;
        }

        .tool-card p {
          margin-top: 26px;
          color: #4f5b55;
          font-size: 16px;
          line-height: 1.75;
        }

        .tool-card small {
          display: block;
          margin-top: 18px;
          color: var(--quiet);
          font-size: 13px;
          line-height: 1.65;
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

          .tool-shelf {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}

ToolsPage.layout = 'bare'

export default ToolsPage
