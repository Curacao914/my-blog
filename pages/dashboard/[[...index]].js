export default function LegacyDashboard() { return null }
export async function getServerSideProps() {
  return { redirect: { destination: '/desk/today', permanent: false } }
}
