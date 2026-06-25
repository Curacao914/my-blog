function hasSessionCookie(req) {
  const cookie = req.headers.cookie || ''
  return /(?:^|;\s*)__session=/.test(cookie) || /(?:^|;\s*)__clerk_db_jwt=/.test(cookie)
}

export function requireDeskPage() {
  return async function getServerSideProps(ctx) {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
      return { props: {} }
    }

    if (hasSessionCookie(ctx.req)) return { props: {} }

    const next = encodeURIComponent(ctx.resolvedUrl || '/desk/today')
    return {
      redirect: {
        destination: `/sign-in?redirect_url=${next}`,
        permanent: false
      }
    }
  }
}
