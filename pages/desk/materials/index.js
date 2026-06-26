import Head from 'next/head'
import { DeskProductPanel } from '@/components/DeskProductPanel'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function MaterialsPage() {
  return <>
    <Head><title>材料 · law-tech.dev</title></Head>
    <DeskShell active='materials' title='材料' kicker='Materials'>
      <DeskProductPanel
        icon='materials'
        eyebrow='Research library'
        title='让材料有去处，也有来路。'
        description='文件、网页、图片与课件都可以在这里汇集；解析状态、课程归属和引用关系保持清楚。'
        primary={{ label: '导入课程资料', href: '/desk/courses' }}
        secondary={{ label: '打开阅读箱', href: '/desk/reading' }}
        stats={[{ label: '整理原则', value: '来源可追溯' }, { label: '文件处理', value: '原件优先留在本地' }]}
        cards={[
          { icon: 'materials', title: '资料入口', body: '把等待处理的文件、链接和扫描材料集中到一处。', meta: '支持课程、阅读与写作场景', tone: 'blue' },
          { icon: 'courses', title: '课程归档', body: '多份材料可以归入同一课次，一份课件也能跨课次分段。', meta: '保留页码、行号与人工确认', tone: 'leaf' },
          { icon: 'writing', title: '引用关系', body: '材料被哪篇笔记或文章使用，一眼即可回到来源。', meta: '为后续写作留好路径', tone: 'honey' }
        ]}
      />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
MaterialsPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
