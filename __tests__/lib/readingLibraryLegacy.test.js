import {
  buildDefaultFolderDrafts,
  folderName,
  migrateLegacyReadingItems
} from '@/lib/reading/library'

describe('legacy reading filing', () => {
  const folders = [
    {
      id: 'unclassified',
      title: '待整理',
      aiTrace: {
        entityType: 'reading-folder',
        systemKey: 'reading-inbox'
      }
    },
    {
      id: 'articles',
      title: '公众号文章',
      aiTrace: {
        entityType: 'reading-folder',
        systemKey: 'public-articles'
      }
    }
  ]

  it('shows the renamed system folder as 未分类', () => {
    expect(folderName(folders[0])).toBe('未分类')
  })

  it('persists every historical item without folderId in 未分类', () => {
    const legacy = {
      id: 'legacy-reading',
      contentType: 'reading',
      source: 'wechat',
      links: [{ url: 'https://mp.weixin.qq.com/s/demo' }],
      aiTrace: {}
    }
    const result = migrateLegacyReadingItems([
      ...folders,
      legacy
    ])
    expect(result.changed).toBe(true)
    expect(
      result.items.find(item => item.id === legacy.id)
        .aiTrace.folderId
    ).toBe('unclassified')
  })

  it('creates a 未分类 default folder for new workspaces', () => {
    const drafts = buildDefaultFolderDrafts([])
    expect(
      drafts.find(item =>
        item.aiTrace.systemKey === 'reading-inbox'
      )?.title
    ).toBe('未分类')
  })
})
