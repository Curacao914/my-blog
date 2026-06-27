import { PublicStatusPage } from '@/components/law-tech/PublicStatusPage'

export default function SharePage() {
  return <PublicStatusPage
    code='Shared link'
    title='这条分享链接暂时不可用。'
    description='分享访问仍在整理中。页面不会展示令牌或内部标识；公开内容可以先从内容库进入。'
    primary={{ label: '查看内容库', href: '/content' }}
    secondary={{ label: '回到首页', href: '/' }}
    noIndex
  />
}
SharePage.layout = 'bare'
export async function getServerSideProps() { return { props: {} } }
