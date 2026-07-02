import { publicWorkspaceProfile } from '@/lib/auth/permissions'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { updateWorkspaceProfile } from '@/lib/server/workspaceProfiles'

function normalizeDisplayName(value) {
  return String(value || '').trim().slice(0, 80)
}

function normalizeAvatarUrl(value) {
  const source = String(value || '').trim()
  if (!source) return ''
  if (source.length > 2048) throw new Error('头像 URL 过长')
  let parsed
  try {
    parsed = new URL(source)
  } catch {
    throw new Error('请输入有效的头像图片 URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('头像 URL 仅支持 HTTP 或 HTTPS')
  return parsed.toString()
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireWorkspaceRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  if (auth.impersonating) {
    return res.status(409).json({ ok: false, error: '测试身份下不能修改成员资料，请退出测试身份后管理' })
  }

  try {
    const profile = await updateWorkspaceProfile(auth.actorProfile.id, {
      displayName: normalizeDisplayName(req.body?.displayName),
      avatarUrl: normalizeAvatarUrl(req.body?.avatarUrl)
    })
    return res.status(200).json({ ok: true, profile: publicWorkspaceProfile(profile) })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : '资料保存失败' })
  }
}
