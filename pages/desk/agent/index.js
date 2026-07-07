import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { AgentCommandLane } from '@/components/AgentCommandLane'
import { getWorkspaceSession } from '@/lib/auth/serverAdmin'

export default function AgentCommandLanePage() {
  return (
    <>
      <Head>
        <title>Agent Command Lane · law-tech.dev</title>
      </Head>
      <LawTechDeskStyles />
      <DeskShell active='agent' title='Agent' kicker='Command preview'>
        <AgentCommandLane />
      </DeskShell>
    </>
  )
}

AgentCommandLanePage.layout = 'bare'

export async function getServerSideProps(ctx) {
  const session = await getWorkspaceSession(ctx.req)
  if (session.code === 'handshake' && session.redirectUrl) {
    return { redirect: { destination: session.redirectUrl, permanent: false } }
  }
  if (session.code === 'signed_out') {
    const next = encodeURIComponent(ctx.resolvedUrl || '/desk/agent')
    return { redirect: { destination: `/sign-in?redirect_url=${next}`, permanent: false } }
  }
  if (session.code === 'access_pending') {
    return { redirect: { destination: '/access-pending', permanent: false } }
  }
  if (session.code === 'access_suspended') {
    return { redirect: { destination: '/access-suspended', permanent: false } }
  }
  if (!session.ok || !session.isOwner || session.impersonating) return { notFound: true }
  return {
    props: {
      workspaceSession: {
        actor: session.publicActor,
        profile: session.publicProfile,
        isOwner: session.isOwner,
        impersonating: session.impersonating
      }
    }
  }
}
