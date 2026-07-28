import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { storeKnowledgeAsset } from '@/lib/server/knowledgeAssets'

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
    'Knowledge asset collection API failed',
    'Unexpected asset error'
  )
  return res.status(500).json({
    error: '轻知识图片服务暂时不可用',
    code: 'knowledge_asset_unavailable'
  })
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb'
    }
  }
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      error: auth.error,
      code: auth.code
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'method_not_allowed'
    })
  }

  const itemId = req.body?.itemId
  if (!uuidPattern.test(itemId || '')) {
    return res.status(400).json({
      error: '无效的内容编号',
      code: 'invalid_id'
    })
  }

  try {
    const asset = await storeKnowledgeAsset(
      auth.profile.id,
      itemId,
      req.body || {}
    )
    return res.status(201).json({ asset })
  } catch (error) {
    return sendError(res, error)
  }
}
