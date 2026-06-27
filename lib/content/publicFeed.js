import BLOG from '@/blog.config'
import { Feed } from 'feed'

import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  publicContentCategory,
  publicContentDate,
  publicContentHref,
  publicContentTags,
  selectRssPublicContent
} from '@/lib/content/publicContent'

export function publicSiteUrl() {
  const configured = String(process.env.NEXT_PUBLIC_LINK || BLOG.LINK || 'law-tech.dev').trim()
  const withProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`
  return withProtocol.replace(/\/+$/, '')
}

function absoluteUrl(pathname, siteUrl) {
  try {
    return new URL(pathname, `${siteUrl}/`).toString()
  } catch (error) {
    return siteUrl
  }
}

export async function createPublicFeed() {
  const siteUrl = publicSiteUrl()
  const { items } = await loadPublicContentIndex({ from: 'public-rss' })
  const feedItems = selectRssPublicContent(items, 30)
  const year = new Date().getFullYear()
  const feed = new Feed({
    title: 'Curacao · law-tech.dev',
    description: 'Curacao 的文章、课程笔记、读书记录与项目记录。',
    id: siteUrl,
    link: siteUrl,
    language: 'zh-CN',
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${year}, Curacao`,
    feedLinks: {
      rss2: `${siteUrl}/rss/feed.xml`,
      atom: `${siteUrl}/rss/atom.xml`,
      json: `${siteUrl}/rss/feed.json`
    },
    author: {
      name: 'Curacao',
      link: siteUrl
    }
  })

  feedItems.forEach(item => {
    const link = absoluteUrl(publicContentHref(item), siteUrl)
    const publishedAt = new Date(publicContentDate(item) || Date.now())
    const date = Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt

    feed.addItem({
      title: item.title || '未命名内容',
      id: link,
      link,
      description: item.summary || '',
      content: item.summary || '',
      category: [publicContentCategory(item), ...publicContentTags(item)].filter(Boolean).map(name => ({ name })),
      date,
      author: [{ name: 'Curacao', link: siteUrl }]
    })
  })

  return feed
}

export async function servePublicFeed(ctx, format) {
  const feed = await createPublicFeed()
  const body = format === 'atom'
    ? feed.atom1()
    : format === 'json'
      ? feed.json1()
      : feed.rss2()
  const contentType = format === 'json'
    ? 'application/feed+json; charset=utf-8'
    : format === 'atom'
      ? 'application/atom+xml; charset=utf-8'
      : 'application/rss+xml; charset=utf-8'

  ctx.res.setHeader('Content-Type', contentType)
  ctx.res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400')
  ctx.res.write(body)
  ctx.res.end()

  return { props: {} }
}
