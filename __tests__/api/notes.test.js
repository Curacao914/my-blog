import handler from '@/pages/api/notes'
import { getScheduleOwner } from '@/lib/auth/scheduleOwner'
import {
  deleteNote,
  findNote,
  findScheduleRow,
  listNotes,
  updateNote,
  upsertNote
} from '@/lib/server/supabase'

jest.mock('@/lib/auth/scheduleOwner', () => ({
  getScheduleOwner: jest.fn()
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
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    end() { return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getScheduleOwner.mockResolvedValue({ ok: true, profile: { id: 'profile-1' } })
    listNotes.mockResolvedValue([])
  })

  it('creates a quick note under the notes permission', async () => {
    upsertNote.mockResolvedValue({ id: 'note-1', title: '普通想法' })
    const req = {
      method: 'POST',
      query: {},
      body: { ownerId: 'client-owner', title: '', bodyMarkdown: '普通想法\n第二行' }
    }
    const res = createRes()

    await handler(req, res)

    expect(getScheduleOwner).toHaveBeenCalledWith(req, 'notes')
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

  it('lists only writing drafts when Writing Studio requests its scope', async () => {
    const req = { method: 'GET', query: { scope: 'writing' }, body: {} }
    const res = createRes()

    await handler(req, res)

    expect(getScheduleOwner).toHaveBeenCalledWith(req, 'writing')
    expect(listNotes).toHaveBeenCalledWith('profile-1', expect.objectContaining({ noteType: 'writing' }))
    expect(res.statusCode).toBe(200)
  })

  it('creates Writing Studio drafts with the writing type', async () => {
    upsertNote.mockResolvedValue({ id: 'draft-1', note_type: 'writing' })
    const req = {
      method: 'POST',
      query: {},
      body: { scope: 'writing', title: '论文草稿', bodyMarkdown: '# 论文草稿' }
    }
    const res = createRes()

    await handler(req, res)

    expect(getScheduleOwner).toHaveBeenCalledWith(req, 'writing')
    expect(upsertNote).toHaveBeenCalledWith(
      'profile-1',
      expect.objectContaining({
        note_type: 'writing',
        metadata: expect.objectContaining({ originType: 'writing' })
      })
    )
    expect(res.statusCode).toBe(201)
  })

  it('does not let writing scope modify an ordinary quick note by guessed id', async () => {
    findNote.mockResolvedValue({
      id: '99999999-9999-4999-8999-999999999999',
      note_type: 'quick_note',
      body_markdown: '私人随手记',
      metadata: {}
    })
    const req = {
      method: 'PATCH',
      query: {},
      body: {
        scope: 'writing',
        id: '99999999-9999-4999-8999-999999999999',
        bodyMarkdown: '试图覆盖'
      }
    }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(404)
    expect(updateNote).not.toHaveBeenCalled()
  })

  it('returns an existing reading draft instead of creating duplicates', async () => {
    findScheduleRow.mockResolvedValue({ id: 'row-1' })
    listNotes.mockResolvedValueOnce([{ id: 'note-1' }])
    const req = {
      method: 'POST',
      query: {},
      body: { scheduleItemId: '11111111-1111-4111-8111-111111111111' }
    }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.existing).toBe(true)
    expect(upsertNote).not.toHaveBeenCalled()
  })

  it('updates notes only after finding the note under the current owner', async () => {
    findNote.mockResolvedValue({ id: 'note-1', note_type: 'quick_note', title: '旧标题', body_markdown: '旧正文', metadata: {} })
    updateNote.mockResolvedValue({ id: 'note-1', title: '新标题' })
    const req = {
      method: 'PATCH',
      query: {},
      body: { id: '99999999-9999-4999-8999-999999999999', title: '新标题', bodyMarkdown: '新正文' }
    }
    const res = createRes()

    await handler(req, res)

    expect(findNote).toHaveBeenCalledWith('profile-1', '99999999-9999-4999-8999-999999999999')
    expect(updateNote).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
  })

  it('checks writing type before deleting through writing scope', async () => {
    findNote.mockResolvedValue({ id: '99999999-9999-4999-8999-999999999999', note_type: 'writing' })
    const req = {
      method: 'DELETE',
      query: { id: '99999999-9999-4999-8999-999999999999' },
      body: { scope: 'writing' }
    }
    const res = createRes()

    await handler(req, res)

    expect(deleteNote).toHaveBeenCalledWith('profile-1', '99999999-9999-4999-8999-999999999999')
    expect(res.statusCode).toBe(204)
  })
})
