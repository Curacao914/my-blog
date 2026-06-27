import { archiveDirectory, categoryDirectory, tagDirectory } from '@/lib/content/directory'

const items = [
  {
    id: 'a',
    title: '课程笔记',
    date: '2026-06-27T10:00:00.000Z',
    category: '遇事不决',
    tags: ['公法', '研一上'],
    folder: { path: ['遇事不决', '经济法'] },
    access: { mode: 'public' }
  },
  {
    id: 'b',
    title: '文章',
    date: '2025-05-01T10:00:00.000Z',
    category: '法律之上',
    tags: ['公法'],
    folder: { path: ['法律之上', '文章'] },
    access: { mode: 'public' }
  }
]

describe('public directory grouping', () => {
  it('groups one merged content index by category, tag, and year', () => {
    expect(categoryDirectory(items).map(group => group.label)).toEqual(['遇事不决', '法与算法', '法律之上', '秘密花园'])
    expect(tagDirectory(items)[0]).toMatchObject({ label: '公法', count: 2 })
    expect(archiveDirectory(items).map(group => group.label)).toEqual(['2026', '2025'])
  })

  it('builds canonical category and tag routes', () => {
    expect(categoryDirectory(items).find(group => group.label === '遇事不决').href).toBe('/category/%E9%81%87%E4%BA%8B%E4%B8%8D%E5%86%B3')
    expect(tagDirectory(items).find(group => group.label === '研一上').href).toBe('/tag/%E7%A0%94%E4%B8%80%E4%B8%8A')
  })
})
