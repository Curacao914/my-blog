import { profileCan } from '@/lib/auth/permissions'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

export async function requireCourseWorkspace(req, options = {}) {
  const auth = await requireWorkspaceRequest(req, { permission: 'courses' })
  if (!auth.ok) return auth
  if (!options.ai) return auth
  if (!profileCan(auth.profile, 'ai')) {
    return { ...auth, ok: false, status: 403, code: 'permission_denied', error: '当前账号没有 AI 使用权限' }
  }
  const modelConfig = await resolveUserAiConfig(auth.profile)
  if (!modelConfig.apiKey) {
    return {
      ...auth,
      ok: false,
      status: 503,
      code: 'ai_not_configured',
      error: '当前账号尚未配置课程整理所需的 AI API'
    }
  }
  return { ...auth, modelConfig }
}
