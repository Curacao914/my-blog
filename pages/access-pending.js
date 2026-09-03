import Head from 'next/head'
import Link from 'next/link'

export default function AccessPendingPage() {
  return <>
    <Head><title>等待权限 · law-tech.dev</title><meta name='robots' content='noindex,nofollow' /></Head>
    <main className='workspace-access-state'>
      <section>
        <img alt='' src='/curacao-avatar.png' />
        <span>Access request</span>
        <h1>申请已经收到</h1>
        <p>你的账号已经完成注册，管理员批准后就能进入自己的私人工作区。这里不会显示其他人的日程、笔记或 API 设置。</p>
        <div><Link href='/'>返回站点</Link><Link href='/sign-in'>切换账号</Link></div>
      </section>
    </main>
    <style jsx global>{accessStateStyles}</style>
  </>
}

const accessStateStyles = `
html,body,#__next{min-height:100%}body{margin:0}.workspace-access-state,.workspace-access-state *{box-sizing:border-box}.workspace-access-state{min-height:100dvh;display:grid;place-items:center;padding:28px;color:#17231d;background:radial-gradient(circle at 18% 12%,rgba(214,174,83,.16),transparent 28rem),radial-gradient(circle at 85% 12%,rgba(92,145,158,.14),transparent 25rem),#f7f6f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}.workspace-access-state section{width:min(520px,100%);display:grid;justify-items:center;border:1px solid rgba(255,255,255,.82);border-radius:34px;padding:42px;text-align:center;background:rgba(255,255,255,.66);box-shadow:0 28px 90px rgba(24,54,43,.1);backdrop-filter:blur(24px)}.workspace-access-state img{width:74px;height:74px;border-radius:24px;image-rendering:pixelated}.workspace-access-state span{margin-top:22px;color:#6d7a73;font-size:11px;letter-spacing:.16em;text-transform:uppercase}.workspace-access-state h1{margin:10px 0 12px;font-family:Georgia,"Songti SC",serif;font-size:34px}.workspace-access-state p{max-width:420px;margin:0;color:#68736e;line-height:1.85}.workspace-access-state div{display:flex;gap:10px;margin-top:26px}.workspace-access-state a{border:1px solid rgba(17,63,49,.1);border-radius:999px;padding:10px 16px;color:#173f32;background:rgba(255,255,255,.7);text-decoration:none;font-weight:650}
`

AccessPendingPage.layout = 'bare'
