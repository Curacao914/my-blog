import {
  buildDefaultFolderDrafts,
  descendantFolderIds,
  effectiveFolderId,
  folderBreadcrumbs,
  isReadingFolder,
  readingKind
} from '@/lib/reading/library'

describe('reading library folders', () => {
  const folders = [
    {
      id: 'root-course',
      title: '课程简报',
      aiTrace: {
        entityType: 'reading-folder',
        systemKey: 'course-briefs',
        parentFolderId: ''
      }
    },
    {
      id: 'course-a',
      title: '国际法学',
      aiTrace: {
        entityType: 'reading-folder',
        parentFolderId: 'root-course'
      }
    },
    {
      id: 'wechat',
      title: '公众号文章',
      aiTrace: {
        entityType: 'reading-folder',
        systemKey: 'public-articles',
        parentFolderId: ''
      }
    }
  ]

  it('bootstraps only missing default folders', () => {
    const drafts = buildDefaultFolderDrafts(folders)
    expect(drafts.map(item => item.aiTrace.systemKey)).toEqual([
      'other-reading',
      'reading-inbox'
    ])
    expect(drafts.every(isReadingFolder)).toBe(true)
  })

  it('classifies course briefs and public articles deterministically', () => {
    const brief = {
      contentType: 'reading',
      aiTrace: { readingKind: 'course-brief' }
    }
    const article = {
      contentType: 'reading',
      links: [{ url: 'https://mp.weixin.qq.com/s/example' }]
    }
    expect(readingKind(brief)).toBe('course-brief')
    expect(readingKind(article)).toBe('public-article')
    expect(effectiveFolderId(brief, folders)).toBe('root-course')
    expect(effectiveFolderId(article, folders)).toBe('wechat')
  })

  it('builds descendants and breadcrumbs without crossing folders', () => {
    expect([...descendantFolderIds(folders, 'root-course')]).toEqual([
      'course-a'
    ])
    expect(
      folderBreadcrumbs(folders, 'course-a').map(item => item.title)
    ).toEqual(['课程简报', '国际法学'])
  })
})
