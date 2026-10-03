export async function getServerSideProps() {
  return {
    redirect: {
      destination: 'https://course.law-tech.dev/admin',
      permanent: false
    }
  }
}

export default function ArchivedCoursesPage() {
  return null
}
