import { buildClerkProps, getAuth } from '@clerk/nextjs/server'

import { authRedirectFromQuery } from '@/lib/auth/redirect'

export function authPageServerProps(fallback = '/desk/today') {
  return async function getServerSideProps(ctx) {
    const redirectTo = authRedirectFromQuery(ctx.query, fallback)
    const { userId } = getAuth(ctx.req)

    if (userId) {
      return {
        redirect: {
          destination: redirectTo,
          permanent: false
        }
      }
    }

    return {
      props: {
        ...buildClerkProps(ctx.req),
        redirectTo
      }
    }
  }
}
