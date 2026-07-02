import Head from 'next/head'
import Link from 'next/link'

export default function AccessSuspendedPage() {
  return <>
    <Head><title>权限已暂停 · law-tech.dev</title><meta name='robots' content='noindex,nofollow' /></Head>
    <main className='workspace-suspended-state'>
      <section>
        <span>Workspace access</span>
        <h1>这个工作区暂时不可用</h1>
        <p>管理员已经暂停了当前账号的工作台权限。你的私人数据不会因此公开；恢复权限后仍会回到自己的工作区。</p>
        <div><Link href='/'>返回站点</Link><Link href='/sign-in'>切换账号</Link></div>
      </section>
    </main>
    <style jsx global>{`
      html,body,#__next{min-height:100%}body{margin:0}.workspace-suspended-state,.workspace-suspended-state *{box-sizing:border-box}.workspace-suspended-state{min-height:100dvh;display:grid;place-items:center;padding:28px;color:#17231d;background:#f7f6f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}.workspace-suspended-state section{width:min(520px,100%);border:1px solid rgba(255,255,255,.82);border-radius:34px;padding:42px;text-align:center;background:rgba(255,255,255,.7);box-shadow:0 28px 90px rgba(24,54,43,.1)}.workspace-suspended-state span{color:#8b6d3d;font-size:11px;letter-spacing:.16em;text-transform:uppercase}.workspace-suspended-state h1{margin:12px 0;font-family:Georgia,"Songti SC",serif;font-size:34px}.workspace-suspended-state p{margin:0;color:#68736e;line-height:1.85}.workspace-suspended-state div{display:flex;justify-content:center;gap:10px;margin-top:26px}.workspace-suspended-state a{border:1px solid rgba(17,63,49,.1);border-radius:999px;padding:10px 16px;color:#173f32;background:#fff;text-decoration:none;font-weight:650}
    `}</style>
  </>
}

AccessSuspendedPage.layout = 'bare'
