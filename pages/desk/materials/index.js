import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function MaterialsPage() {
  return (
    <>
      <Head>
        <title>材料 · law-tech.dev</title>
      </Head>
      <DeskShell active='materials' title='材料' kicker='Materials'>
        <div className='empty-panel'>
          <h2>文件、链接、图片和课件</h2>
          <p>材料入口。</p>
        </div>
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

MaterialsPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
