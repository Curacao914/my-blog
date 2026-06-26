import Head from 'next/head'
import { DeskProductPanel } from '@/components/DeskProductPanel'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function TasksPage() {
  return <>
    <Head><title>事项 · law-tech.dev</title></Head>
    <DeskShell active='tasks' title='事项' kicker='Tasks'>
      <DeskProductPanel
        icon='tasks'
        eyebrow='Plans & commitments'
        title='所有事情有全貌，今天只看今天。'
        description='事项用于组织长期任务、提醒和计划；Today 只承担当下执行，二者互相连接但不互相挤占。'
        primary={{ label: '查看今日', href: '/desk/today' }}
        secondary={{ label: '快速记录', href: '/desk/inbox' }}
        stats={[{ label: '当前视角', value: '长期任务库' }, { label: '每日执行', value: '交给 Today' }]}
        cards={[
          { icon: 'tasks', title: '清单', body: '按项目、状态和日期组织任务，避免一张列表塞进全部人生。', meta: '适合梳理长期安排', tone: 'leaf' },
          { icon: 'today', title: '日程', body: '有明确日期和时间的行动进入时间轴，阅读材料本身留在阅读箱。', meta: '任务与资料各归其位', tone: 'blue' },
          { icon: 'spark', title: '四象限', body: '重要与紧急是观察视角，不是另一套重复数据。', meta: '同一事项，多种查看方式', tone: 'honey' }
        ]}
      />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
TasksPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
