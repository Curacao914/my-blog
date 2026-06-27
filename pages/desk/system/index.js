import Head from 'next/head'

import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { SystemDesk } from '@/components/SystemDesk'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function SystemPage() {
  return <>
    <Head><title>系统 · law-tech.dev</title></Head>
    <DeskShell active='system' title='系统' kicker='Settings'>
      <SystemDesk />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
SystemPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
