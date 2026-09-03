import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { getSupabaseStorageConfig } from '@/lib/db/client'

const TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}
const MAX_BYTES = 2 * 1024 * 1024

function decodeImage(value = '') {
  const match = String(value || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('仅支持 JPG、PNG 或 WebP 图片')
  const mime = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > MAX_BYTES) throw new Error('图片大小需要在 2MB 以内')
  return { mime, buffer, extension: TYPES[mime] }
}

function safeKind(value = '') {
  const kind = String(value || '').trim().toLowerCase()
  return ['avatar', 'school-1', 'school-2'].includes(kind) ? kind : 'image'
}

export const config = {
  api: { bodyParser: { sizeLimit: '3mb' } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    const { mime, buffer, extension } = decodeImage(req.body?.data)
    const kind = safeKind(req.body?.kind)
    const { baseUrl, bucket, headers } = getSupabaseStorageConfig()
    const owner = String(auth.actorProfile?.id || 'owner').replace(/[^a-zA-Z0-9_-]/g, '')
    const path = `site-profile/${owner}/${kind}-${Date.now()}.${extension}`
    const response = await fetch(`${baseUrl}/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': mime,
        'x-upsert': 'true'
      },
      body: buffer
    })
    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || '图片上传失败')
    }
    const origin = baseUrl.replace(/\/storage\/v1\/object$/, '')
    return res.status(200).json({
      ok: true,
      url: `${origin}/storage/v1/object/public/${bucket}/${path}`
    })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : '图片上传失败' })
  }
}
