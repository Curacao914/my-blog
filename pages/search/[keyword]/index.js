export async function getServerSideProps({ params }) {
  const keyword = String(params?.keyword || '').trim()
  const destination = keyword
    ? `/search?q=${encodeURIComponent(keyword)}`
    : '/search'

  return {
    redirect: {
      destination,
      permanent: false
    }
  }
}

export default function LegacySearchRedirect() {
  return null
}
