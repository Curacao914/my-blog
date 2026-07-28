const fs = require('fs')
const path = require('path')

import {
  decodeKnowledgeAssetDataUrl,
  decryptKnowledgeAsset,
  deleteKnowledgeAsset,
  encryptKnowledgeAsset,
  readKnowledgeAsset,
  storeKnowledgeAsset
} from '@/lib/server/knowledgeAssets'
import { getKnowledgeEntry } from '@/lib/server/knowledgeRepository'
import { supabaseRest } from '@/lib/server/supabase'

jest.mock('@/lib/server/knowledgeRepository', () => ({
  getKnowledgeEntry: jest.fn()
}))

jest.mock('@/lib/db/client', () => ({
  getSupabaseStorageConfig: jest.fn(() => ({
    baseUrl: 'https://supabase.test/storage/v1/object',
    bucket: 'knowledge-assets',
    headers: { authorization: 'Bearer service-role' }
  }))
}))

jest.mock('@/lib/server/supabase', () => ({
  supabaseRest: jest.fn()
}))

const ownerId = '11111111-1111-4111-8111-111111111111'
const itemId = '22222222-2222-4222-8222-222222222222'
const assetId = '33333333-3333-4333-8333-333333333333'

function response({
  ok = true,
  status = 200,
  text = '',
  bytes = Buffer.from('')
} = {}) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Failed',
    async text() { return text },
    async arrayBuffer() {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      )
    }
  }
}

describe('private knowledge assets', () => {
  const previousEnv = {}

  beforeAll(() => {
    for (const key of [
      'DATABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SECRET_KEY',
      'SUPABASE_STORAGE_BUCKET',
      'R2_ACCOUNT_ID',
      'R2_ENDPOINT',
      'R2_BUCKET',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'USER_SECRETS_ENCRYPTION_KEY'
    ]) {
      previousEnv[key] = process.env[key]
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    delete process.env.DATABASE_URL
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    delete process.env.SUPABASE_SECRET_KEY
    delete process.env.SUPABASE_STORAGE_BUCKET
    process.env.R2_ENDPOINT = 'https://r2.example'
    process.env.R2_BUCKET = 'assets'
    process.env.R2_ACCESS_KEY_ID = 'access'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.USER_SECRETS_ENCRYPTION_KEY = 'test-encryption-secret'
    getKnowledgeEntry.mockResolvedValue({
      id: itemId,
      ownerId,
      type: 'knowledge'
    })
  })

  afterAll(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('keeps knowledge binaries out of Supabase Storage', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/server/knowledgeAssets.js'),
      'utf8'
    )
    expect(source).toContain('putR2Object')
    expect(source).toContain("getSupabaseStorageConfig('knowledge-assets')")
  })

  it('uploads a decoded image privately after verifying the knowledge owner', async () => {
    global.fetch.mockResolvedValue(response())
    supabaseRest.mockResolvedValue([{
      id: assetId,
      owner_id: ownerId,
      item_id: itemId,
      storage_path: `knowledge/${ownerId}/${itemId}/stored.bin`,
      original_name: 'diagram.png',
      mime_type: 'image/png',
      size_bytes: 5,
      checksum: 'checksum',
      alt_text: '流程图'
    }])

    const asset = await storeKnowledgeAsset(ownerId, itemId, {
      name: 'diagram.png',
      altText: '流程图',
      dataUrl: `data:image/png;base64,${Buffer.from('image').toString('base64')}`
    })

    expect(getKnowledgeEntry).toHaveBeenCalledWith(ownerId, itemId)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [uploadUrl, uploadOptions] = global.fetch.mock.calls[0]
    expect(uploadUrl).toMatch(
      new RegExp(`/assets/knowledge/${ownerId}/${itemId}/[0-9a-f-]+\\.bin$`)
    )
    expect(uploadUrl).not.toContain('/public/')
    expect(uploadOptions).toEqual(expect.objectContaining({
      method: 'PUT',
      body: expect.any(Buffer)
    }))
    expect(uploadOptions.headers).toEqual(expect.objectContaining({
      'content-type': 'application/octet-stream',
      authorization: expect.stringContaining('AWS4-HMAC-SHA256')
    }))
    expect(decryptKnowledgeAsset(uploadOptions.body)).toEqual(Buffer.from('image'))
    expect(supabaseRest).toHaveBeenCalledWith(
      '/knowledge_assets?select=*',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String)
      })
    )
    const inserted = JSON.parse(supabaseRest.mock.calls[0][1].body)
    expect(inserted).toEqual(expect.objectContaining({
      owner_id: ownerId,
      item_id: itemId,
      original_name: 'diagram.png',
      mime_type: 'image/png',
      size_bytes: 5,
      alt_text: '流程图'
    }))
    expect(asset).toEqual(expect.objectContaining({
      id: assetId,
      url: `/api/knowledge/assets/${assetId}`,
      mimeType: 'image/png',
      originalName: 'diagram.png'
    }))
    expect(JSON.stringify(asset)).not.toContain('r2.example')
  })

  it('does not upload when the knowledge entry is outside the owner scope', async () => {
    getKnowledgeEntry.mockRejectedValue(
      Object.assign(new Error('Knowledge entry not found'), {
        status: 404,
        code: 'knowledge_not_found',
        isKnowledgeRepositoryError: true
      })
    )

    await expect(storeKnowledgeAsset(ownerId, itemId, {
      name: 'diagram.png',
      dataUrl: 'data:image/png;base64,aW1hZ2U='
    })).rejects.toMatchObject({
      status: 404,
      code: 'knowledge_not_found'
    })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(supabaseRest).not.toHaveBeenCalled()
  })

  it('best-effort deletes the private object when the database insert fails', async () => {
    global.fetch
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response())
    supabaseRest.mockRejectedValue(new Error('database unavailable'))

    await expect(storeKnowledgeAsset(ownerId, itemId, {
      name: 'diagram.png',
      dataUrl: 'data:image/png;base64,aW1hZ2U='
    })).rejects.toThrow('database unavailable')

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch.mock.calls[1][0]).toBe(global.fetch.mock.calls[0][0])
    expect(global.fetch.mock.calls[1][1].method).toBe('DELETE')
  })

  it('reads an owner-scoped row through the authenticated storage endpoint', async () => {
    supabaseRest.mockResolvedValue([{
      id: assetId,
      owner_id: ownerId,
      item_id: itemId,
      storage_path: `knowledge/${ownerId}/${itemId}/stored.bin`,
      original_name: 'proof.gif',
      mime_type: 'image/gif',
      size_bytes: 7,
      checksum: 'checksum',
      alt_text: '证据'
    }])
    global.fetch.mockResolvedValue(response({
      bytes: encryptKnowledgeAsset(Buffer.from('content'))
    }))

    const asset = await readKnowledgeAsset(ownerId, assetId)

    expect(supabaseRest.mock.calls[0][0]).toContain(
      `/knowledge_assets?select=*&id=eq.${assetId}&owner_id=eq.${ownerId}`
    )
    expect(global.fetch.mock.calls[0][0]).toBe(
      `https://r2.example/assets/knowledge/${ownerId}/${itemId}/stored.bin`
    )
    expect(global.fetch.mock.calls[0][1].method).toBe('GET')
    expect(asset).toEqual(expect.objectContaining({
      buffer: Buffer.from('content'),
      mimeType: 'image/gif',
      originalName: 'proof.gif'
    }))
  })

  it('keeps legacy Supabase-backed images readable', async () => {
    supabaseRest.mockResolvedValue([{
      id: assetId,
      owner_id: ownerId,
      item_id: itemId,
      storage_path: `${ownerId}/${itemId}/legacy.png`,
      original_name: 'legacy.png',
      mime_type: 'image/png',
      size_bytes: 7
    }])
    global.fetch.mockResolvedValue(response({ bytes: Buffer.from('legacy') }))

    const asset = await readKnowledgeAsset(ownerId, assetId)

    expect(global.fetch.mock.calls[0][0]).toContain(
      `/authenticated/knowledge-assets/${ownerId}/${itemId}/legacy.png`
    )
    expect(asset.buffer).toEqual(Buffer.from('legacy'))
  })

  it('deletes storage before the owner-scoped database row and tolerates storage 404', async () => {
    supabaseRest
      .mockResolvedValueOnce([{
        id: assetId,
        owner_id: ownerId,
        item_id: itemId,
        storage_path: `knowledge/${ownerId}/${itemId}/stored.webp`,
        original_name: 'proof.webp',
        mime_type: 'image/webp',
        size_bytes: 7,
        checksum: 'checksum'
      }])
      .mockResolvedValueOnce([])
    global.fetch.mockResolvedValue(response({
      ok: false,
      status: 404,
      text: 'missing'
    }))

    await expect(deleteKnowledgeAsset(ownerId, assetId)).resolves.toEqual({
      id: assetId
    })

    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE')
    expect(supabaseRest.mock.calls[1][0]).toContain(
      `/knowledge_assets?id=eq.${assetId}&owner_id=eq.${ownerId}`
    )
    expect(global.fetch.mock.invocationCallOrder[0])
      .toBeLessThan(supabaseRest.mock.invocationCallOrder[1])
  })

  it('accepts only valid base64 JPEG, PNG, WebP, or GIF data URLs up to 2MB', () => {
    expect(decodeKnowledgeAssetDataUrl(
      'data:image/gif;base64,R0lGODlh'
    )).toEqual(expect.objectContaining({
      mimeType: 'image/gif',
      extension: 'gif',
      sizeBytes: 6
    }))
    expect(() => decodeKnowledgeAssetDataUrl(
      'data:image/svg+xml;base64,PHN2Zy8+'
    )).toThrow(expect.objectContaining({
      code: 'asset_type_invalid'
    }))
    expect(() => decodeKnowledgeAssetDataUrl(
      'data:image/png;base64,not*base64'
    )).toThrow(expect.objectContaining({
      code: 'asset_data_invalid'
    }))
    expect(() => decodeKnowledgeAssetDataUrl(
      `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`
    )).toThrow(expect.objectContaining({
      code: 'asset_too_large',
      status: 413
    }))
  })
})
