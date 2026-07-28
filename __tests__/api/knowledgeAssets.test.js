import collectionHandler, {
  config as collectionConfig
} from '@/pages/api/knowledge/assets'
import itemHandler from '@/pages/api/knowledge/assets/[id]'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  deleteKnowledgeAsset,
  readKnowledgeAsset,
  storeKnowledgeAsset
} from '@/lib/server/knowledgeAssets'

jest.mock('@/lib/auth/serverAdmin', () => ({
  requireWorkspaceRequest: jest.fn()
}))

jest.mock('@/lib/server/knowledgeAssets', () => ({
  deleteKnowledgeAsset: jest.fn(),
  readKnowledgeAsset: jest.fn(),
  storeKnowledgeAsset: jest.fn()
}))

const ownerId = '11111111-1111-4111-8111-111111111111'
const itemId = '22222222-2222-4222-8222-222222222222'
const assetId = '33333333-3333-4333-8333-333333333333'

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    send(body) { this.body = body; return this },
    end(body) { this.body = body; return this },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value
      return this
    }
  }
}

describe('/api/knowledge/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireWorkspaceRequest.mockResolvedValue({
      ok: true,
      profile: { id: ownerId }
    })
  })

  it('authenticates knowledge permission and stores a POST under the profile owner', async () => {
    storeKnowledgeAsset.mockResolvedValue({
      id: assetId,
      url: `/api/knowledge/assets/${assetId}`
    })
    const req = {
      method: 'POST',
      query: {},
      body: {
        itemId,
        ownerId: 'client-owner',
        name: 'diagram.png',
        dataUrl: 'data:image/png;base64,aW1hZ2U='
      }
    }
    const res = createRes()

    await collectionHandler(req, res)

    expect(collectionConfig.api.bodyParser.sizeLimit).toBe('3mb')
    expect(requireWorkspaceRequest).toHaveBeenCalledWith(req, {
      permission: 'knowledge'
    })
    expect(storeKnowledgeAsset).toHaveBeenCalledWith(
      ownerId,
      itemId,
      req.body
    )
    expect(res.statusCode).toBe(201)
    expect(res.body.asset.id).toBe(assetId)
  })

  it('streams a UUID-addressed private asset with inline private-cache headers', async () => {
    readKnowledgeAsset.mockResolvedValue({
      buffer: Buffer.from('private-image'),
      mimeType: 'image/png',
      originalName: '证据 "一".png'
    })
    const req = {
      method: 'GET',
      query: { id: assetId }
    }
    const res = createRes()

    await itemHandler(req, res)

    expect(readKnowledgeAsset).toHaveBeenCalledWith(ownerId, assetId)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(Buffer.from('private-image'))
    expect(res.headers['content-type']).toBe('image/png')
    expect(res.headers['content-disposition']).toMatch(/^inline;/)
    expect(res.headers['content-disposition']).not.toContain('"一"')
    expect(res.headers['cache-control']).toBe('private,max-age=300')
  })

  it('deletes a UUID-addressed asset under the authenticated owner', async () => {
    deleteKnowledgeAsset.mockResolvedValue({ id: assetId })
    const req = {
      method: 'DELETE',
      query: { id: assetId }
    }
    const res = createRes()

    await itemHandler(req, res)

    expect(deleteKnowledgeAsset).toHaveBeenCalledWith(ownerId, assetId)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true, id: assetId })
  })

  it('rejects unauthorized, invalid-id, and unsupported method requests', async () => {
    requireWorkspaceRequest.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'Forbidden',
      code: 'permission_denied'
    })
    const authRes = createRes()
    await collectionHandler({ method: 'POST', query: {}, body: {} }, authRes)
    expect(authRes.statusCode).toBe(403)
    expect(storeKnowledgeAsset).not.toHaveBeenCalled()

    const invalidRes = createRes()
    await itemHandler({
      method: 'GET',
      query: { id: 'not-a-uuid' }
    }, invalidRes)
    expect(invalidRes.statusCode).toBe(400)
    expect(invalidRes.body.code).toBe('invalid_id')
    expect(readKnowledgeAsset).not.toHaveBeenCalled()

    const methodRes = createRes()
    await itemHandler({
      method: 'PATCH',
      query: { id: assetId }
    }, methodRes)
    expect(methodRes.statusCode).toBe(405)
    expect(methodRes.headers.allow).toBe('GET, DELETE')
  })

  it('returns controlled asset errors but masks unexpected failures', async () => {
    storeKnowledgeAsset.mockRejectedValueOnce(
      Object.assign(new Error('图片超过限制'), {
        status: 413,
        code: 'asset_too_large',
        isKnowledgeAssetError: true
      })
    )
    const controlledRes = createRes()
    await collectionHandler({
      method: 'POST',
      query: {},
      body: { itemId }
    }, controlledRes)
    expect(controlledRes.statusCode).toBe(413)
    expect(controlledRes.body).toEqual({
      error: '图片超过限制',
      code: 'asset_too_large'
    })

    readKnowledgeAsset.mockRejectedValueOnce(
      new Error('service-role-secret leaked')
    )
    const maskedRes = createRes()
    await itemHandler({
      method: 'GET',
      query: { id: assetId }
    }, maskedRes)
    expect(maskedRes.statusCode).toBe(500)
    expect(maskedRes.body.code).toBe('knowledge_asset_unavailable')
    expect(JSON.stringify(maskedRes.body)).not.toContain('service-role-secret')
  })
})
