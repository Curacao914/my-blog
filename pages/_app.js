// import '@/styles/animate.css' // @see https://animate.style/
import '@/styles/globals.css'
import '@/styles/utility-patterns.css'

// core styles shared by all of react-notion-x (required)
import 'react-notion-x/src/styles.css' // 原版的 react-notion-x
import '@/styles/notion.css' // 在原版之后覆盖阅读样式
import '@/styles/lawtech-system.css'

import useAdjustStyle from '@/hooks/useAdjustStyle'
import { primeWorkspaceSession } from '@/hooks/useWorkspaceSession'
import { GlobalContextProvider } from '@/lib/global'
import { getBaseLayoutByTheme } from '@/themes/theme'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useCallback, useMemo } from 'react'
import { getQueryParam } from '../lib/utils'

// 各种扩展插件 这个要阻塞引入
import BLOG from '@/blog.config'
import ExternalPlugins from '@/components/ExternalPlugins'
import SEO from '@/components/SEO'
import { zhCN } from '@clerk/localizations'
import { ClerkProvider } from '@clerk/nextjs'

// 【核心新增 1】：引入我们刚刚自己写的 React 原生聊天挂件
import NativeDifyChat from '@/components/NativeDifyChat'
import { CourseTaskProvider } from '@/components/CourseTaskManager'
import { SystemWindowProvider } from '@/components/law-tech/SystemWindowManager'


/**
 * App挂载DOM 入口文件
 * @param {*} param0
 * @returns
 */
const MyApp = ({ Component, pageProps }) => {
  if (typeof window !== 'undefined') {
    primeWorkspaceSession(pageProps?.workspaceSession)
  }

  // 一些可能出现 bug 的样式，可以统一放入该钩子进行调整
  useAdjustStyle()

  const route = useRouter()
  const notionTheme = pageProps?.NOTION_CONFIG?.THEME
  const theme = useMemo(() => {
    return getQueryParam(route.asPath, 'theme') || notionTheme || BLOG.THEME
  }, [route.asPath, notionTheme])

  // 整体布局
  const GLayout = useCallback(
    props => {
      const Layout = getBaseLayoutByTheme(theme)
      return <Layout {...props} />
    },
    [theme]
  )

  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const useBareLayout = Component.layout === 'bare'
  const content = useBareLayout ? (
    <Component {...pageProps} />
  ) : (
    <GlobalContextProvider {...pageProps}>
      <GLayout {...pageProps}>
        <SEO {...pageProps} />
        <Component {...pageProps} />
      </GLayout>
      <ExternalPlugins {...pageProps} />

      {/* 【核心新增 2】：将聊天挂件放置在最外层，确保它悬浮在所有主题之上 */}
      <NativeDifyChat />
    </GlobalContextProvider>
  )

  const clerkContent = enableClerk ? (
    <ClerkProvider
      localization={zhCN}
      __unstable_invokeMiddlewareOnAuthStateChange={false}>
      {content}
    </ClerkProvider>
  ) : (
    content
  )
  const isAuthRoute =
    route.pathname.startsWith('/sign-in') ||
    route.pathname.startsWith('/sign-up')

  const routedContent = isAuthRoute ? (
    clerkContent
  ) : (
    <CourseTaskProvider>
      <SystemWindowProvider>{clerkContent}</SystemWindowProvider>
    </CourseTaskProvider>
  )

  return <>
    <Head>
      <link rel='alternate' type='application/rss+xml' title='Curacao · RSS' href='/rss/feed.xml' />
      <link rel='alternate' type='application/atom+xml' title='Curacao · Atom' href='/rss/atom.xml' />
      <link rel='alternate' type='application/feed+json' title='Curacao · JSON Feed' href='/rss/feed.json' />
    </Head>
    {routedContent}
  </>
}

export default MyApp
