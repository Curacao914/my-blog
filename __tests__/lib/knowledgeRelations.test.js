import {
  scoreKnowledgeRelation,
  suggestKnowledgeRelations
} from '@/lib/knowledge/relations'

describe('deterministic knowledge relations', () => {
  const source = {
    id: 'source',
    title: '平台算法责任如何成立',
    domain: '平台治理',
    topic: '算法责任',
    tags: ['平台', '责任', '证据'],
    state: 'exploring'
  }

  it('scores explicit shared tags and domain above loose title overlap', () => {
    const close = scoreKnowledgeRelation(source, {
      id: 'close',
      title: '平台责任中的举证问题',
      domain: '平台治理',
      topic: '举证责任',
      tags: ['平台', '证据']
    })
    const loose = scoreKnowledgeRelation(source, {
      id: 'loose',
      title: '算法艺术观察',
      domain: '艺术',
      tags: []
    })

    expect(close.score).toBeGreaterThan(loose.score)
    expect(close.reasons).toEqual(expect.arrayContaining(['同领域', '共同标签：平台、证据']))
  })

  it('returns bounded stable suggestions and excludes self or archived entries', () => {
    const suggestions = suggestKnowledgeRelations(source, [
      source,
      { ...source, id: 'archived', state: 'archived' },
      { id: 'b', title: '平台证据', domain: '平台治理', tags: ['证据'] },
      { id: 'a', title: '平台治理', domain: '平台治理', tags: ['平台'] },
      { id: 'unrelated', title: '做饭', domain: '生活', tags: [] }
    ], { limit: 2 })

    expect(suggestions).toHaveLength(2)
    expect(suggestions.map(item => item.targetId)).toEqual(['a', 'b'])
    expect(suggestions.every(item => item.score > 0)).toBe(true)
  })
})
