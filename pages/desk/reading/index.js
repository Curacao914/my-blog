import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { ReadingBox } from '@/components/ReadingBox'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function ReadingPage() {
  return (
    <>
      <Head>
        <title>阅读箱 · law-tech.dev</title>
      </Head>
      <DeskShell active='reading' title='阅读箱' kicker='Reading'>
        <ReadingBox />
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

ReadingPage.layout = 'bare'
export const getServerSideProps = requireDeskPage({ permission: 'reading' })
