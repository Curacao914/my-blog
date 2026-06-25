import { NextRequest, NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

/**
 * NotionNext 兼容中间件
 *
 * 登录鉴权不放在 middleware 层：
 * - 公开 NotionNext 路由不能因为 Clerk 配置问题被拖垮。
 * - `/desk` 在 getServerSideProps 中做登录检查。
 * - 私有 API 在各自 handler 中通过 requireAdminRequest 检查 Clerk 或 token。
 */
export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/']
}

/**
 * 没有配置权限相关功能的返回
 * @param req
 * @param ev
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
const notionCompatibilityMiddleware = async (req: NextRequest) => {
  // 如果没有配置 Clerk 相关环境变量，返回一个默认响应或者继续处理请求
  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const response = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (response.ok) {
        redirectJson = (await response.json()) as Record<string, string>
      }
    } catch (err) {
      console.error('Error fetching static file:', err)
    }
    let lastPart = getLastPartOfUrl(req.nextUrl.pathname) as string
    if (checkStrIsNotionId(lastPart)) {
      lastPart = idToUuid(lastPart)
    }
    if (lastPart && redirectJson[lastPart]) {
      const redirectToUrl = req.nextUrl.clone()
      redirectToUrl.pathname = '/' + redirectJson[lastPart]
      console.log(
        `redirect from ${req.nextUrl.pathname} to ${redirectToUrl.pathname}`
      )
      return NextResponse.redirect(redirectToUrl, 308)
    }
  }
  return NextResponse.next()
}

const hasClerkMiddlewareConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
)

const privatePrefixes = [
  '/desk',
  '/api/schedule/items',
  '/api/notes',
  '/api/content/config',
  '/api/courses',
  '/api/tasks/'
]

function needsClerkMiddleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path === '/api/tasks/inbox' || path.startsWith('/api/tasks/inbox/')) return false
  if (path === '/api/tasks/capture') return false
  if (path === '/api/tasks/reminders/send') return false
  return privatePrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

const clerkPrivateMiddleware = hasClerkMiddlewareConfig
  ? clerkMiddleware(async (_auth, req) => notionCompatibilityMiddleware(req as NextRequest))
  : null

export default function middleware(req: NextRequest, event: any) {
  if (clerkPrivateMiddleware && needsClerkMiddleware(req)) {
    return clerkPrivateMiddleware(req, event)
  }
  return notionCompatibilityMiddleware(req)
}
