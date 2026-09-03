export const WORKSPACE_PERMISSION_DEFINITIONS = [
  { key: 'schedule', label: '日程与事项', description: '查看和管理自己的 Today、Tasks 与日程。' },
  { key: 'notes', label: '随手记', description: '查看和管理自己的随手记。' },
  { key: 'reading', label: '阅读箱', description: '查看和整理自己的阅读材料。' },
  { key: 'courses', label: '课程整理', description: '查看和整理自己的课程资料与笔记库。' },
  { key: 'writing', label: '写作', description: '使用写作汇总与后续 Writing Studio。' },
  { key: 'reminders', label: '邮件提醒', description: '配置自己的收件邮箱和提醒策略。' },
  { key: 'ai', label: 'AI 配置', description: '保存并使用自己的模型 API 与模型设置。' },
  { key: 'publish', label: '公开发布', description: '把自己的内容发布到公开站点。' }
]

export const WORKSPACE_PERMISSION_KEYS = WORKSPACE_PERMISSION_DEFINITIONS.map(item => item.key)

export const DEFAULT_MEMBER_PERMISSIONS = Object.freeze({
  schedule: true,
  notes: true,
  reading: true,
  courses: true,
  writing: true,
  reminders: true,
  ai: true,
  publish: false
})

export const OWNER_PERMISSIONS = Object.freeze(
  Object.fromEntries(WORKSPACE_PERMISSION_KEYS.map(key => [key, true]))
)

export function normalizeWorkspaceRole(value) {
  return value === 'owner' ? 'owner' : 'member'
}

export function normalizeWorkspaceStatus(value) {
  if (value === 'active' || value === 'suspended' || value === 'pending') return value
  return 'pending'
}

export function normalizeWorkspacePermissions(value = {}, role = 'member') {
  if (normalizeWorkspaceRole(role) === 'owner') return { ...OWNER_PERMISSIONS }
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    WORKSPACE_PERMISSION_KEYS.map(key => [
      key,
      Object.prototype.hasOwnProperty.call(source, key)
        ? Boolean(source[key])
        : DEFAULT_MEMBER_PERMISSIONS[key]
    ])
  )
}

export function profileCan(profile, permission) {
  if (!permission) return true
  if (!profile || normalizeWorkspaceStatus(profile.status) !== 'active') return false
  if (normalizeWorkspaceRole(profile.role) === 'owner') return true
  return Boolean(normalizeWorkspacePermissions(profile.permissions, profile.role)[permission])
}

export function publicWorkspaceProfile(profile = {}) {
  return {
    id: profile.id || '',
    clerkUserId: profile.clerk_user_id || profile.clerkUserId || '',
    email: profile.email || '',
    displayName: profile.display_name || profile.displayName || '',
    avatarUrl: profile.avatar_url || profile.avatarUrl || '',
    role: normalizeWorkspaceRole(profile.role),
    status: normalizeWorkspaceStatus(profile.status),
    permissions: normalizeWorkspacePermissions(profile.permissions, profile.role),
    createdAt: profile.created_at || profile.createdAt || null,
    updatedAt: profile.updated_at || profile.updatedAt || null
  }
}
