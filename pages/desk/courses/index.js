import Head from 'next/head'
import { CourseTextPackDesk } from '@/components/CourseTextPackDesk'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function CoursesPage() {
  return (
    <>
      <Head>
        <title>课程整理 · law-tech.dev</title>
      </Head>
      <DeskShell active='courses' title='课程整理' kicker='Course Workflow'>
        <CourseTextPackDesk />
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

CoursesPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
