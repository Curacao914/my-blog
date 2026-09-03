// pages/sitemap.xml.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'
import { getServerSideSitemap } from 'next-sitemap'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  publicContentDate,
  publicContentHref,
  selectSitemapPublicContent
} from '@/lib/content/publicContent'

export const getServerSideProps = async ctx => {
  let fields = []
  let publicLink = normalizeLink(BLOG.LINK)
  const siteIds = BLOG.NOTION_PAGE_ID.split(',')

  for (let index = 0; index < siteIds.length; index++) {
    const siteId = siteIds[index]
    const id = extractLangId(siteId)
    const locale = extractLangPrefix(siteId)
    // 第一个id站点默认语言
    const siteData = await fetchGlobalAllData({
      pageId: id,
      from: 'sitemap.xml'
    })
    const link = normalizeLink(siteConfig(
      'LINK',
      siteData?.siteInfo?.link,
      siteData.NOTION_CONFIG
    ))
    if (index === 0 && link) publicLink = link
    const localeFields = generateLocalesSitemap(link, siteData.allPages, locale)
    fields = fields.concat(localeFields)
  }

  try {
    const { items } = await loadPublicContentIndex({ from: 'sitemap-public-content' })
    fields = fields.concat(generatePublicContentSitemap(publicLink, items))
  } catch (error) {
    console.warn('[sitemap] public content index failed; keeping Notion routes', error)
  }

  fields = getUniqueFields(fields)

  // 缓存
  ctx.res.setHeader(
    'Cache-Control',
    'public, max-age=3600, stale-while-revalidate=59'
  )
  return getServerSideSitemap(ctx, fields)
}

function generateLocalesSitemap(link, allPages, locale) {
  // 确保链接不以斜杠结尾
  if (link && link.endsWith('/')) {
    link = link.slice(0, -1)
  }

  if (locale && locale.length > 0 && locale.indexOf('/') !== 0) {
    locale = '/' + locale
  }
  const dateNow = new Date().toISOString().split('T')[0]
  const defaultFields = [
    {
      loc: `${link}${locale}`,
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: `${link}${locale}/content`,
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.9'
    },
    {
      loc: `${link}${locale}/search`,
      lastmod: dateNow,
      changefreq: 'weekly',
      priority: '0.6'
    },
    {
      loc: `${link}${locale}/archive`,
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: `${link}${locale}/category`,
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: `${link}${locale}/rss/feed.xml`,
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: `${link}${locale}/tag`,
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    }
  ]
  const postFields =
    allPages
      ?.filter(p => p.status === BLOG.NOTION_PROPERTY_NAME.status_publish)
      ?.map(post => {
        const slugWithoutLeadingSlash = post?.slug.startsWith('/')
          ? post?.slug?.slice(1)
          : post.slug
        return {
          loc: `${link}${locale}/${slugWithoutLeadingSlash}`,
          lastmod: safeIsoDate(post?.publishDay || post?.publishDate || post?.lastEditedDate).split('T')[0],
          changefreq: 'daily',
          priority: '0.7'
        }
      }) ?? []

  return defaultFields.concat(postFields)
}

function normalizeLink(value) {
  const link = String(value || 'law-tech.dev').trim()
  const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`
  return normalized.replace(/\/+$/, '')
}

function safeIsoDate(value) {
  const date = new Date(value || Date.now())
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function generatePublicContentSitemap(link, items = []) {
  return selectSitemapPublicContent(items)
    .filter(item => item.source !== 'notion')
    .map(item => ({
      loc: new URL(publicContentHref(item), `${normalizeLink(link)}/`).toString(),
      lastmod: safeIsoDate(publicContentDate(item)),
      changefreq: 'weekly',
      priority: item.display?.pinned ? '0.9' : '0.8'
    }))
}

function getUniqueFields(fields) {
  const uniqueFieldsMap = new Map();

  fields.forEach(field => {
    const existingField = uniqueFieldsMap.get(field.loc);

    if (!existingField || new Date(field.lastmod) > new Date(existingField.lastmod)) {
      uniqueFieldsMap.set(field.loc, field);
    }
  });

  return Array.from(uniqueFieldsMap.values());
}

export default () => {}
