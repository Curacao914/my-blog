import { canonicalAuthRedirect } from '@/lib/auth/canonicalOrigin'
import { authRedirectFromQuery } from '@/lib/auth/redirect'

export function authPageServerProps(fallback = '/desk/today') {
  return async function getServerSideProps(ctx) {
    const canonical = canonicalAuthRedirect(ctx.req, ctx.resolvedUrl || '/sign-in')
    if (canonical) {
      return { redirect: { destination: canonical, permanent: false } }
    }

    return {
      props: {
        redirectTo: authRedirectFromQuery(ctx.query, fallback)
      }
    }
  }
}
