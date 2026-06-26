import Head from 'next/head'
import { DeskProductPanel } from '@/components/DeskProductPanel'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function PublishPage() {
  return <>
    <Head><title>内容设置 · law-tech.dev</title></Head>
    <DeskShell active='publish' title='内容设置' kicker='Publishing'>
      <DeskProductPanel
        icon='publish'
        eyebrow='Publishing desk'
        title='把完成的内容，体面地送到外面。'
        description='公开范围、密码、有效期和展示信息集中处理；内容本身仍然留在原来的写作与笔记流程中。'
        primary={{ label: '查看公开内容', href: '/content' }}
        secondary={{ label: '进入写作', href: '/desk/writing' }}
        stats={[{ label: '访问方式', value: '公开 / 密码 / 私密' }, { label: '发布原则', value: '先预览，再公开' }]}
        cards={[
          { icon: 'content', title: '展示信息', body: '标题、摘要、封面和链接结构在发布前统一检查。', meta: '对外页面保持清楚', tone: 'blue' },
          { icon: 'publish', title: '访问控制', body: '公开、私密、密码和有效期有明确边界。', meta: '技术设置翻译成人话', tone: 'leaf' },
          { icon: 'search', title: '预览检查', body: '发布前核对桌面与移动端的实际阅读效果。', meta: '避免上线后才发现版式事故', tone: 'honey' }
        ]}
      />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
PublishPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
