import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { storeKnowledgeAsset } from '@/lib/server/knowledgeAssets'

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

  try {
    const asset = await storeKnowledgeAsset(
      auth.profile.id,
      req.body?.itemId,
      req.body || {}
    )
    return res.status(201).json({ asset })
  } catch (error) {
    return sendError(res, error)
  }
}
