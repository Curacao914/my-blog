import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  deleteKnowledgeAsset,
  readKnowledgeAsset
} from '@/lib/server/knowledgeAssets'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sendError(res, error) {
  if (
    error?.isKnowledgeAssetError === true ||
    error?.isKnowledgeRepositoryError === true
  ) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code
    })
  }
  console.error(
    'Knowledge asset item API failed',
    'Unexpected asset error'
  )
  return res.status(500).json({
    error: '轻知识图片服务暂时不可用',
    code: 'knowledge_asset_unavailable'
  })
}

function contentDisposition(originalName) {
  const name = String(originalName || 'knowledge-asset')
    .replace(/[\u0000-\u001f\u007f"\\]/g, '_')
    .slice(0, 200)
  const extension = name.match(/\.(?:jpe?g|png|webp|gif)$/i)?.[0] || ''
  return (
    `inline; filename="knowledge-asset${extension}"; ` +
    `filename*=UTF-8''${encodeURIComponent(name)}`
  )
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      error: auth.error,
      code: auth.code
    })
  }

  if (!['GET', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, DELETE')
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'method_not_allowed'
    })
  }

  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id
  if (!uuidPattern.test(id || '')) {
    return res.status(400).json({
      error: 'Invalid knowledge asset id',
      code: 'invalid_id'
    })
  }

  try {
    if (req.method === 'DELETE') {
      await deleteKnowledgeAsset(auth.profile.id, id)
      return res.status(200).json({ ok: true, id })
    }

    const asset = await readKnowledgeAsset(auth.profile.id, id)
    res.setHeader('Content-Type', asset.mimeType)
    res.setHeader(
      'Content-Disposition',
      contentDisposition(asset.originalName)
    )
    res.setHeader('Cache-Control', 'private,max-age=300')
    return res.status(200).send(asset.buffer)
  } catch (error) {
    return sendError(res, error)
  }
}
