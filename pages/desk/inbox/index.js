import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { TodayBoard } from '@/components/TodayBoard'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export default function InboxPage() {
  return (
    <>
      <Head>
        <title>随手记 · law-tech.dev</title>
      </Head>
      <DeskShell active='inbox' title='随手记' kicker='Capture'>
        <TodayBoard />
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

InboxPage.layout = 'bare'
