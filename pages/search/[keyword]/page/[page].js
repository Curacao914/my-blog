export default function LegacySearchPage() { return null }
export async function getServerSideProps({ params }) {
  return { redirect: { destination: `/search?q=${encodeURIComponent(params.keyword || '')}`, permanent: true } }
}
