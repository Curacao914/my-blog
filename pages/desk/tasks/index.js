import Head from 'next/head'

import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { TodayBoard } from '@/components/TodayBoard'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function TasksPage() {
  return <>
    <Head><title>事项 · law-tech.dev</title></Head>
    <DeskShell active='tasks' title='事项' kicker='Tasks'>
      <section className='desk-module-intro'>
        <div><span>Tasks</span><h2>全部事项</h2></div>
      </section>
      <TodayBoard initialView='all' />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
TasksPage.layout = 'bare'
export const getServerSideProps = requireDeskPage({ permission: 'schedule' })
