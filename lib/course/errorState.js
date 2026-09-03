const STEP_LABELS = {
  'generate-outline': '生成大纲',
  'plan-nodes': '准备正文节点',
  'write-node': '整理正文',
  'review-node': '审查正文',
  'revise-node': '修改正文',
  assemble: '整理全文',
  'final-review': '最终检查',
  'run-next': '课程处理'
}

function errorMessage(error) {
  return String(error?.message || '').trim()
}

export function getCurrentCourseError(workflow) {
  const errors = Array.isArray(workflow?.errors) ? workflow.errors : []
  if (!errors.length) return null

  if (workflow?.activeErrorId) {
    const active = errors.find(error => error?.id === workflow.activeErrorId)
    if (active && !active.resolvedAt) return active
  }

  if (workflow?.status !== 'failed') return null
  return [...errors].reverse().find(error => error && !error.resolvedAt) || errors.at(-1) || null
}

export function getCourseErrorHistory(workflow, { excludeCurrent = true } = {}) {
  const errors = Array.isArray(workflow?.errors) ? workflow.errors : []
  const current = excludeCurrent ? getCurrentCourseError(workflow) : null
  const seen = new Set()

  return [...errors].reverse().filter(error => {
    if (!error || (current && error.id === current.id)) return false
    const message = errorMessage(error)
    if (!message) return false
    const key = `${String(error.step || '')}\u0000${message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatCourseWorkflowError(error, fallback = '课程处理失败') {
  const message = errorMessage(error) || fallback
  const step = String(error?.step || '').trim()
  const label = STEP_LABELS[step] || step
  return label ? `${message} · 阶段：${label}` : message
}
