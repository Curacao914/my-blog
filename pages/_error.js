import { PublicStatusPage } from '@/components/law-tech/PublicStatusPage'

export default function ErrorPage({ statusCode }) {
  const missing = Number(statusCode) === 404
  return <PublicStatusPage
    code={String(statusCode || 500)}
    title={missing ? '这里没有这一页。' : '页面暂时没有加载成功。'}
    description={missing ? '地址可能已经变化，也可能还没有公开。' : '稍后重新打开通常就能恢复；已有内容不会因此被删除。'}
    primary={{ label: '回到首页', href: '/' }}
    secondary={{ label: '搜索内容', href: '/search' }}
    noIndex
  />
}
ErrorPage.getInitialProps = ({ res, err }) => ({ statusCode: res ? res.statusCode : err ? err.statusCode : 500 })
ErrorPage.layout = 'bare'
