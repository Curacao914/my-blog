import handler from '@/pages/api/notes'
import {
  ensureProfile,
  findNote,
  findScheduleRow,
  listNotes,
  updateNote,
  upsertNote
} from '@/lib/server/supabase'

jest.mock('@/lib/auth/scheduleOwner', () => ({
  getScheduleOwnerUserId: jest.fn(() => 'clerk-owner')
}))

jest.mock('@/lib/domain/schedule', () => ({
  fromDbScheduleItem: jest.fn(() => ({
    id: '11111111-1111-4111-8111-111111111111',
    title: '阅读材料',
    contentType: 'reading',
    date: 'reading',
    section: '阅读',
    links: [{ title: '原文', url: 'https://example.com/a' }],
    summary: '真实摘要',
    note: '',
    tags: ['民法']
  }))
}))

jest.mock('@/lib/server/supabase', () => ({
  deleteNote: jest.fn(),
  ensureProfile: jest.fn(),
  findNote: jest.fn(),
  findScheduleRow: jest.fn(),
  listNotes: jest.fn(),
  updateNote: jest.fn(),
  upsertNote: jest.fn()
}))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    end() {
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
      return this
    }
  }
}

describe('/api/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ensureProfile.mockResolvedValue({ profile: { id: 'profile-1' } })
  })

  it('creates a quick note for the server-side owner only', async () => {
    upsertNote.mockResolvedValue({ id: 'note-1', title: '普通想法' })
    const req = {
      method: 'POST',
      body: { ownerId: 'client-owner', title: '', bodyMarkdown: '普通想法\n第二行' }
    }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(201)
    expect(upsertNote).toHaveBeenCalledWith(
      'profile-1',
      expect.objectContaining({
        title: '普通想法',
        body_markdown: '普通想法\n第二行',
        note_type: 'quick_note'
      })
    )
    expect(JSON.stringify(upsertNote.mock.calls[0][1])).not.toContain('client-owner')
  })

  it('returns an existing reading draft instead of creating duplicates', async () => {
    findScheduleRow.mockResolvedValue({ id: 'row-1' })
    listNotes.mockResolvedValueOnce([{ id: 'note-1' }])
    const req = {
      method: 'POST',
      body: { scheduleItemId: '11111111-1111-4111-8111-111111111111' }
    }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.existing).toBe(true)
    expect(upsertNote).not.toHaveBeenCalled()
    expect(res.body.note.id).toBe('note-1')
  })

  it('updates notes only after finding the note under the current owner', async () => {
    findNote.mockResolvedValue({ id: 'note-1', title: '旧标题', body_markdown: '旧正文', metadata: {} })
    updateNote.mockResolvedValue({ id: 'note-1', title: '新标题' })
    const req = {
      method: 'PATCH',
      body: { id: '99999999-9999-4999-8999-999999999999', title: '新标题', bodyMarkdown: '新正文' }
    }
    const res = createRes()

    await handler(req, res)

    expect(findNote).toHaveBeenCalledWith('profile-1', '99999999-9999-4999-8999-999999999999')
    expect(updateNote).toHaveBeenCalledWith(
      'profile-1',
      '99999999-9999-4999-8999-999999999999',
      expect.objectContaining({ title: '新标题', body_markdown: '新正文' })
    )
    expect(res.statusCode).toBe(200)
  })
})
