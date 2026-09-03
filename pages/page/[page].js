export default function LegacyPageList() { return null }
export async function getServerSideProps() {
  return { redirect: { destination: '/content', permanent: true } }
}
