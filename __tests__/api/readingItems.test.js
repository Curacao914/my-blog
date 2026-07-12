import handler from '@/pages/api/reading/items'
import { getScheduleOwner } from '@/lib/auth/scheduleOwner'
import {
  deleteScheduleRows,
  listScheduleRows,
  listScheduleRowsByIds,
  upsertScheduleRows
} from '@/lib/server/supabase'

jest.mock('@/lib/auth/scheduleOwner', () => ({
  getScheduleOwner: jest.fn()
}))

jest.mock('@/lib/server/supabase', () => ({
  deleteScheduleRows: jest.fn(),
  listScheduleRows: jest.fn(),
  listScheduleRowsByIds: jest.fn(),
  upsertScheduleRows: jest.fn()
}))

function row(id, ownerId = 'owner-1', patch = {}) {
  return {
    id,
    owner_id: ownerId,
    title: id,
    section: '阅读',
    section_key: 'reading',
    schedule_date: 'reading',
    status: 'active',
    links: [],
    children: [],
    ai_trace: { contentType: 'reading' },
    ...patch
  }
}

function item(id, patch = {}) {
  return {
    id,
    title: id,
    section: '阅读',
    sectionKey: 'reading',
    date: 'reading',
    status: 'active',
    contentType: 'reading',
    aiTrace: { contentType: 'reading' },
    ...patch
  }
}

function response() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
}

describe('reading items API', () => {
  const readingId = '11111111-1111-4111-8111-111111111111'
  const actionId = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    jest.clearAllMocks()
    getScheduleOwner.mockResolvedValue({
      ok: true,
      profile: { id: 'owner-1' }
    })
    listScheduleRowsByIds.mockResolvedValue([])
    deleteScheduleRows.mockResolvedValue([])
    upsertScheduleRows.mockResolvedValue([])
  })

  it('returns only reading rows on GET', async () => {
    listScheduleRows.mockResolvedValue([
      row(readingId),
      row(actionId, 'owner-1', {
        section: '工作',
        section_key: 'work',
        schedule_date: 'today',
        ai_trace: { contentType: 'action' }
      })
    ])
    const res = response()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload.items).toHaveLength(1)
    expect(res.payload.items[0].id).toBe(readingId)
  })

  it('rejects a non-reading upsert before persistence', async () => {
    const res = response()
    await handler({
      method: 'PATCH',
      body: {
        upserts: [item(readingId, {
          section: '工作',
          sectionKey: 'work',
          date: 'today',
          contentType: 'action',
          aiTrace: { contentType: 'action' }
        })]
      }
    }, res)
    expect(res.statusCode).toBe(400)
    expect(upsertScheduleRows).not.toHaveBeenCalled()
  })

  it('rejects an ID occupied by another owner', async () => {
    listScheduleRows.mockResolvedValue([])
    listScheduleRowsByIds.mockResolvedValue([row(readingId, 'owner-2')])
    const res = response()
    await handler({
      method: 'PATCH',
      body: { upserts: [item(readingId)], deletedIds: [] }
    }, res)
    expect(res.statusCode).toBe(409)
    expect(upsertScheduleRows).not.toHaveBeenCalled()
  })

  it('persists valid reading deltas and returns the refreshed reading set', async () => {
    const secondId = '33333333-3333-4333-8333-333333333333'
    listScheduleRows
      .mockResolvedValueOnce([row(readingId)])
      .mockResolvedValueOnce([row(secondId)])
    listScheduleRowsByIds.mockResolvedValue([row(readingId)])
    const res = response()
    await handler({
      method: 'PATCH',
      body: {
        upserts: [item(secondId)],
        deletedIds: [readingId]
      }
    }, res)
    expect(res.statusCode).toBe(200)
    expect(deleteScheduleRows).toHaveBeenCalledWith('owner-1', [readingId])
    expect(upsertScheduleRows).toHaveBeenCalledTimes(1)
    expect(res.payload.items.map(value => value.id)).toEqual([secondId])
  })
})
