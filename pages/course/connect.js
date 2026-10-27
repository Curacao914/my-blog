import { useAuth } from '@clerk/nextjs'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

// The browser's Clerk session is authoritative for client navigation.
// The SSO API independently verifies the token before signing any Course ticket.
export default function ConnectCourse() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [status, setStatus] = useState('正在验证登录状态…')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const next = typeof router.query.next === 'string' && /^\/(?!\/)/.test(router.query.next)
    ? router.query.next : '/'

  useEffect(() => {
    if (!router.isReady || !isLoaded) return
    if (!isSignedIn) {
      window.location.replace('/sign-in?redirect_url=' + encodeURIComponent('/course/connect?next=' + encodeURIComponent(next)))
      return
    }
    let cancelled = false
    const controller = new AbortController()
    ;(async () => {
      try {
        setError('')
        setStatus('正在建立课程空间会话…')
        const clerkToken = await getToken()
        if (!clerkToken) throw new Error('无法取得已登录的会话令牌')
        const result = await fetch('/api/course/sso?next=' + encodeURIComponent(next) + '&response=json', {
          method: 'GET',
          headers: { authorization: 'Bearer ' + clerkToken, accept: 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal
        })
        const payload = await result.json().catch(() => ({}))
        if (!result.ok) throw new Error(payload.error || '课程身份核验失败（HTTP ' + result.status + '）')
        if (typeof payload.redirect !== 'string' || !payload.redirect.startsWith('https://course.law-tech.dev/_auth/callback?token=')) {
          throw new Error('课程登录回调地址不合法')
        }
        if (!cancelled) window.location.replace(payload.redirect)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '连接失败')
          setStatus('暂时未能进入课程空间')
        }
      }
    })()
    return () => { cancelled = true; controller.abort() }
  }, [router.isReady, isLoaded, isSignedIn, getToken, next, attempt])

  return (
    <main style={{maxWidth:520,margin:'18vh auto',padding:'32px 28px',fontFamily:'system-ui,-apple-system,sans-serif',lineHeight:1.8}}>
      <Head><title>连接课程空间 · law-tech.dev</title><meta name='robots' content='noindex' /></Head>
      <p style={{fontSize:14,color:'#71817a',marginBottom:6}}>LAW-TECH.DEV</p>
      <h1 style={{fontSize:24,margin:'0 0 12px'}}>连接课程空间</h1>
      <p>{status}</p>
      {error && <p role='alert' style={{color:'#a32c22'}}>{error}</p>}
      {error && <button type='button' onClick={() => setAttempt(value => value + 1)}>重新验证</button>}
      <p><Link href='/desk/today'>返回工作台</Link></p>
    </main>
  )
}
