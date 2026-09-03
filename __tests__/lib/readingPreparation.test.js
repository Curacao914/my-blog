import {
  prepareReadingLibraryItems
} from '@/lib/reading/prepare'
import {
  folderSystemKey,
  isReadingFolder,
  readingTrace
} from '@/lib/reading/library'

const ids = [
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000003',
  '70000000-0000-4000-8000-000000000004'
]

function legacyReadingItem() {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    title: '待读长文章',
    section: '阅读',
    sectionKey: 'reading',
    contentType: 'reading',
    date: 'reading',
    status: 'active',
    source: 'wechat',
    links: [{ title: '原文', url: 'https://example.com/article' }],
    aiTrace: {}
  }
}

describe('reading library preparation', () => {
  it('creates valid folder ids before migrating legacy items in one batch', () => {
    let index = 0
    const prepared = prepareReadingLibraryItems(
      [legacyReadingItem()],
      () => ids[index++]
    )

    const folders = prepared.items.filter(isReadingFolder)
    const inbox = folders.find(folder => folderSystemKey(folder) === 'reading-inbox')
    const article = prepared.items.find(item => item.id === legacyReadingItem().id)

    expect(prepared.changed).toBe(true)
    expect(folders).toHaveLength(4)
    expect(inbox.id).toBe(ids[3])
    expect(readingTrace(article).folderId).toBe(ids[3])
  })

  it('is idempotent after the first persisted preparation', () => {
    let index = 0
    const first = prepareReadingLibraryItems(
      [legacyReadingItem()],
      () => ids[index++]
    )
    const second = prepareReadingLibraryItems(first.items, () => {
      throw new Error('should not create another folder')
    })

    expect(second.changed).toBe(false)
    expect(second.items).toEqual(first.items)
  })
})
