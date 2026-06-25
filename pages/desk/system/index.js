import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function SystemPage() {
  return (
    <>
      <Head>
        <title>系统 · law-tech.dev</title>
      </Head>
      <DeskShell active='system' title='系统' kicker='Settings'>
        <p className='lede'>
          模型接口、通知方式、快捷指令、微信入口、权限和同步状态集中在这里。配置服务于工作流，不反过来支配页面。
        </p>
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

SystemPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
