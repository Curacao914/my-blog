import { SignIn, SignUp } from '@clerk/nextjs'
import Head from 'next/head'
import Link from 'next/link'

function ClerkAuthFlow({ mode, redirectTo }) {
  if (mode === 'sign-up') {
    return (
      <SignUp
        forceRedirectUrl={redirectTo}
        path='/sign-up'
        routing='path'
        signInForceRedirectUrl={redirectTo}
        signInUrl={`/sign-in?redirect_url=${encodeURIComponent(redirectTo)}`}
      />
    )
  }

  return (
    <SignIn
      forceRedirectUrl={redirectTo}
      path='/sign-in'
      routing='path'
      signUpForceRedirectUrl={redirectTo}
      signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(redirectTo)}`}
    />
  )
}

export function AuthPage({ mode = 'sign-in', redirectTo = '/desk/today' }) {
  const isSignUp = mode === 'sign-up'
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  return (
    <>
      <Head>
        <title>{isSignUp ? '注册并申请权限' : '登录'} · law-tech.dev</title>
        <meta name='robots' content='noindex,nofollow' />
      </Head>

      <main className='auth-page'>
        <Link className='brand' href='/'>
          law-tech.dev
        </Link>
        <section className='auth-card'>
          <div className='copy'>
            <p>law-tech.dev</p>
            <h1>{isSignUp ? '注册并申请工作区权限' : '登录工作台'}</h1>
            <span className='auth-explainer'>{isSignUp ? '注册后，管理员会根据授权邮箱或申请状态开放你的私人工作区。' : '登录后进入仅属于当前账号的日程、笔记、课程与设置。'}</span>
          </div>
          {clerkEnabled ? (
            <ClerkAuthFlow mode={mode} redirectTo={redirectTo} />
          ) : (
            <div className='auth-unavailable'>
              <strong>{isSignUp ? '注册' : '登录'}服务未配置</strong>
              <span>
                请在 Vercel Preview 中补充 Clerk 环境变量后再进入工作台。
              </span>
            </div>
          )}
        </section>
      </main>

      <style jsx global>{`
        html,
        body,
        #__next {
          min-height: 100%;
        }

        body {
          margin: 0;
        }

        .auth-page,
        .auth-page *,
        .auth-page *::before,
        .auth-page *::after {
          box-sizing: border-box;
        }

        .auth-page {
          position: relative;
          width: 100%;
          height: 100dvh;
          min-height: 100svh;
          display: grid;
          place-items: center;
          overflow: auto;
          padding: 88px 20px 40px;
          color: #1e2322;
          background:
            radial-gradient(
              circle at 20% 12%,
              rgba(201, 154, 59, 0.12),
              transparent 22rem
            ),
            radial-gradient(
              circle at 85% 16%,
              rgba(49, 90, 140, 0.1),
              transparent 18rem
            ),
            linear-gradient(180deg, #fcfefd 0%, #f7f9f8 100%);
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .auth-page .brand {
          position: absolute;
          top: 28px;
          left: 32px;
          color: #66716b;
          font-size: 14px;
          font-weight: 720;
          letter-spacing: -0.03em;
          text-decoration: none;
        }

        .auth-page .auth-card {
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

        .auth-page .copy p {
          margin: 0 0 14px;
          color: #c99a3b;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .auth-page .auth-explainer { display:block; margin-top:10px; color:#66716b; font-size:13px; line-height:1.65; }

        .auth-page .copy h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.04em;
        }

        .auth-page .auth-unavailable {
          display: grid;
          gap: 8px;
          min-height: 76px;
          place-items: center;
          padding: 18px;
          border: 1px solid #dfe7e1;
          border-radius: 20px;
          background: rgba(247, 249, 248, 0.78);
          color: #66716b;
          line-height: 1.6;
          text-align: center;
        }

        .auth-page .auth-unavailable strong {
          color: #1e2322;
        }

        .auth-page .cl-rootBox,
        .auth-page .cl-cardBox {
          width: 100%;
        }

        @media (max-width: 640px) {
          .auth-page {
            align-items: start;
            padding: 76px 14px 24px;
          }

          .auth-page .brand {
            top: 22px;
            left: 20px;
          }

          .auth-page .auth-card {
            padding: 18px;
            border-radius: 26px;
          }
        }
      `}</style>
    </>
  )
}
