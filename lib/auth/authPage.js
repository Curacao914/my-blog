import { authRedirectFromQuery } from '@/lib/auth/redirect'

export function authPageServerProps(fallback = '/desk/today') {
  return async function getServerSideProps(ctx) {
    return {
      props: {
        redirectTo: authRedirectFromQuery(ctx.query, fallback)
      }
    }
  }
}
