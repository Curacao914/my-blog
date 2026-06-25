import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function PublishPage() {
  return (
    <>
      <Head>
        <title>内容设置 · law-tech.dev</title>
      </Head>
      <DeskShell active='publish' title='内容设置' kicker='Access'>
        <p className='lede'>公开、私密、密码和有效期。</p>
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

PublishPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
