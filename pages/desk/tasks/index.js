import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function TasksPage() {
  return (
    <>
      <Head>
        <title>事项 · law-tech.dev</title>
      </Head>
      <DeskShell active='tasks' title='事项' kicker='Tasks'>
        <div className='empty-panel'>
          <h2>事项</h2>
          <p>任务、提醒和日程。</p>
        </div>
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

TasksPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
