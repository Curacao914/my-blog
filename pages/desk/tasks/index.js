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
        <div><span>Task library</span><h2>全部事项</h2><p>这里查看长期任务、未来安排与四象限；回到“今日”时，只保留现在需要执行的部分。</p></div>
      </section>
      <TodayBoard initialView='all' />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
TasksPage.layout = 'bare'
export const getServerSideProps = requireDeskPage({ permission: 'schedule' })
