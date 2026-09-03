export default function LegacyCategoryPage() { return null }
export async function getServerSideProps({ params }) {
  return { redirect: { destination: `/category/${encodeURIComponent(params.category)}`, permanent: true } }
}
