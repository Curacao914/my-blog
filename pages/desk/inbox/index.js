import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { NotesDesk } from '@/components/NotesDesk'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function InboxPage() {
  return (
    <>
      <Head>
        <title>随手记 · law-tech.dev</title>
      </Head>
      <DeskShell active='inbox' title='随手记' kicker='Drafts'>
        <NotesDesk />
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

InboxPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
