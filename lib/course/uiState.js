export const COURSE_UI_STAGES = [
  { key: 'materials', label: '资料' }, { key: 'preferences', label: '偏好' }, { key: 'outline', label: '大纲' },
  { key: 'writing', label: '正文' }, { key: 'review', label: '审查' }, { key: 'assemble', label: '整理' }, { key: 'completed', label: '完成' }
]

const latestReview = node => (node?.reviewerReports || []).at(-1)?.value || null

function stageIndex(status = '') {
  if (status === 'imported') return 0
  if (['preflight_required', 'preflight_approved'].includes(status)) return 1
  if (['outline_pending', 'outline_generating', 'outline_review', 'outline_approved', 'node_planning'].includes(status)) return 2
  if (['node_pending', 'node_generating'].includes(status)) return 3
  if (['node_review', 'node_revision_required', 'node_approved'].includes(status)) return 4
  if (['assembly_pending', 'assembling', 'final_review', 'final_review_human'].includes(status)) return 5
  if (status === 'completed') return 6
  return 0
}

function copyFor(status, workflow, lesson, stats) {
  if (workflow?.cancelled || status === 'cancelled') return { stage: 'materials', explanation: '这项课程整理已经取消，已有资料和版本仍然保留。', primaryAction: null, blockedReason: '任务已取消', requiresHuman: true }
  if (status === 'failed') return { stage: 'review', explanation: '处理过程中遇到错误。查看诊断信息后，可以重试可恢复的步骤。', primaryAction: { type: 'retry', label: '重试失败步骤' }, blockedReason: workflow?.errors?.at(-1)?.message || '处理失败', requiresHuman: true }
  if (workflow?.paused || status === 'paused') return { stage: 'review', explanation: '后续处理已暂停，已有结果不会丢失。', primaryAction: { type: 'resume', label: '继续处理' }, blockedReason: '任务已暂停', requiresHuman: true }
  if (['imported', 'preflight_required'].includes(status)) return { stage: 'preferences', explanation: '先确认笔记用途、详细程度和课程写作规则。', primaryAction: { type: 'save-course-spec', label: '保存偏好并继续' }, requiresHuman: true }
  if (['preflight_approved', 'outline_pending', 'outline_generating'].includes(status)) return { stage: 'outline', explanation: '课程写作服务正在根据全部材料设计本课大纲。', primaryAction: { type: 'refresh', label: '刷新进度' }, requiresHuman: false }
  if (status === 'outline_review') return { stage: 'outline', explanation: '检查大纲结构、来源范围和重点后再批准。', primaryAction: { type: 'approve-outline', label: '批准大纲' }, requiresHuman: true }
  if (['outline_approved', 'node_planning'].includes(status)) return { stage: 'writing', explanation: '大纲已经确认，系统正在按来源范围创建正文节点。', primaryAction: { type: 'refresh', label: '刷新进度' }, requiresHuman: false }
  if (['node_pending', 'node_generating'].includes(status)) return { stage: 'writing', explanation: `正在逐段整理正文，已完成 ${stats.approvedNodes}/${stats.totalNodes} 个节点。`, primaryAction: { type: 'refresh', label: '刷新进度' }, requiresHuman: false }
  if (status === 'node_revision_required') return { stage: 'review', explanation: `有 ${stats.revisionNodes} 个节点需要修改。可以补充要求后交给课程写作服务局部重写。`, primaryAction: { type: 'open-revision', label: '处理待修改内容' }, requiresHuman: true }
  if (status === 'node_review') {
    const waiting = (lesson?.nodes || []).some(node => node.status === 'node_review' && latestReview(node)?.decision === 'approve')
    return { stage: 'review', explanation: waiting ? '审查已经通过，请逐个确认节点内容。' : '正文正在接受独立审查，问题会定位到具体节点和来源。', primaryAction: waiting ? { type: 'open-review', label: '确认已通过内容' } : { type: 'refresh', label: '刷新审查进度' }, requiresHuman: waiting }
  }
  if (status === 'assembly_pending') return { stage: 'assemble', explanation: '所有节点已确认，系统可以整理最终笔记并进行整体检查。', primaryAction: { type: 'refresh', label: '查看整理进度' }, requiresHuman: false }
  if (status === 'assembling') return { stage: 'assemble', explanation: '正在按照大纲顺序整理最终笔记。', primaryAction: { type: 'refresh', label: '刷新进度' }, requiresHuman: false }
  if (status === 'final_review') return { stage: 'assemble', explanation: '最终笔记正在进行整体一致性和来源覆盖检查。', primaryAction: { type: 'refresh', label: '刷新检查结果' }, requiresHuman: false }
  if (status === 'final_review_human') return { stage: 'assemble', explanation: '最终检查需要你的判断。确认内容无误后即可完成本课。', primaryAction: { type: 'approve-final-review', label: '确认最终笔记' }, requiresHuman: true }
  if (status === 'completed') return { stage: 'completed', explanation: '本课笔记已经完成，可以阅读、编辑和导出。', primaryAction: { type: 'export', label: '导出 Markdown' }, requiresHuman: false }
  return { stage: 'materials', explanation: '选择课程资料后开始整理。', primaryAction: null, requiresHuman: false }
}

export function getCourseUiState(workflow = {}, lesson = {}) {
  const nodes = lesson?.nodes || []
  const status = lesson?.status || workflow?.status || 'preflight_required'
  const stats = {
    totalNodes: nodes.length, approvedNodes: nodes.filter(node => node.status === 'node_approved').length,
    revisionNodes: nodes.filter(node => node.status === 'node_revision_required').length,
    reviewNodes: nodes.filter(node => node.status === 'node_review').length,
    pendingNodes: nodes.filter(node => ['node_pending', 'node_generating'].includes(node.status)).length,
    failedNodes: nodes.filter(node => node.status === 'failed').length
  }
  const copy = copyFor(status, workflow, lesson, stats)
  const current = COURSE_UI_STAGES.findIndex(item => item.key === copy.stage)
  return { ...copy, stageLabel: COURSE_UI_STAGES[current]?.label || '资料', status, currentStageIndex: Math.max(0, current), stats,
    canPause: !workflow?.paused && !['completed', 'cancelled'].includes(workflow?.status), canResume: Boolean(workflow?.paused || workflow?.status === 'paused'),
    stages: COURSE_UI_STAGES.map((item, index) => ({ ...item, complete: index < current || status === 'completed', current: index === current, locked: index > current })) }
}
