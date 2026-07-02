export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/desk/materials',
      permanent: false
    }
  }
}

export default function LibraryPage() {
  return null
}
