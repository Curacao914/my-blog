export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/desk/today',
      permanent: false
    }
  }
}

export default function ActivePage() {
  return null
}
