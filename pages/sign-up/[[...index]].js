import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'

const SignUp = dynamic(() => import('@clerk/nextjs').then(mod => mod.SignUp), {
  ssr: false
})

function AuthUnavailable() {
  return (
    <div className='auth-unavailable'>
      <strong>注册服务未配置</strong>
      <span>请在 Vercel Preview 中补充 Clerk 环境变量后再使用注册入口。</span>
    </div>
  )
}

const SignUpPage = () => {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  return (
    <>
      <Head>
        <title>注册 · law-tech.dev</title>
        <meta name='robots' content='noindex,nofollow' />
      </Head>

      <main className='auth-page'>
        <Link className='brand' href='/'>
          law-tech.dev
        </Link>
        <section className='auth-card'>
          <div className='copy'>
            <p>工作台</p>
            <h1>工作台</h1>
          </div>
          {clerkEnabled ? (
            <SignUp
              fallbackRedirectUrl='/desk'
              forceRedirectUrl='/desk'
              path='/sign-up'
              routing='path'
              signInUrl='/sign-in'
            />
          ) : (
            <AuthUnavailable />
          )}
        </section>
      </main>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 20px;
          color: #1e2322;
          background:
            radial-gradient(circle at 20% 12%, rgba(201, 154, 59, 0.12), transparent 22rem),
            radial-gradient(circle at 85% 16%, rgba(49, 90, 140, 0.1), transparent 18rem),
            linear-gradient(180deg, #fcfefd 0%, #f7f9f8 100%);
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .brand {
          position: fixed;
          top: 28px;
          left: 32px;
          color: #66716b;
          font-size: 14px;
          font-weight: 720;
          letter-spacing: -0.03em;
        }

        .auth-card {
          width: min(520px, 100%);
          display: grid;
          gap: 24px;
          align-items: center;
          padding: 28px;
          border: 1px solid rgba(223, 231, 225, 0.9);
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 24px 80px rgba(37, 55, 48, 0.08);
          backdrop-filter: blur(22px);
        }

        .copy p {
          margin: 0 0 14px;
          color: #c99a3b;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .copy h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.04em;
        }

        .auth-unavailable {
          display: grid;
          gap: 8px;
          padding: 18px;
          border: 1px solid #dfe7e1;
          border-radius: 20px;
          background: rgba(247, 249, 248, 0.78);
          color: #66716b;
          line-height: 1.6;
        }

        .auth-unavailable strong {
          color: #1e2322;
        }
      `}</style>
    </>
  )
}

SignUpPage.layout = 'bare'

export default SignUpPage
