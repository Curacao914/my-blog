import Head from 'next/head'

import { CourseNoteReader } from '@/components/CourseNoteReader'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function CourseNoteReaderPage({ jobId, lessonKey }) {
  return <>
    <Head><title>阅读课程笔记 · law-tech.dev</title></Head>
    <DeskShell active='materials' title='阅读笔记' kicker='Notes Reader'>
      <CourseNoteReader jobId={jobId} lessonKey={lessonKey} />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}

CourseNoteReaderPage.layout = 'bare'

export const getServerSideProps = async context => {
  const auth = await requireDeskPage()(context)
  if (!auth.props) return auth
  return {
    props: {
      ...auth.props,
      jobId: String(context.params?.jobId || ''),
      lessonKey: String(context.params?.lessonKey || '')
    }
  }
}
