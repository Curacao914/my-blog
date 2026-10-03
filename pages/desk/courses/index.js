export async function getServerSideProps() {
  return {
    redirect: {
      destination: 'https://course.law-tech.dev/',
      permanent: false
    }
  }
}

export default function ArchivedCoursesPage() {
  return null
}
