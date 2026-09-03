import { useRouter } from 'next/router'

import { PublicStatusPage } from '@/components/law-tech/PublicStatusPage'

const states = {
  invalid: {
    code: 'Invalid request',
    title: '授权请求无效。',
    description: '缺少必要的授权信息，请从原来的连接入口重新开始。'
  },
  unavailable: {
    code: 'Unavailable',
    title: '授权服务尚未配置。',
    description: '这个旧连接入口目前没有启用。公开内容与私人工作台仍可正常使用。'
  },
  error: {
    code: 'Not connected',
    title: '这次授权没有完成。',
    description: '可以稍后重试；现有文章与工作台数据不会因此发生变化。'
  }
}

export default function AuthResultPage() {
  const router = useRouter()
  const status = String(router.query?.status || 'invalid')
  const state = states[status] || states.invalid
  return <PublicStatusPage
    code={state.code}
    title={state.title}
    description={state.description}
    primary={{ label: '进入工作台', href: '/desk' }}
    secondary={{ label: '回到首页', href: '/' }}
    noIndex
  />
}
AuthResultPage.layout = 'bare'
