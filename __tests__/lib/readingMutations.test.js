import { buildReadingMutation } from '@/lib/reading/mutations'

const item = (id, patch = {}) => ({
  id,
  title: id,
  section: '阅读',
  sectionKey: 'reading',
  contentType: 'reading',
  date: 'reading',
  status: 'active',
  aiTrace: { contentType: 'reading', folderId: 'folder-a' },
  ...patch
})

describe('reading mutation diff', () => {
  it('only upserts the item that actually changed', () => {
    const current = [item('11111111-1111-4111-8111-111111111111'), item('22222222-2222-4222-8222-222222222222')]
    const next = [
      current[0],
      item('22222222-2222-4222-8222-222222222222', {
        aiTrace: { contentType: 'reading', folderId: 'folder-b' }
      })
    ]
    const mutation = buildReadingMutation(current, next)
    expect(mutation.upserts).toHaveLength(1)
    expect(mutation.upserts[0].id).toBe('22222222-2222-4222-8222-222222222222')
    expect(mutation.deletedIds).toEqual([])
  })

  it('detects deletions without resending unaffected items', () => {
    const removed = item('11111111-1111-4111-8111-111111111111')
    const kept = item('22222222-2222-4222-8222-222222222222')
    const mutation = buildReadingMutation([removed, kept], [kept])
    expect(mutation.upserts).toEqual([])
    expect(mutation.deletedIds).toEqual(['11111111-1111-4111-8111-111111111111'])
  })

  it('ignores server timestamps when deciding whether an item changed', () => {
    const current = item('11111111-1111-4111-8111-111111111111', {
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z'
    })
    const next = { ...current, updatedAt: '2026-07-12T00:00:00.000Z' }
    expect(buildReadingMutation([current], [next]).upserts).toEqual([])
  })
})
