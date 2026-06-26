import Head from 'next/head'
import { DeskProductPanel } from '@/components/DeskProductPanel'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function WritingPage() {
  return <>
    <Head><title>写作 · law-tech.dev</title></Head>
    <DeskShell active='writing' title='写作' kicker='Writing'>
      <DeskProductPanel
        icon='writing'
        eyebrow='Writing room'
        title='从材料关系开始，而不是从空白页开始。'
        description='选题、草稿、引用材料和公开文章在同一个写作房间里推进；灵感可以来自随手记，依据可以回到材料库。'
        primary={{ label: '打开随手记', href: '/desk/inbox' }}
        secondary={{ label: '查看公开内容', href: '/content' }}
        stats={[{ label: '写作路径', value: '灵感 → 材料 → 草稿' }, { label: '保存方式', value: '持续保存与版本记录' }]}
        cards={[
          { icon: 'inbox', title: '选题与碎片', body: '随手记中的一句话可以继续长成提纲和草稿。', meta: '不让灵感被表单劝退', tone: 'honey' },
          { icon: 'materials', title: '材料侧栏', body: '写作时随时查看来源、摘录和课程笔记。', meta: '正文与依据保持相邻', tone: 'blue' },
          { icon: 'publish', title: '发布准备', body: '完成后再处理公开范围、摘要和展示信息。', meta: '写作与发布分开完成', tone: 'leaf' }
        ]}
      />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
WritingPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
