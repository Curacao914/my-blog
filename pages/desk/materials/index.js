import Head from 'next/head'
import { CourseNotesLibrary } from '@/components/CourseNotesLibrary'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function MaterialsPage() {
  return <>
    <Head><title>笔记库 · law-tech.dev</title></Head>
    <DeskShell active='materials' title='笔记库' kicker='Notes Library'>
      <CourseNotesLibrary />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}

MaterialsPage.layout = 'bare'
export const getServerSideProps = requireDeskPage({ permission: 'courses' })
