import { collectContentTaxonomy } from '@/lib/content/taxonomy'

describe('content taxonomy', () => {
  it('collects database, snapshot, and current publishing values with category-scoped collections', () => {
    expect(collectContentTaxonomy([
      {
        settings: {
          category: '遇事不决',
          collection: '经济法',
          tags: ['课程笔记', '经济法']
        }
      },
      {
        display: { category: '法律之上', tags: ['论文', '经济法'] },
        folder: { path: ['法律之上', '专题论文'] }
      }
    ])).toEqual({
      categories: ['法律之上', '遇事不决'],
      collections: ['经济法', '专题论文'],
      collectionsByCategory: {
        法律之上: ['专题论文'],
        遇事不决: ['经济法']
      },
      tags: ['经济法', '课程笔记', '论文']
    })
  })
})
