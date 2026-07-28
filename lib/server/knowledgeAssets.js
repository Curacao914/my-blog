import { createHash, randomUUID } from 'crypto'
import { getSupabaseStorageConfig } from '@/lib/db/client'
import { getKnowledgeEntry } from '@/lib/server/knowledgeRepository'
import { supabaseRest } from '@/lib/server/supabase'

const KNOWLEDGE_ASSET_BUCKET = 'knowledge-assets'
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const imageTypes = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
})

function assetError(message, status, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  error.isKnowledgeAssetError = true
  return error
}

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function encodedStoragePath(path) {
  return String(path || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

function cleanOriginalName(value, extension) {
  const name = String(value || '')
    .replace(/^.*[\\/]/, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 200)
  return name || `image.${extension}`
}

function mapAsset(row) {
  return {
    id: row.id,
    itemId: row.item_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    checksum: row.checksum,
    altText: row.alt_text || '',
    createdAt: row.created_at || null,
    url: `/api/knowledge/assets/${row.id}`
  }
}

async function responseText(response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function findAsset(ownerId, id) {
  const rows = await supabaseRest(
    `/knowledge_assets?select=*&id=${eq(id)}&owner_id=${eq(ownerId)}&limit=1`
  )
  const row = rows?.[0]
  if (!row) {
    throw assetError('Knowledge asset not found', 404, 'asset_not_found')
  }
  return row
}

export function decodeKnowledgeAssetDataUrl(value) {
  const match = String(value || '').match(
    /^data:([^;,]+);base64,(.*)$/s
  )
  if (!match || !imageTypes[match[1]]) {
    throw assetError(
      'Only JPEG, PNG, WebP, or GIF data URLs are supported',
      400,
      'asset_type_invalid'
    )
  }

  const payload = match[2]
  if (
    !payload ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(payload) ||
    payload.length % 4 === 1 ||
    /=/.test(payload.slice(0, -2))
  ) {
    throw assetError('Invalid image data URL', 400, 'asset_data_invalid')
  }

  const buffer = Buffer.from(payload, 'base64')
  const normalizedInput = payload.replace(/=+$/, '')
  if (
    !buffer.length ||
    buffer.toString('base64').replace(/=+$/, '') !== normalizedInput
  ) {
    throw assetError('Invalid image data URL', 400, 'asset_data_invalid')
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw assetError(
      'Knowledge images must not exceed 2MB',
      413,
      'asset_too_large'
    )
  }

  return {
    buffer,
    mimeType: match[1],
    extension: imageTypes[match[1]],
    sizeBytes: buffer.length
  }
}

export async function storeKnowledgeAsset(ownerId, itemId, input = {}) {
  await getKnowledgeEntry(ownerId, itemId)

  const decoded = decodeKnowledgeAssetDataUrl(input.dataUrl || input.data)
  const originalName = cleanOriginalName(
    input.name || input.originalName,
    decoded.extension
  )
  const altText = String(input.altText || input.alt || '').trim().slice(0, 500)
  const storagePath =
    `${ownerId}/${itemId}/${randomUUID()}.${decoded.extension}`
  const { baseUrl, bucket, headers } =
    getSupabaseStorageConfig(KNOWLEDGE_ASSET_BUCKET)
  const storageUrl =
    `${baseUrl}/${bucket}/${encodedStoragePath(storagePath)}`

  const upload = await fetch(storageUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': decoded.mimeType,
      'x-upsert': 'false'
    },
    body: decoded.buffer
  })
  if (!upload.ok) {
    await responseText(upload)
    throw assetError(
      'Knowledge asset storage upload failed',
      502,
      'asset_storage_failed'
    )
  }

  let row
  try {
    const rows = await supabaseRest('/knowledge_assets?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        owner_id: ownerId,
        item_id: itemId,
        storage_path: storagePath,
        original_name: originalName,
        mime_type: decoded.mimeType,
        size_bytes: decoded.sizeBytes,
        checksum: createHash('sha256').update(decoded.buffer).digest('hex'),
        alt_text: altText || null
      })
    })
    row = rows?.[0]
    if (!row?.id) {
      throw assetError(
        'Knowledge asset metadata could not be created',
        500,
        'asset_metadata_failed'
      )
    }
  } catch (error) {
    try {
      await fetch(storageUrl, {
        method: 'DELETE',
        headers
      })
    } catch {
      // Best effort: preserve the database failure while attempting cleanup.
    }
    throw error
  }

  return mapAsset(row)
}

export async function readKnowledgeAsset(ownerId, id) {
  const row = await findAsset(ownerId, id)
  const { baseUrl, bucket, headers } =
    getSupabaseStorageConfig(KNOWLEDGE_ASSET_BUCKET)
  const response = await fetch(
    `${baseUrl}/authenticated/${bucket}/${encodedStoragePath(row.storage_path)}`,
    { headers }
  )
  if (!response.ok) {
    await responseText(response)
    throw assetError(
      response.status === 404
        ? 'Knowledge asset not found'
        : 'Knowledge asset storage read failed',
      response.status === 404 ? 404 : 502,
      response.status === 404 ? 'asset_not_found' : 'asset_storage_failed'
    )
  }

  return {
    id: row.id,
    itemId: row.item_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    altText: row.alt_text || '',
    buffer: Buffer.from(await response.arrayBuffer())
  }
}

export async function deleteKnowledgeAsset(ownerId, id) {
  const row = await findAsset(ownerId, id)
  const { baseUrl, bucket, headers } =
    getSupabaseStorageConfig(KNOWLEDGE_ASSET_BUCKET)
  const response = await fetch(
    `${baseUrl}/${bucket}/${encodedStoragePath(row.storage_path)}`,
    {
      method: 'DELETE',
      headers
    }
  )
  if (!response.ok && response.status !== 404) {
    await responseText(response)
    throw assetError(
      'Knowledge asset storage delete failed',
      502,
      'asset_storage_failed'
    )
  }

  await supabaseRest(
    `/knowledge_assets?id=${eq(id)}&owner_id=${eq(ownerId)}`,
    { method: 'DELETE' }
  )
  return { id }
}
