export async function getServerSideProps() {
  return {
    redirect: {
      destination: 'https://course.law-tech.dev/_auth/start?next=%2F',
      permanent: false
    }
  }
}

export default function ArchivedCoursesPage() {
  return null
}
