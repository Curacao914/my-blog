import { getWorkspaceSession } from '@/lib/auth/serverAdmin'

export function requireDeskPage(options = {}) {
  return async function getServerSideProps(ctx) {
    const session = await getWorkspaceSession(ctx.req)
    if (session.code === 'handshake' && session.redirectUrl) {
      return { redirect: { destination: session.redirectUrl, permanent: false } }
    }
    if (session.code === 'signed_out') {
      const next = encodeURIComponent(ctx.resolvedUrl || '/desk/today')
      return {
        redirect: {
          destination: `/sign-in?redirect_url=${next}`,
          permanent: false
        }
      }
    }
    if (session.code === 'access_pending') {
      return { redirect: { destination: '/access-pending', permanent: false } }
    }
    if (session.code === 'access_suspended') {
      return { redirect: { destination: '/access-suspended', permanent: false } }
    }
    if (!session.ok) return { notFound: true }
    if (options.permission) {
      const allowed = session.profile?.role === 'owner' || session.publicProfile?.permissions?.[options.permission]
      if (!allowed) return { notFound: true }
    }
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
}
