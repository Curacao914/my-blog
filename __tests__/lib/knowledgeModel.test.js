import {
  KNOWLEDGE_KIND_LABELS,
  KNOWLEDGE_KINDS,
  KNOWLEDGE_REVIEW_STATUSES,
  KNOWLEDGE_STATE_LABELS,
  KNOWLEDGE_STATES,
  buildKnowledgeSearchText,
  mapKnowledgeRecord,
  normalizeKnowledgeDraft
} from '@/lib/knowledge/model'

describe('light knowledge domain model', () => {
  it('exports the supported knowledge enums with Chinese labels', () => {
    expect(KNOWLEDGE_KINDS).toEqual([
      'question',
      'concept',
      'idea',
      'fact',
      'observation',
      'quote',
      'connection'
    ])
    expect(KNOWLEDGE_STATES).toEqual(['exploring', 'active', 'archived'])
    expect(KNOWLEDGE_REVIEW_STATUSES).toEqual(['needs_review', 'reviewed'])
    expect(KNOWLEDGE_KIND_LABELS.question).toBe('问题')
    expect(KNOWLEDGE_STATE_LABELS.exploring).toBe('探索中')
  })

  it('normalizes only draft fields and falls back from invalid enums', () => {
    expect(normalizeKnowledgeDraft({
      title: '  平台责任  ',
      summary: '  一个摘要  ',
      bodyMarkdown: '\n  正文  \n',
      kind: 'unknown',
      state: 'published',
      domain: '  平台治理 ',
      topic: ' 算法责任  ',
      seedText: '  从判例开始 ',
      reviewStatus: 'pending',
      provenance: [{ type: 'note', id: 'note-1' }],
      showOnHome: true,
      ignored: 'must not leak'
    })).toEqual({
      title: '平台责任',
      summary: '一个摘要',
      bodyMarkdown: '正文',
      kind: 'idea',
      state: 'exploring',
      domain: '平台治理',
      topic: '算法责任',
      seedText: '从判例开始',
      tags: [],
      reviewStatus: 'needs_review',
      provenance: [{ type: 'note', id: 'note-1' }],
      showOnHome: true
    })
  })

  it('deduplicates cleaned tags and caps them at eight', () => {
    const normalized = normalizeKnowledgeDraft({
      tags: [' 证据 ', '程序', '证据', '', '法院', '平台', '算法', '责任', '救济', '比较法', '第九个']
    })

    expect(normalized.tags).toEqual([
      '证据',
      '程序',
      '法院',
      '平台',
      '算法',
      '责任',
      '救济',
      '比较法'
    ])
  })

  it('builds searchable text without coercing objects into strings', () => {
    const searchText = buildKnowledgeSearchText({
      title: '平台责任',
      summary: '摘要',
      bodyMarkdown: '正文',
      domain: '平台治理',
      topic: '算法',
      tags: ['证据', { label: '不能拼接' }, null],
      seedText: '判例',
      provenance: [{ type: 'note', id: 'note-1' }]
    })

    expect(searchText).toContain('平台责任')
    expect(searchText).toContain('证据')
    expect(searchText).toContain('判例')
    expect(searchText).not.toContain('[object Object]')
  })

  it('maps joined snake_case rows into one frontend knowledge record', () => {
    expect(mapKnowledgeRecord(
      {
        id: 'item-1',
        owner_id: 'owner-1',
        slug: 'platform-duty',
        title: '平台责任',
        summary: '摘要',
        type: 'knowledge',
        status: 'draft',
        created_at: '2026-07-28T01:00:00.000Z',
        updated_at: '2026-07-28T02:00:00.000Z'
      },
      {
        kind: 'concept',
        state: 'active',
        domain: '平台治理',
        topic: '算法责任',
        seed_text: '判例',
        review_status: 'reviewed',
        provenance: [{ type: 'note', id: 'note-1' }],
        show_on_home: true,
        search_text: '平台责任 算法责任',
        updated_at: '2026-07-28T03:00:00.000Z'
      },
      {
        id: 'version-3',
        version: 3,
        body_markdown: '正文',
        checksum: 'checksum-3'
      },
      {
        tags: ['平台', '算法'],
        folder_path: ['轻知识', '平台治理']
      }
    )).toEqual({
      id: 'item-1',
      ownerId: 'owner-1',
      slug: 'platform-duty',
      title: '平台责任',
      summary: '摘要',
      type: 'knowledge',
      status: 'draft',
      kind: 'concept',
      state: 'active',
      domain: '平台治理',
      topic: '算法责任',
      seedText: '判例',
      reviewStatus: 'reviewed',
      provenance: [{ type: 'note', id: 'note-1' }],
      showOnHome: true,
      searchText: '平台责任 算法责任',
      bodyMarkdown: '正文',
      versionId: 'version-3',
      version: 3,
      checksum: 'checksum-3',
      tags: ['平台', '算法'],
      folderPath: ['轻知识', '平台治理'],
      createdAt: '2026-07-28T01:00:00.000Z',
      updatedAt: '2026-07-28T03:00:00.000Z'
    })
  })
})
