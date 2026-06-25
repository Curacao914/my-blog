import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { TodayBoard } from '@/components/TodayBoard'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export default function TodayPage() {
  return (
    <>
      <Head>
        <title>今日 · law-tech.dev</title>
      </Head>
      <DeskShell active='today' title='今日' kicker='Workspace'>
        <TodayBoard />
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

TodayPage.layout = 'bare'
