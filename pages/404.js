import { PublicStatusPage } from '@/components/law-tech/PublicStatusPage'

export default function NotFoundPage() {
  return <PublicStatusPage
    code='404'
    title='这里没有这一页。'
    description='地址可能已经变化，也可能还没有公开。可以回到内容库继续浏览，或者直接搜索站内内容。'
    primary={{ label: '回到首页', href: '/' }}
    secondary={{ label: '搜索内容', href: '/search' }}
    noIndex
  />
}
NotFoundPage.layout = 'bare'
