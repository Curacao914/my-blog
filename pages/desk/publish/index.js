import Head from 'next/head'

import { ContentPublishingDesk } from '@/components/ContentPublishingDesk'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function PublishPage() {
  return <>
    <Head><title>内容发布 · law-tech.dev</title></Head>
    <DeskShell active='publish' title='内容发布' kicker='Publishing'>
      <ContentPublishingDesk />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}

PublishPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
