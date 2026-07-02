import Head from 'next/head'

import { CourseBriefReader } from '@/components/CourseBriefReader'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function CourseBriefReaderPage({ jobId, lessonKey }) {
  return <>
    <Head><title>阅读课程简报 · law-tech.dev</title></Head>
    <DeskShell active='materials' title='课程简报' kicker='Course Brief'>
      <CourseBriefReader jobId={jobId} lessonKey={lessonKey} />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}

CourseBriefReaderPage.layout = 'bare'

export const getServerSideProps = async context => {
  const auth = await requireDeskPage({ permission: 'courses' })(context)
  if (!auth.props) return auth
  return {
    props: {
      ...auth.props,
      jobId: String(context.params?.jobId || ''),
      lessonKey: String(context.params?.lessonKey || '')
    }
  }
}
