import { getAuth } from '@clerk/nextjs/server'

export function requireDeskPage() {
  return async function getServerSideProps(ctx) {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      return { props: {} }
    }

    const { userId } = getAuth(ctx.req)
    if (userId) return { props: {} }

    const next = encodeURIComponent(ctx.resolvedUrl || '/desk/today')
    return {
      redirect: {
        destination: `/sign-in?redirect_url=${next}`,
        permanent: false
      }
    }
  }
}
