import collectionHandler from '@/pages/api/knowledge'
import itemHandler from '@/pages/api/knowledge/[id]'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  createKnowledgeEntry,
  getKnowledgeEntry,
  listKnowledgeEntries,
  updateKnowledgeEntry
} from '@/lib/server/knowledgeRepository'

jest.mock('@/lib/auth/serverAdmin', () => ({
  requireWorkspaceRequest: jest.fn()
}))

jest.mock('@/lib/server/knowledgeRepository', () => ({
  createKnowledgeEntry: jest.fn(),
  getKnowledgeEntry: jest.fn(),
  listKnowledgeEntries: jest.fn(),
  updateKnowledgeEntry: jest.fn()
}))

const ownerId = '11111111-1111-4111-8111-111111111111'
const itemId = '22222222-2222-4222-8222-222222222222'

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

describe('/api/knowledge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireWorkspaceRequest.mockResolvedValue({
      ok: true,
      profile: { id: ownerId }
    })
  })

  it('authenticates the knowledge permission and forwards GET filters', async () => {
    listKnowledgeEntries.mockResolvedValue([{ id: itemId }])
    const req = {
      method: 'GET',
      query: {
        state: 'active',
        kind: 'concept',
        domain: '平台治理',
        showOnHome: 'true',
        q: '责任',
        limit: '20'
      },
      body: {}
    }
    const res = createRes()

    await collectionHandler(req, res)

    expect(requireWorkspaceRequest).toHaveBeenCalledWith(req, { permission: 'knowledge' })
    expect(listKnowledgeEntries).toHaveBeenCalledWith(ownerId, req.query)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ entries: [{ id: itemId }] })
  })

  it('creates under the authenticated profile and ignores a body owner', async () => {
    createKnowledgeEntry.mockResolvedValue({ id: itemId, ownerId })
    const req = {
      method: 'POST',
      query: {},
      body: {
        ownerId: 'client-owner',
        title: '平台责任',
        bodyMarkdown: '正文'
      }
    }
    const res = createRes()

    await collectionHandler(req, res)

    expect(createKnowledgeEntry).toHaveBeenCalledWith(ownerId, req.body)
    expect(createKnowledgeEntry).not.toHaveBeenCalledWith('client-owner', expect.anything())
    expect(res.statusCode).toBe(201)
    expect(res.body.entry.id).toBe(itemId)
  })

  it('gets and patches UUID-addressed entries under the authenticated profile', async () => {
    getKnowledgeEntry.mockResolvedValue({ id: itemId, title: '旧标题' })
    updateKnowledgeEntry.mockResolvedValue({ id: itemId, title: '新标题' })

    const getReq = { method: 'GET', query: { id: itemId }, body: {} }
    const getRes = createRes()
    await itemHandler(getReq, getRes)

    const patchReq = {
      method: 'PATCH',
      query: { id: itemId },
      body: { ownerId: 'client-owner', title: '新标题' }
    }
    const patchRes = createRes()
    await itemHandler(patchReq, patchRes)

    expect(getKnowledgeEntry).toHaveBeenCalledWith(ownerId, itemId)
    expect(updateKnowledgeEntry).toHaveBeenCalledWith(ownerId, itemId, patchReq.body)
    expect(getRes.body.entry.title).toBe('旧标题')
    expect(patchRes.body.entry.title).toBe('新标题')
  })

  it('rejects invalid item ids before repository access', async () => {
    const req = { method: 'GET', query: { id: 'not-a-uuid' }, body: {} }
    const res = createRes()

    await itemHandler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body.code).toBe('invalid_id')
    expect(getKnowledgeEntry).not.toHaveBeenCalled()
  })

  it('returns auth status and code without calling the repository', async () => {
    requireWorkspaceRequest.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Permission denied',
      code: 'permission_denied'
    })
    const req = { method: 'GET', query: {}, body: {} }
    const res = createRes()

    await collectionHandler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({
      error: 'Permission denied',
      code: 'permission_denied'
    })
    expect(listKnowledgeEntries).not.toHaveBeenCalled()
  })

  it('preserves repository status and code errors', async () => {
    const error = new Error('Knowledge entry not found')
    error.status = 404
    error.code = 'knowledge_not_found'
    getKnowledgeEntry.mockRejectedValue(error)
    const req = { method: 'GET', query: { id: itemId }, body: {} }
    const res = createRes()

    await itemHandler(req, res)

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      error: 'Knowledge entry not found',
      code: 'knowledge_not_found'
    })
  })

  it('sets exact Allow headers for unsupported methods', async () => {
    const collectionReq = { method: 'DELETE', query: {}, body: {} }
    const collectionRes = createRes()
    await collectionHandler(collectionReq, collectionRes)

    const itemReq = { method: 'POST', query: { id: itemId }, body: {} }
    const itemRes = createRes()
    await itemHandler(itemReq, itemRes)

    expect(collectionRes.statusCode).toBe(405)
    expect(collectionRes.headers.Allow).toBe('GET, POST')
    expect(itemRes.statusCode).toBe(405)
    expect(itemRes.headers.Allow).toBe('GET, PATCH')
    expect(collectionRes.body.code).toBe('method_not_allowed')
    expect(itemRes.body.code).toBe('method_not_allowed')
  })
})
