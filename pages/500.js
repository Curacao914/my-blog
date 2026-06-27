import { PublicStatusPage } from '@/components/law-tech/PublicStatusPage'

export default function Custom500() {
  return <PublicStatusPage
    code='500'
    title='页面暂时没有加载成功。'
    description='服务遇到了一次意外。稍后重新打开通常就能恢复；公开内容与私人工作台的数据不会因此被删除。'
    primary={{ label: '回到首页', href: '/' }}
    secondary={{ label: '查看内容库', href: '/content' }}
    noIndex
  />
}
Custom500.layout = 'bare'
