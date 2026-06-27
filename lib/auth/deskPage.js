import { hasAdminAllowlist, isAdminUser } from '@/lib/auth/admin'
import {
  allowLocalDeskFallback,
  getAdminCandidate,
  isClerkConfigured,
  isHostedEnvironment
} from '@/lib/auth/serverAdmin'

export function requireDeskPage() {
  return async function getServerSideProps(ctx) {
    if (!isClerkConfigured())
      return allowLocalDeskFallback() ? { props: {} } : { notFound: true }
    if (isHostedEnvironment() && !hasAdminAllowlist()) return { notFound: true }
    const { userId, user, authStatus, authRedirectUrl } = await getAdminCandidate(ctx.req)
    if (authStatus === 'handshake' && authRedirectUrl) {
      return { redirect: { destination: authRedirectUrl, permanent: false } }
    }
    if (authStatus === 'error') return { notFound: true }
    if (!userId) {
      const next = encodeURIComponent(ctx.resolvedUrl || '/desk/today')
      return {
        redirect: {
          destination: `/sign-in?redirect_url=${next}`,
          permanent: false
        }
      }
    }
    if (!isAdminUser(user)) return { notFound: true }
    return { props: {} }
  }
}
