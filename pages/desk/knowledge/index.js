import Head from 'next/head'

import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { KnowledgeDesk } from '@/components/knowledge/KnowledgeDesk'
import { KnowledgeStyles } from '@/components/knowledge/KnowledgeStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function KnowledgePage() {
  return (
    <>
      <Head><title>轻知识 · law-tech.dev</title></Head>
      <DeskShell active='knowledge' title='轻知识' kicker='Questions · Connections'>
        <KnowledgeDesk />
      </DeskShell>
      <LawTechDeskStyles />
      <KnowledgeStyles />
    </>
  )
}

KnowledgePage.layout = 'bare'
export const getServerSideProps = requireDeskPage({ permission: 'knowledge' })
