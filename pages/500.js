import Head from 'next/head'
import Link from 'next/link'

export default function Custom500() {
  return (
    <>
      <Head>
        <title>服务暂时不可用 · law-tech.dev</title>
      </Head>
      <main className='error-page'>
        <section>
          <small>500</small>
          <h1>服务器内部错误</h1>
          <p>页面暂时没有成功加载，请稍后重试。</p>
          <Link href='/'>回到首页</Link>
        </section>
      </main>
      <style jsx>{`
        .error-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #f7f9f8;
          color: #1e2322;
        }
        section {
          width: min(420px, 100%);
          padding: 36px;
          border: 1px solid #dfe7e1;
          border-radius: 28px;
          background: white;
          box-shadow: 0 20px 70px rgba(37, 55, 48, 0.08);
        }
        small {
          color: #c99a3b;
          letter-spacing: 0.14em;
        }
        h1 {
          margin: 12px 0 8px;
          font-size: 26px;
        }
        p {
          margin: 0 0 22px;
          color: #66716b;
          line-height: 1.7;
        }
        a {
          color: #315a8c;
          text-decoration: none;
        }
      `}</style>
    </>
  )
}

Custom500.layout = 'bare'
