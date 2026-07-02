function resultDestination(status) {
  return `/auth/result?${new URLSearchParams({ status }).toString()}`
}

export default function LegacyAuthCallbackPage() { return null }

export async function getServerSideProps() {
  return {
    redirect: {
      destination: resultDestination('unavailable'),
      permanent: false
    }
  }
}
