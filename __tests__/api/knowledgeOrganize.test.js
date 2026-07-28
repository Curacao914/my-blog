import handler from '@/pages/api/knowledge/organize'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { organizeKnowledgeLibrary } from '@/lib/server/knowledgeOrganizer'

jest.mock('@/lib/auth/serverAdmin', () => ({ requireWorkspaceRequest: jest.fn() }))
jest.mock('@/lib/server/knowledgeOrganizer', () => ({ organizeKnowledgeLibrary: jest.fn() }))

function res() {
  return {
    statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/knowledge/organize', () => {
  it('runs owner-scoped whole-library organization', async () => {
    requireWorkspaceRequest.mockResolvedValue({ ok: true, profile: { id: 'owner' } })
    organizeKnowledgeLibrary.mockResolvedValue({ entry: { id: 'item' }, updated: 3 })
    const response = res()
    await handler({ method: 'POST', body: { itemId: 'item' } }, response)
    expect(organizeKnowledgeLibrary).toHaveBeenCalledWith(
      { id: 'owner' },
      'item'
    )
    expect(response.body.updated).toBe(3)
  })
})
