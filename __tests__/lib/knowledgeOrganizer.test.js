import { organizeKnowledgeLibrary } from '@/lib/server/knowledgeOrganizer'
import {
  getKnowledgeEntry,
  listKnowledgeEntries,
  updateKnowledgeEntry
} from '@/lib/server/knowledgeRepository'
import { supabaseRest } from '@/lib/server/supabase'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

jest.mock('@/lib/server/knowledgeRepository', () => ({
  getKnowledgeEntry: jest.fn(),
  listKnowledgeEntries: jest.fn(),
  updateKnowledgeEntry: jest.fn()
}))
jest.mock('@/lib/server/supabase', () => ({ supabaseRest: jest.fn() }))
jest.mock('@/lib/server/userIntegrations', () => ({ resolveUserAiConfig: jest.fn() }))

describe('AI knowledge library organizer', () => {
  it('may reorganize old entries and replace AI-managed relations', async () => {
    const entries = [
      { id: 'set', title: '旧标题', bodyMarkdown: '集合论内容', tags: [] },
      { id: 'physics', title: '力学', bodyMarkdown: '物理内容', tags: [] }
    ]
    listKnowledgeEntries.mockResolvedValue(entries)
    resolveUserAiConfig.mockResolvedValue({
      apiKey: 'key',
      baseUrl: 'https://model.example/v1',
      models: { writer: 'model' }
    })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          entries: [
            { id: 'set', title: '集合论', summary: '集合论概览', kind: 'concept', domain: '自然科学', topic: '数学', tags: ['集合'] },
            { id: 'physics', title: '经典力学', summary: '力学概览', kind: 'concept', domain: '自然科学', topic: '物理学', tags: ['力学'] }
          ],
          relations: [{ sourceId: 'set', targetId: 'physics', type: 'related', reason: '共同使用数学语言' }]
        }) } }]
      })
    })
    getKnowledgeEntry.mockResolvedValue({ id: 'set', title: '集合论' })

    const result = await organizeKnowledgeLibrary({ id: 'owner' }, 'set')

    expect(updateKnowledgeEntry).toHaveBeenCalledTimes(2)
    expect(updateKnowledgeEntry).toHaveBeenCalledWith(
      'owner',
      'physics',
      expect.objectContaining({ domain: '自然科学', topic: '物理学' })
    )
    expect(supabaseRest).toHaveBeenCalledWith(
      expect.stringContaining('origin=eq.import'),
      { method: 'DELETE' }
    )
    expect(result).toEqual(expect.objectContaining({
      updated: 2,
      relations: 1,
      organized: true
    }))
  })
})
