import Head from 'next/head'
import Link from 'next/link'

const NotFoundPage = () => {
  return (
    <>
      <Head>
        <title>页面不存在 · law-tech.dev</title>
        <meta name='robots' content='noindex,nofollow' />
      </Head>

      <main className='not-found'>
        <section>
          <p>404</p>
          <h1>这里暂时没有内容。</h1>
          <Link href='/'>回到首页</Link>
        </section>
      </main>

      <style jsx>{`
        .not-found {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #1e2322;
          background: #f7f9f8;
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        section {
          width: min(460px, 100%);
          padding: 30px;
          border: 1px solid #dfe7e1;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 22px 70px rgba(37, 55, 48, 0.07);
        }

        p {
          margin: 0 0 12px;
          color: #c99a3b;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0 0 22px;
          font-size: 26px;
          line-height: 1.25;
          letter-spacing: -0.04em;
        }

        a {
          color: #315a8c;
        }
      `}</style>
    </>
  )
}

NotFoundPage.layout = 'bare'

export default NotFoundPage
