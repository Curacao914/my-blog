import Head from 'next/head'
import { DeskProductPanel } from '@/components/DeskProductPanel'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

export default function SystemPage() {
  return <>
    <Head><title>系统 · law-tech.dev</title></Head>
    <DeskShell active='system' title='系统' kicker='Settings'>
      <DeskProductPanel
        icon='system'
        eyebrow='Workspace settings'
        title='配置安静地工作，不必天天露面。'
        description='模型接口、通知、权限和同步状态集中在这里。普通选项放在前面，技术诊断只有需要时才展开。'
        primary={{ label: '返回今日', href: '/desk/today' }}
        secondary={{ label: '课程整理', href: '/desk/courses' }}
        stats={[{ label: '服务状态', value: '按需检测' }, { label: '密钥显示', value: '始终脱敏' }]}
        cards={[
          { icon: 'spark', title: '服务', body: 'OCR、写作与数据连接使用统一的小状态灯。', meta: '异常时才打扰你', tone: 'leaf' },
          { icon: 'system', title: '偏好', body: '外观、快捷操作与默认行为保持集中、可理解。', meta: '高级设置默认收起', tone: 'blue' },
          { icon: 'publish', title: '安全', body: '权限、分享与敏感配置有清楚的危险边界。', meta: '不回显完整密钥', tone: 'honey' }
        ]}
      />
    </DeskShell>
    <LawTechDeskStyles />
  </>
}
SystemPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
