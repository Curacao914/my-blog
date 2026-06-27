import {
  groupContentByCollection,
  mergeContentIndexes,
  mergeContentPaths
} from '@/lib/contentHierarchy'

describe('content hierarchy and source compatibility', () => {
  it('groups content as category -> collection -> item', () => {
    const groups = groupContentByCollection([
      { slug: 'a', folder: { path: ['遇事不决', '经济法'] } },
      { slug: 'b', folder: { path: ['遇事不决', '经济法'] } },
      { slug: 'c', folder: { path: ['法律之上', '论文'] } }
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      category: '遇事不决',
      collection: '经济法'
    })
    expect(groups[0].items).toHaveLength(2)
  })

  it('merges database content over matching legacy snapshots without hiding unrelated legacy items', () => {
    const merged = mergeContentIndexes(
      [{ slug: 'legacy-a', title: '旧文章' }, { slug: 'same', title: '旧版本' }],
      [{ slug: 'same', title: '数据库版本' }, { slug: 'new-a', title: '新内容' }]
    )
    expect(merged.map(item => item.slug).sort()).toEqual(['legacy-a', 'new-a', 'same'])
    expect(merged.find(item => item.slug === 'same').title).toBe('数据库版本')
  })

  it('keeps both legacy and database static paths', () => {
    const paths = mergeContentPaths(
      [{ params: { slug: ['legacy-a'] } }],
      [{ slug: 'notes/course/lesson-1' }]
    )
    expect(paths.map(item => item.params.slug.join('/')).sort()).toEqual([
      'legacy-a',
      'notes/course/lesson-1'
    ])
  })
})
