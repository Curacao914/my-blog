import Head from 'next/head'

import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { WritingDesk } from '@/components/WritingDesk'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function WritingPage() {
  return <>
    <Head><title>写作 · law-tech.dev</title></Head>
    <DeskShell active='writing' title='写作' kicker='Writing'>
      <WritingDesk />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
WritingPage.layout = 'bare'
export const getServerSideProps = requireDeskPage({ permission: 'writing' })
