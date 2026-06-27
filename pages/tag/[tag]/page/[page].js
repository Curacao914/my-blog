export default function LegacyTagPage() { return null }
export async function getServerSideProps({ params }) {
  return { redirect: { destination: `/tag/${encodeURIComponent(params.tag)}`, permanent: true } }
}
