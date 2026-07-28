import Head from 'next/head'
import { useRouter } from 'next/router'

import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { KnowledgeDetail } from '@/components/knowledge/KnowledgeDetail'
import { KnowledgeStyles } from '@/components/knowledge/KnowledgeStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function KnowledgeDetailPage() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  return (
    <>
      <Head><title>轻知识 · law-tech.dev</title></Head>
      <DeskShell active='knowledge' title='轻知识' kicker='Read · Refine'>
        <KnowledgeDetail id={id} />
      </DeskShell>
      <LawTechDeskStyles />
      <KnowledgeStyles />
    </>
  )
}

KnowledgeDetailPage.layout = 'bare'
export const getServerSideProps = requireDeskPage({ permission: 'knowledge' })
