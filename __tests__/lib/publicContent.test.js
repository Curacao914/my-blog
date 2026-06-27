import {
  filterPublicContent,
  publicContentHref,
  selectRecentPublicContent,
  selectRssPublicContent,
  selectSitemapPublicContent
} from '@/lib/content/publicContent'

const items = [
  {
    slug: 'notes/course/lesson-1',
    title: '平台治理',
    summary: '经济法课程笔记',
    type: 'course-note',
    date: '2026-06-27T10:00:00.000Z',
    folder: { path: ['遇事不决', '经济法'] },
    display: { tags: ['公法', '课程笔记'], showInRecent: true, pinned: false },
    access: { mode: 'public', allowRss: true, allowSitemap: true, allowIndexing: true }
  },
  {
    slug: 'pinned',
    href: '/article/pinned',
    title: '置顶文章',
    summary: 'Notion 文章',
    type: 'article',
    date: '2026-06-20T10:00:00.000Z',
    category: '法律之上',
    collection: '文章',
    display: { tags: ['论文'], showInRecent: true, pinned: true },
    access: { mode: 'public', allowRss: true, allowSitemap: true, allowIndexing: true }
  },
  {
    slug: 'hidden-recent',
    title: '不进入最近',
    date: '2026-06-28T10:00:00.000Z',
    display: { showInRecent: false },
    access: { mode: 'public', allowRss: false, allowSitemap: false, allowIndexing: true }
  },
  {
    slug: 'password-note',
    title: '密码内容',
    date: '2026-06-29T10:00:00.000Z',
    display: { showInRecent: true },
    access: { mode: 'password', allowRss: true, allowSitemap: true, allowIndexing: true }
  }
]

describe('unified public content discovery', () => {
  it('searches title, summary, hierarchy and tags across sources', () => {
    expect(filterPublicContent(items, { query: '经济法' }).map(item => item.slug)).toEqual([
      'notes/course/lesson-1'
    ])
    expect(filterPublicContent(items, { query: '公法' })).toHaveLength(1)
    expect(filterPublicContent(items, { category: '法律之上' })).toHaveLength(1)
  })

  it('orders pinned recent items first and respects showInRecent', () => {
    expect(selectRecentPublicContent(items).map(item => item.slug)).toEqual([
      'pinned',
      'password-note',
      'notes/course/lesson-1'
    ])
  })

  it('keeps password and opted-out content out of RSS and sitemap', () => {
    expect(selectRssPublicContent(items).map(item => item.slug)).toEqual([
      'pinned',
      'notes/course/lesson-1'
    ])
    expect(selectSitemapPublicContent(items).map(item => item.slug)).toEqual([
      'pinned',
      'notes/course/lesson-1'
    ])
  })

  it('preserves legacy Notion hrefs and builds new content hrefs', () => {
    expect(publicContentHref(items[0])).toBe('/content/notes/course/lesson-1')
    expect(publicContentHref(items[1])).toBe('/article/pinned')
  })
})
