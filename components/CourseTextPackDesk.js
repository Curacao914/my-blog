import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'

import { useCourseTaskManager } from '@/components/CourseTaskManager'
import {
  applyAiGroupingSuggestion,
  applyOcrResultToMaterial,
  buildMaterialGroupingIndex,
  materialFileKey,
  materialRangeExtent,
  materialRangeUnit,
  materialsToTextPackInput,
  parseCourseMaterialFiles,
  suggestLessonWorkspace,
  wholeMaterialAssignment
} from '@/lib/course/materialParsers'
import { formatCourseApiError, requestCourseJson } from '@/lib/course/clientApi'
import { formatCourseWorkflowError, getCourseErrorHistory, getCurrentCourseError } from '@/lib/course/errorState'
import { buildTextPack, safeName, summarizeTextPack } from '@/lib/course/textpack'
import { getCourseUiState } from '@/lib/course/uiState'
import { countCourseNoteChars } from '@/lib/course/markdownStats'

const ROLE_OPTIONS = [
  ['transcript', '课堂转录'],
  ['slides', '课件'],
  ['handout', '教师讲义'],
  ['supplement', '补充材料'],
  ['existing_note', '已有笔记']
]
const KIND_LABELS = { transcript: '课堂转录', deck: '课件', document: '文档', markdown: 'Markdown', note: '已有笔记', ocr: '扫描资料' }
const AUTO_STATUSES = new Set(['preflight_approved', 'outline_pending', 'outline_generating', 'outline_approved', 'node_planning', 'node_pending', 'node_generating', 'node_review', 'node_revision_required', 'assembly_pending', 'assembling', 'final_revision_required', 'final_review'])

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function defaultCourseName(files) {
  const first = files[0]?.name || ''
  return safeName(first.replace(/\.[^.]+$/, '').replace(/第\s*\d+\s*[讲课节].*$/, ''), '未命名课程')
}

function inferredRole(file) {
  const ext = String(file?.name || '').split('.').pop()?.toLowerCase()
  if (ext === 'srt') return 'transcript'
  if (ext === 'pptx' || ext === 'ppt') return 'slides'
  if (ext === 'docx' || ext === 'doc' || ext === 'pdf') return 'handout'
  if (ext === 'md' || ext === 'markdown') return 'existing_note'
  return 'supplement'
}

function humanStatus(status) {
  return ({
    preflight_required: '等待确认偏好', preflight_approved: '准备生成大纲', outline_pending: '等待生成大纲', outline_generating: '正在生成大纲',
    outline_review: '等待确认大纲', outline_approved: '大纲已确认', node_planning: '正在准备正文', node_pending: '等待整理正文',
    node_generating: '正在整理正文', node_review: '审查处理中', node_revision_required: '修改处理中', node_human_review: '需要人工处理', node_failed: '节点处理失败', assembly_pending: '等待整理全文',
    assembling: '正在整理全文', final_revision_required: '修改最终笔记', note_removed: '最终笔记已删除', final_review: '正在进行最终检查', final_review_human: '最终检查异常', completed: '已完成', paused: '已暂停', failed: '处理失败', cancelled: '已取消'
  })[status] || '准备中'
}



function nodeStatusLabel(node, activeLease) {
  if (activeLease?.taskType === 'write-node') return '写作中'
  if (activeLease?.taskType === 'review-node') return '审查中'
  if (activeLease?.taskType === 'revise-node') return '修改中'
  if ((node?.blockedByNodeIds || []).length) return '等待前文修订'
  return ({
    node_pending: '等待写作',
    node_review: '等待审查',
    node_revision_required: '等待修改',
    node_human_review: '需处理',
    node_failed: '失败',
    node_approved: '已通过'
  })[node?.status] || humanStatus(node?.status)
}

function nodeStatusGroup(node, activeLease) {
  if (activeLease) return 'active'
  if (['node_human_review', 'node_failed'].includes(node?.status)) return 'attention'
  if (node?.status === 'node_approved') return 'approved'
  return 'waiting'
}

function latestReview(node) {
  return node?.reviewerReports?.at?.(-1)?.value || null
}

function reviewDecisionLabel(decision) {
  return ({ approve: '通过', revise: '需要修改', human_review: '需要人工判断', human_approved: '人工确认' })[decision] || '等待检查'
}

function LoadingLine({ label, detail }) {
  return <div className='course-loading-line' role='status'><i aria-hidden='true' /><span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span></div>
}

function ServiceLights({ capabilities }) {
  const services = [
    { label: 'OCR', ok: Boolean(capabilities?.onlineOcr?.configured), detail: capabilities?.onlineOcr?.configured ? '在线文字识别可用' : '在线文字识别未配置' },
    { label: '写作', ok: Boolean(capabilities?.courseWriting?.configured), detail: capabilities?.courseWriting?.configured ? '课程写作可用' : '课程写作未配置' }
  ]
  return <div className='course-service-lights' aria-label='服务状态'>{services.map(service => <span key={service.label} className={service.ok ? 'is-online' : 'is-offline'} title={service.detail}><i aria-hidden='true' />{service.label}</span>)}</div>
}

function ProgressStepper({ ui }) {
  return <ol className='course-stepper' aria-label='课程整理进度'>{ui.stages.map((stage, index) => <li key={stage.key} className={`${stage.complete ? 'is-complete' : ''} ${stage.current ? 'is-current' : ''} ${stage.locked ? 'is-locked' : ''}`}><i>{stage.complete ? '✓' : index + 1}</i><span>{stage.label}</span></li>)}</ol>
}

function CoursePreferences({ value, onChange, onSave, busy }) {
  return <section className='course-stage-card'>
    <div className='course-stage-heading'><div><span>偏好</span><h3>确定笔记整理方式</h3></div><p>这些规则会同时用于大纲、正文和审查。</p></div>
    <div className='course-form-grid three'>
      <label>笔记用途<select value={value.goal || '全面笔记'} onChange={event => onChange({ ...value, goal: event.target.value })}><option>全面笔记</option><option>闭卷复习</option><option>案例训练</option><option>快速回顾</option></select></label>
      <label>详细程度<select value={value.detailLevel || 'high'} onChange={event => onChange({ ...value, detailLevel: event.target.value })}><option value='compact'>紧凑</option><option value='high'>详细</option><option value='exam'>闭卷复习</option></select></label>
      <label>课堂口语<select value={value.preserveOralStyle || 'clean'} onChange={event => onChange({ ...value, preserveOralStyle: event.target.value })}><option value='clean'>整理为书面表达</option><option value='selective'>保留关键原话</option><option value='preserve'>尽量保留</option></select></label>
      <label>法条处理<select value={value.statuteMode || 'explain-when-mentioned'} onChange={event => onChange({ ...value, statuteMode: event.target.value })}><option value='explain-when-mentioned'>出现时展开</option><option value='table'>集中整理</option><option value='minimal'>仅保留引用</option></select></label>
      <label>案例处理<select value={value.caseMode || 'extract-facts-issue-rule'} onChange={event => onChange({ ...value, caseMode: event.target.value })}><option value='extract-facts-issue-rule'>完整整理</option><option value='brief'>简要提及</option></select></label>
      <label>自动审查<select value={String(value.qualityThreshold || 75)} onChange={event => onChange({ ...value, qualityThreshold: Number(event.target.value) })}><option value='70'>宽松</option><option value='75'>适中</option><option value='85'>严格</option></select></label>
      <label>审查并发<select value={String(value.reviewConcurrency || 2)} onChange={event => onChange({ ...value, reviewConcurrency: Number(event.target.value) })}><option value='1'>1 个节点</option><option value='2'>2 个节点</option><option value='3'>3 个节点</option></select></label>
    </div>
    <label className='course-wide-label'>补充要求<textarea value={value.fixedStyle || ''} onChange={event => onChange({ ...value, fixedStyle: event.target.value })} placeholder='例如：老师的个人观点单独标记；案例必须保留事实、争点、结论和论证意义。' /></label>
    <div className='course-primary-row'><button className='soft-button primary' type='button' disabled={busy} onClick={onSave}>{busy ? '正在保存…' : '保存偏好并继续'}</button></div>
  </section>
}

function OutlineEditor({ lesson, onSave, onApprove, busy, onlineBusy }) {
  const [outline, setOutline] = useState(lesson.outline || [])
  useEffect(() => setOutline(lesson.outline || []), [lesson.key, lesson.outline])
  function update(index, patch) { setOutline(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch, userEdited: true } : item)) }
  function move(index, direction) { const target = index + direction; if (target < 0 || target >= outline.length) return; setOutline(items => { const next = [...items]; const [current] = next.splice(index, 1); next.splice(target, 0, current); return next.map(item => ({ ...item, userEdited: true })) }) }
  function remove(index) { setOutline(items => items.filter((_, itemIndex) => itemIndex !== index)) }
  function add() { const last = outline.at(-1); const start = Number(last?.lineRange?.[1] || 0) + 1; setOutline(items => [...items, { id: `outline-user-${Date.now()}`, title: '新节点', lineRange: [start, start], slideRange: [1, 1], rationale: '', importance: 'normal', locked: false, userEdited: true, concepts: [], statutes: [], cases: [] }]) }
  if (!outline.length) return <section className='course-stage-card'><LoadingLine label={onlineBusy ? '正在生成大纲…' : '等待生成大纲'} /></section>
  return <section className='course-stage-card'>
    <div className='course-stage-heading'><div><span>大纲</span><h3>确认本课结构</h3></div><p>检查标题和来源范围，锁定后不会被自动覆盖。</p></div>
    <div className='course-outline-list'>{outline.map((node, index) => <article className='course-outline-item' key={node.id || index}>
      <div className='course-outline-order'>{index + 1}</div>
      <div className='course-outline-fields'>
        <label>节点标题<input value={node.title || ''} onChange={event => update(index, { title: event.target.value })} /></label>
        <div className='course-range-grid'><label>转录起始行<input type='number' min='1' value={node.lineRange?.[0] || 1} onChange={event => update(index, { lineRange: [Number(event.target.value), Number(node.lineRange?.[1] || event.target.value)] })} /></label><label>结束行<input type='number' min='1' value={node.lineRange?.[1] || 1} onChange={event => update(index, { lineRange: [Number(node.lineRange?.[0] || 1), Number(event.target.value)] })} /></label><label>课件起始页<input type='number' min='1' value={node.slideRange?.[0] || 1} onChange={event => update(index, { slideRange: [Number(event.target.value), Number(node.slideRange?.[1] || event.target.value)] })} /></label><label>结束页<input type='number' min='1' value={node.slideRange?.[1] || 1} onChange={event => update(index, { slideRange: [Number(node.slideRange?.[0] || 1), Number(event.target.value)] })} /></label></div>
        <label>本节点要解决什么<textarea value={node.rationale || ''} onChange={event => update(index, { rationale: event.target.value })} /></label>
      </div>
      <div className='course-outline-actions'><button type='button' onClick={() => move(index, -1)} disabled={index === 0}>上移</button><button type='button' onClick={() => move(index, 1)} disabled={index === outline.length - 1}>下移</button><button type='button' className={node.locked ? 'is-active' : ''} onClick={() => update(index, { locked: !node.locked })}>{node.locked ? '已锁定' : '锁定'}</button><button type='button' className='danger' onClick={() => remove(index)}>删除</button></div>
    </article>)}<button type='button' className='course-add-outline' onClick={add}>＋ 添加大纲节点</button></div>
    <div className='course-primary-row'><button className='soft-button' type='button' disabled={busy || !outline.length} onClick={() => onSave(outline)}>保存修改</button><button className='soft-button primary' type='button' disabled={busy || !outline.length} onClick={() => onApprove(outline)}>批准大纲</button></div>
  </section>
}

function ReviewIssueGroup({ title, issues, tone }) {
  if (!issues.length) return null
  return <section className={`course-review-issues is-${tone}`}><h5>{title}</h5><ul>{issues.map((issue, index) => <li key={issue.id || index}><span>{issue.message || issue.detail || issue.type}</span>{issue.sourceRange ? <small>{issue.sourceRange}</small> : null}</li>)}</ul></section>
}

function ReviewReport({ report }) {
  if (!report) return <p className='empty-copy'>正文生成后会自动进行独立检查。</p>
  const scores = [['覆盖', report.coverage], ['依据', report.grounding], ['逻辑', report.logic], ['细节', report.detail], ['来源', report.sourceCoverage]]
  const issues = (report.issues || []).map(issue => typeof issue === 'string' ? { message: issue, severity: 'important' } : issue)
  const blocking = issues.filter(issue => issue.severity === 'blocking')
  const important = issues.filter(issue => issue.severity === 'important' || !issue.severity)
  const suggestions = issues.filter(issue => issue.severity === 'suggestion')
  return <div className={`course-review-report decision-${report.decision || 'pending'}`}>
    <header><div><strong>{reviewDecisionLabel(report.decision)}</strong><span>审查结果</span></div>{report.summary ? <p>{report.summary}</p> : null}</header>
    <div className='course-review-scores'>{scores.map(([label, value]) => <div key={label}><span>{label}</span><b>{Number(value || 0)}</b></div>)}</div>
    <ReviewIssueGroup title='必须修正' issues={blocking} tone='blocking' />
    <ReviewIssueGroup title='注意事项' issues={important} tone='important' />
    <ReviewIssueGroup title='优化建议' issues={suggestions} tone='suggestion' />
    {!issues.length ? <p className='course-review-clear'>没有发现影响准确性或学习效果的问题。</p> : null}
  </div>
}

function NodeWorkbench({ lesson, taskLeases = [], onAction, busy }) {
  const nodes = lesson.nodes || []
  const [selectedId, setSelectedId] = useState(nodes[0]?.id || '')
  const [filter, setFilter] = useState('all')
  const selected = nodes.find(node => node.id === selectedId) || nodes[0]
  const [draft, setDraft] = useState(selected?.draft || '')
  const [request, setRequest] = useState('')
  const [humanReason, setHumanReason] = useState('')
  const [activePane, setActivePane] = useState('draft')
  const [focusMode, setFocusMode] = useState(false)
  const leaseByNode = useMemo(() => new Map((taskLeases || []).filter(lease => lease.nodeId).map(lease => [lease.nodeId, lease])), [taskLeases])
  const counts = useMemo(() => nodes.reduce((value, node) => {
    const group = nodeStatusGroup(node, leaseByNode.get(node.id))
    value[group] += 1
    return value
  }, { active: 0, attention: 0, approved: 0, waiting: 0 }), [nodes, leaseByNode])
  const visibleNodes = filter === 'all' ? nodes : nodes.filter(node => nodeStatusGroup(node, leaseByNode.get(node.id)) === filter)
  const visibleNodeIds = visibleNodes.map(node => node.id).join('|')

  useEffect(() => {
    const next = nodes.find(node => node.id === selectedId) || nodes[0]
    if (next && next.id !== selectedId) setSelectedId(next.id)
    setDraft(next?.draft || '')
    setRequest('')
    setHumanReason('')
    setActivePane(['node_revision_required', 'node_human_review', 'node_failed'].includes(next?.status) ? 'review' : 'draft')
  }, [lesson.key, selectedId, selected?.draft, selected?.status, nodes.length])

  useEffect(() => {
    if (visibleNodes.length && !visibleNodes.some(node => node.id === selectedId)) setSelectedId(visibleNodes[0].id)
  }, [filter, selectedId, visibleNodeIds])

  useEffect(() => setFocusMode(false), [lesson.key, selectedId])

  useEffect(() => {
    if (!focusMode || typeof document === 'undefined') return undefined
    const onKeyDown = event => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    document.documentElement.classList.add('course-focus-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.documentElement.classList.remove('course-focus-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [focusMode])

  if (!nodes.length) return <section className='course-stage-card'><LoadingLine label='正在准备正文…' /></section>

  const report = latestReview(selected)
  const reviewIsCurrent = Number(report?.reviewedDraftVersion || 0) === Number(selected?.versions?.length || 0)
  const needsHuman = selected?.status === 'node_human_review' && reviewIsCurrent
  const needsRevision = selected?.status === 'node_revision_required'
  const failed = selected?.status === 'node_failed'
  const selectedLease = leaseByNode.get(selected?.id)
  const panes = [
    ['draft', '正文'],
    ['review', `审查${report?.issues?.length ? ` ${report.issues.length}` : ''}`],
    ['source', '来源'],
    ['versions', `版本 ${selected?.versions?.length || 0}`]
  ]
  const filters = [
    ['all', '全部', nodes.length],
    ['active', '处理中', counts.active],
    ['attention', '需处理', counts.attention],
    ['waiting', '等待', counts.waiting],
    ['approved', '已通过', counts.approved]
  ]

  return <section className='course-stage-card course-node-workbench'>
    <div className='course-stage-heading compact'>
      <div><span>正文与审查</span><h3>逐节点整理</h3></div>
      <p>正文按顺序生成，独立审查与局部修订在后台衔接。</p>
    </div>
    <div className='course-node-filters' aria-label='节点筛选'>{filters.map(([key, label, count]) => <button key={key} type='button' className={filter === key ? 'active' : ''} onClick={() => setFilter(key)} disabled={key !== 'all' && !count}>{label}<b>{count}</b></button>)}</div>
    <div className='course-node-layout'>
      <nav className='course-node-nav' aria-label='正文节点'>
        {visibleNodes.map(node => {
          const lease = leaseByNode.get(node.id)
          const group = nodeStatusGroup(node, lease)
          const index = nodes.findIndex(item => item.id === node.id)
          return <button key={node.id} type='button' className={`${node.id === selected?.id ? 'active' : ''} status-${group}`} onClick={() => setSelectedId(node.id)}>
            <i>{index + 1}</i>
            <span><b>{node.title}</b><small>{nodeStatusLabel(node, lease)}</small></span>
          </button>
        })}
      </nav>

      {selected ? <>{focusMode ? <button className='course-focus-backdrop' type='button' aria-label='退出专注查看' onClick={() => setFocusMode(false)} /> : null}<div className={`course-node-editor${focusMode ? ' is-focus-mode' : ''}`}>
        <header className='course-node-editor-head'>
          <div>
            <span>转录 {selected.lineRange?.join('–')} 行 · 课件 {selected.slideRange?.join('–')} 页</span>
            <h4>{selected.title}</h4>
          </div>
          <strong className={`status-${nodeStatusGroup(selected, selectedLease)}`}>{nodeStatusLabel(selected, selectedLease)}</strong>
        </header>

        <div className='course-editor-toolbar'>
          <nav className='course-editor-tabs' aria-label='节点工作区'>
            {panes.map(([key, label]) => <button key={key} type='button' aria-pressed={activePane === key} onClick={() => setActivePane(key)}>{label}</button>)}
          </nav>
          <button className='course-focus-toggle' type='button' aria-pressed={focusMode} onClick={() => setFocusMode(value => !value)}>{focusMode ? '退出专注' : '专注查看'}</button>
        </div>

        <div className='course-editor-pane'>
          {activePane === 'draft' ? <div className='course-draft-pane'>
            <label>节点正文<textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder='正文会自动生成，也可以在这里修改。' /></label>
            <footer className='course-editor-footer'>
              <span>{draft.length.toLocaleString('zh-CN')} 字 · {selected.status === 'node_approved' ? '已通过审查' : reviewIsCurrent ? '审查与当前版本一致' : report ? '修改后会重新审查' : '等待审查'}</span>
              <div className='course-primary-row'><button className='soft-button' type='button' disabled={busy || !draft.trim()} onClick={() => onAction({ type: 'save-node-draft', lessonKey: lesson.key, nodeId: selected.id, markdown: draft }, '节点草稿已保存。')}>保存草稿</button></div>
            </footer>
          </div> : null}

          {activePane === 'review' ? <div className='course-review-pane'>
            <div className='course-review-scroll'>
              {!reviewIsCurrent && report ? <p className='empty-copy'>正文已修改，系统会根据当前版本重新检查。</p> : <ReviewReport report={report} />}
              {needsRevision ? <p className='course-auto-action'>审查发现实质问题，本节点已自动进入修改队列；其他节点仍会继续处理。</p> : null}
              {(selected.blockedByNodeIds || []).length ? <p className='course-auto-action'>前文存在可能影响本节点的实质修改；前文通过后，本节点会自动重新检查一致性。</p> : null}
              {failed ? <div className='course-node-error'><strong>节点处理失败</strong><p>{selected.taskError?.message || '自动重试仍未成功，请重新加入队列。'}</p></div> : null}
            </div>
            {(needsRevision || needsHuman || failed) ? <div className='course-review-actions'>
              {needsRevision ? <details className='course-optional-revision'><summary>补充修改要求（可选）</summary><label>需要额外提醒系统什么？<textarea rows={3} value={request} onChange={event => setRequest(event.target.value)} placeholder='审查结论已经自动传给修订模型；这里只填写你想额外补充的要求。' /></label><div className='course-primary-row'><button className='soft-button' type='button' disabled={busy || !request.trim()} onClick={() => onAction({ type: 'request-node-revision', lessonKey: lesson.key, nodeId: selected.id, request }, '补充修改要求已加入。')}>加入本次修改</button></div></details> : null}
              {needsHuman ? <label>人工判断说明或修改要求<textarea rows={3} value={humanReason} onChange={event => setHumanReason(event.target.value)} placeholder='说明为何接受当前版本，或填写希望系统如何修改。' /></label> : null}
              {(needsHuman || failed) ? <div className='course-primary-row'>
                {needsHuman && humanReason.trim() ? <button className='soft-button' type='button' disabled={busy} onClick={() => onAction({ type: 'request-node-revision', lessonKey: lesson.key, nodeId: selected.id, request: humanReason }, '节点已进入修改队列。')}>按说明修改</button> : null}
                {needsHuman ? <button className='soft-button primary' type='button' disabled={busy || !humanReason.trim()} onClick={() => onAction({ type: 'approve-node-human', lessonKey: lesson.key, nodeId: selected.id, reason: humanReason }, '节点已由你确认。')}>人工确认通过</button> : null}
                {failed ? <button className='soft-button primary' type='button' disabled={busy} onClick={() => onAction({ type: 'retry-node', lessonKey: lesson.key, nodeId: selected.id }, '节点已重新加入处理队列。')}>重试此节点</button> : null}
              </div> : null}
            </div> : null}
          </div> : null}

          {activePane === 'source' ? <div className='course-source-pane'>
            <section><header><strong>课堂转录</strong><span>{selected.lineRange?.join('–')} 行</span></header><pre>{selected.sourceText || '没有可显示的转录来源。'}</pre></section>
            {selected.pptText ? <section><header><strong>课件</strong><span>{selected.slideRange?.join('–')} 页</span></header><pre>{selected.pptText}</pre></section> : null}
          </div> : null}

          {activePane === 'versions' ? <div className='course-version-pane'>
            {(selected.versions || []).length ? [...selected.versions].reverse().map((version, index) => {
              const value = String(version.value || version.markdown || version.draft || '')
              return <article key={version.id || version.version || index}>
                <div><strong>版本 {version.version || (selected.versions || []).length - index}</strong><span>{version.at || version.createdAt ? new Date(version.at || version.createdAt).toLocaleString('zh-CN') : '已保存'} · {({ writer: '首次生成', revision: '自动修订', user: '人工修改' })[version.source] || '已保存'}</span></div>
                <p>{version.summary || (value ? `正文预览：${value.slice(0, 260)}` : '此版本未保存正文预览。')}</p>
                {value ? <details><summary>查看这一版</summary><pre>{value}</pre></details> : null}
              </article>
            }) : <p className='empty-copy'>当前还没有历史版本。</p>}
          </div> : null}
        </div>
      </div></> : <div className='course-empty-state'><strong>当前筛选下没有节点</strong><p>切换到“全部”查看完整列表。</p></div>}
    </div>
  </section>
}

function TrashedNoteStage({ lesson, onAction, busy }) {
  const deletedAt = lesson.noteDeletion?.deletedAt
  async function purge() {
    if (typeof window === 'undefined') return
    if (!window.confirm('永久删除本课最终笔记和最终版本？原始材料、大纲和节点正文会保留。')) return
    const confirmation = window.prompt('这是不可撤销操作。请输入“永久删除”继续：', '')
    if (confirmation !== '永久删除') return
    await onAction({ type: 'purge-lesson-note', lessonKey: lesson.key }, '最终笔记已永久删除。', false)
  }

  return <section className='course-stage-card course-note-trash-card'>
    <div className='course-stage-heading'>
      <div><span>回收站</span><h3>本课笔记已移入回收站</h3></div>
      <p>正文和历史版本仍然保留；恢复前不会参与笔记库展示。</p>
    </div>
    <div className='course-note-trash-meta'>
      <span>课次</span><strong>{lesson.title}</strong>
      <small>{deletedAt ? `移除时间：${new Date(deletedAt).toLocaleString('zh-CN')}` : '已移入回收站'}</small>
    </div>
    <div className='course-primary-row'>
      <button className='soft-button primary' type='button' disabled={busy} onClick={() => onAction({ type: 'restore-lesson-note', lessonKey: lesson.key }, '笔记已恢复。', false)}>恢复笔记</button>
      <button className='soft-button danger' type='button' disabled={busy} onClick={() => void purge()}>永久删除</button>
    </div>
  </section>
}

function RemovedNoteStage({ lesson, onAction, busy }) {
  return <section className='course-stage-card course-note-trash-card'>
    <div className='course-stage-heading'>
      <div><span>最终成果</span><h3>最终笔记已永久删除</h3></div>
      <p>原始材料、大纲、节点正文和节点审查仍然保留，不需要从头整理。</p>
    </div>
    <div className='course-note-trash-meta'>
      <span>可以继续</span>
      <strong>从已经批准的节点重新拼装最终笔记</strong>
      <small>重新生成会调用一次接缝整理模型，完成后会自动检查并结束。</small>
    </div>
    <div className='course-primary-row'>
      <button className='soft-button primary' type='button' disabled={busy} onClick={() => onAction({ type: 'regenerate-lesson-note', lessonKey: lesson.key }, '最终笔记已进入重新生成队列。')}>重新生成笔记</button>
    </div>
  </section>
}

function FinalNoteStage({ jobId, lesson, onAction, busy }) {
  const [markdown, setMarkdown] = useState(lesson.finalNote?.markdown || '')
  const [mode, setMode] = useState('preview')
  const [revisionRequest, setRevisionRequest] = useState('')
  const savedMarkdown = lesson.finalNote?.markdown || ''
  const dirty = markdown !== savedMarkdown
  const charCount = countCourseNoteChars(markdown)
  const awaitingConfirmation = lesson.status === 'final_review_human'
  const reviewing = lesson.status === 'final_review'
  const canRequestRevision = awaitingConfirmation || lesson.status === 'completed'
  const revising = lesson.status === 'final_revision_required'

  useEffect(() => {
    setMarkdown(lesson.finalNote?.markdown || '')
    setMode('preview')
  }, [lesson.key, lesson.finalNote?.markdown])

  async function requestRevision() {
    const value = revisionRequest.trim()
    if (!value) return
    await onAction(
      { type: 'request-final-revision', lessonKey: lesson.key, request: value },
      '修改要求已提交，系统只会按你的要求调整最终稿。'
    )
    setRevisionRequest('')
  }

  function exportMarkdown() {
    if (typeof window === 'undefined' || !markdown) return
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeName(lesson.title || '课程笔记')}-最终笔记.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!markdown) {
    return <section className='course-stage-card'><LoadingLine label='正在整理最终笔记…' /></section>
  }

  const report = lesson.qualityReport || lesson.finalNote?.qualityReport

  return <section className='course-stage-card course-final-stage'>
    <div className='course-stage-heading'>
      <div>
        <span>最终成果</span>
        <h3>{lesson.status === 'completed' ? '本课笔记已完成' : revising ? '正在修改最终笔记' : reviewing ? '正在进行最终检查' : '最终检查需要处理'}</h3>
      </div>
      <p>{lesson.status === 'completed' ? '仍可继续编辑或导出 Markdown。' : revising ? '修改完成后会自动重新检查。' : reviewing ? '系统会检查跨节点矛盾、严重重复和整体结构，通过后自动完成本课。' : '仅在系统无法继续处理时才会停在这里，并显示具体原因。'}</p>
    </div>

    {revising ? <LoadingLine label='正在修改最终笔记…' detail='修改完成后会自动重新检查' /> : null}
    {reviewing ? <LoadingLine label='正在进行最终检查…' detail='正常通过后会自动完成，无需确认' /> : null}
    {awaitingConfirmation ? <div className='course-diagnostics'><strong>需要人工处理</strong><p>{lesson.finalReviewAttention?.message || '最终检查发现无法自动处理的重大异常。'}</p></div> : null}

    <div className='course-final-toolbar'>
      <div className='course-final-mode' role='tablist' aria-label='最终笔记视图'>
        <button type='button' role='tab' aria-selected={mode === 'preview'} onClick={() => setMode('preview')}>阅读</button>
        <button type='button' role='tab' aria-selected={mode === 'edit'} onClick={() => setMode('edit')}>编辑</button>
      </div>
      <span className='course-final-count'>约 {formatNumber(charCount)} 字</span>
    </div>

    {mode === 'preview'
      ? <article className='course-final-preview'><ReactMarkdown>{markdown}</ReactMarkdown></article>
      : <textarea className='course-final-note' value={markdown} onChange={event => setMarkdown(event.target.value)} />}

    <div className='course-primary-row course-final-actions'>
      {mode === 'edit' ? <button className='soft-button' type='button' disabled={busy || !markdown.trim() || !dirty} onClick={() => onAction({ type: 'save-final-note', lessonKey: lesson.key, markdown }, '最终笔记修改已保存。', false)}>保存修改</button> : null}
      <button className='soft-button' type='button' onClick={() => navigator.clipboard?.writeText(markdown)}>复制</button>
      <button className='soft-button' data-course-export type='button' onClick={exportMarkdown}>导出 Markdown</button>
      <a className='soft-button' href={`/desk/publish?job=${encodeURIComponent(jobId)}&lesson=${encodeURIComponent(lesson.key)}`}>转入发布</a>
      {awaitingConfirmation ? <button className='soft-button primary' type='button' disabled={busy || dirty} title={dirty ? '请先保存修改' : ''} onClick={() => onAction({ type: 'approve-final-review', lessonKey: lesson.key }, '最终笔记已由你确认。')}>确认异常已处理，完成本课</button> : null}
    </div>

    {canRequestRevision ? <details className='course-final-revision-box'>
      <summary>需要修改</summary>
      <label>
        告诉系统具体要改什么
        <textarea rows={3} value={revisionRequest} onChange={event => setRevisionRequest(event.target.value)} placeholder='例如：第二部分太简略，请补足老师关于数据清洗的论证；其余内容保持不变。' />
      </label>
      <div className='course-primary-row'>
        <button className='soft-button' type='button' disabled={busy || dirty || !revisionRequest.trim()} title={dirty ? '请先保存当前手动修改' : ''} onClick={() => void requestRevision()}>按要求修改</button>
      </div>
    </details> : null}

    {lesson.publication ? <p className='course-publication-line'>
      {lesson.publication.status === 'published' ? '已发布' : '发布草稿'}
      {lesson.publication.stale ? ' · 当前笔记有更新，尚未同步' : ''}
      {lesson.publication.slug ? <> · <a href={`/content/${lesson.publication.slug}`}>查看内容页</a></> : null}
    </p> : null}
    {dirty ? <p className='course-final-unsaved'>当前修改尚未保存，保存后才能确认或提交修改要求。</p> : null}
    {report ? <details className='course-final-history'><summary>查看历史自动检查结果</summary><ReviewReport report={report} /></details> : null}
  </section>
}

function CourseWorkbench({ jobId, workflow, capabilities, onAction, onRefresh, onBack, onSupplement, initialLessonKey = '' }) {
  const { startTask, pauseTask, dismissTask, taskFor } = useCourseTaskManager()
  const firstIncomplete = workflow.lessons?.find(lesson => lesson.status !== 'completed') || workflow.lessons?.[0]
  const [activeLessonKey, setActiveLessonKey] = useState(initialLessonKey || firstIncomplete?.key || '')
  const [courseSpec, setCourseSpec] = useState(workflow.courseSpec || {})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const task = taskFor(jobId)
  const onlineBusy = task?.state === 'running'
  const lesson = workflow.lessons?.find(item => item.key === activeLessonKey) || firstIncomplete
  const ui = getCourseUiState(workflow, lesson)
  const currentWorkflowError = getCurrentCourseError(workflow)
  const currentErrorMessage = task?.error || (currentWorkflowError ? formatCourseWorkflowError(currentWorkflowError) : '')
  const errorHistory = getCourseErrorHistory(workflow)

  useEffect(() => { if (!workflow.lessons?.some(item => item.key === activeLessonKey)) setActiveLessonKey(firstIncomplete?.key || ''); setCourseSpec(workflow.courseSpec || {}) }, [workflow.updatedAt, activeLessonKey, firstIncomplete?.key])
  useEffect(() => { if (initialLessonKey && workflow.lessons?.some(item => item.key === initialLessonKey)) setActiveLessonKey(initialLessonKey) }, [initialLessonKey, workflow.updatedAt])
  useEffect(() => { if (task?.workflowVersion) onRefresh(jobId).catch(() => {}) }, [task?.workflowVersion, jobId])
  useEffect(() => {
    if (!lesson || workflow.paused || workflow.status === 'failed' || !capabilities?.courseWriting?.configured) return
    if (AUTO_STATUSES.has(lesson.status || workflow.status)) startTask(jobId, { courseName: workflow.courseSpec?.courseName, label: humanStatus(lesson.status || workflow.status) })
  }, [jobId, lesson?.status, workflow.status, workflow.paused, capabilities?.courseWriting?.configured])

  async function run(action, success, resume = true) {
    setBusy(true); setMessage('')
    try {
      const next = await onAction(jobId, action)
      setMessage(success || '操作已完成。')
      await onRefresh(jobId)
      if (['completed', 'note_removed'].includes(next?.status)) dismissTask(jobId)
      const nextLesson = next?.lessons?.find(item => item.status !== 'completed') || next?.lessons?.[0]
      if (resume && capabilities?.courseWriting?.configured && AUTO_STATUSES.has(nextLesson?.status || next?.status)) startTask(jobId, { courseName: next?.courseSpec?.courseName || workflow.courseSpec?.courseName })
    } catch (error) { setMessage(formatCourseApiError(error, '操作失败')) } finally { setBusy(false) }
  }

  if (!lesson) return null
  let stageContent
  if (ui.stage === 'preferences') stageContent = <CoursePreferences value={courseSpec} onChange={setCourseSpec} onSave={() => run({ type: 'save-course-spec', courseSpec }, '偏好已保存。')} busy={busy} />
  else if (ui.stage === 'outline') stageContent = <OutlineEditor lesson={lesson} busy={busy} onlineBusy={onlineBusy} onSave={outline => run({ type: 'edit-outline', lessonKey: lesson.key, outline }, '大纲修改已保存。', false)} onApprove={async outline => { await run({ type: 'edit-outline', lessonKey: lesson.key, outline }, '大纲修改已保存。', false); await run({ type: 'approve-outline', lessonKey: lesson.key }, '大纲已批准。') }} />
  else if (ui.stage === 'writing' || ui.stage === 'review') stageContent = <NodeWorkbench lesson={lesson} taskLeases={workflow.taskLeases || []} onAction={run} busy={busy} />
  else if (ui.stage === 'assemble' || ui.stage === 'completed') stageContent = <FinalNoteStage jobId={jobId} lesson={lesson} onAction={run} busy={busy} onlineBusy={onlineBusy} />
  else stageContent = <section className='course-stage-card'><div className='course-waiting-card'><strong>课程资料已准备</strong><p>从当前主操作继续。</p></div></section>

  return <section className='course-detail-shell'>
    <header className='course-detail-topbar'><button className='course-back-button' type='button' onClick={onBack}>← 课程库</button><div><span>课程整理</span><h2>{workflow.courseSpec?.courseName || '课程工作台'}</h2><p>{workflow.courseSpec?.teacher || '未填写教师'}</p></div><ServiceLights capabilities={capabilities} /><div className='course-row-actions'><button className='soft-button' type='button' onClick={() => onSupplement(jobId, workflow)}>补充资料</button>{workflow.status === 'failed' ? <button className='soft-button primary' type='button' disabled={busy} onClick={() => run({ type: 'retry' }, '正在重试。')}>重试</button> : null}{capabilities?.courseWriting?.configured && AUTO_STATUSES.has(lesson.status || workflow.status) ? <button className='soft-button primary' type='button' disabled={onlineBusy || busy} onClick={() => startTask(jobId, { courseName: workflow.courseSpec?.courseName })}>{onlineBusy ? '处理中…' : '继续处理'}</button> : null}{ui.canPause ? <button className='soft-button' type='button' disabled={busy} onClick={() => { pauseTask(jobId); run({ type: 'pause' }, '已暂停领取新任务。', false) }}>暂停</button> : null}{ui.canResume ? <button className='soft-button' type='button' disabled={busy} onClick={() => run({ type: 'resume' }, '已恢复处理。')}>恢复</button> : null}</div></header>
    <ProgressStepper ui={ui} />
    <div className='course-workbench-grid'><aside className='course-lesson-rail'><h3>课次</h3>{(workflow.lessons || []).map(item => <button key={item.key} type='button' className={item.key === lesson.key ? 'active' : ''} onClick={() => setActiveLessonKey(item.key)}><b>{item.title}</b><span>{humanStatus(item.status)}</span></button>)}</aside><main className='course-stage-stack'>{stageContent}{message ? <p className={`status-line ${/失败|错误|不能|缺少|HTTP/.test(message) ? 'error' : ''}`}>{message}</p> : null}{currentErrorMessage ? <details className='course-diagnostics' open><summary>处理失败</summary><p>{currentErrorMessage}</p></details> : null}{errorHistory.length ? <details className='course-diagnostics'><summary>历史诊断（{errorHistory.length}）</summary>{errorHistory.map(error => <p key={error.id}>{formatCourseWorkflowError(error)}{error.resolvedAt ? ' · 已结束' : ''}</p>)}</details> : null}</main></div>
  </section>
}

function CourseJobRow({ job, active, onOpen, onDelete, onSupplement }) {
  const runtime = job.runtime_summary || job.preferences?.web_adapter?.runtimeSummary || {}
  const stats = job.preferences?.textpack_stats || {}
  const attentionCount = Number(runtime.counts?.attention || 0)
  const status = runtime.status || job.current_node
  const pendingHuman = ['preflight_required', 'outline_review', 'node_human_review', 'final_review', 'final_review_human'].includes(status) || attentionCount > 0
  const completed = status === 'completed'
  const openLabel = completed ? '查看笔记' : pendingHuman ? '继续确认' : '继续整理'
  return <article className={`course-job-row ${active ? 'active' : ''}`}>
    <div>
      <span>{humanStatus(status)}</span>
      <h3>{job.course_name}</h3>
      <p>{job.teacher || '未填写教师'} · {formatNumber(stats.lessonCount)} 课 · {formatNumber(stats.totalChars)} 字</p>
      <small>{pendingHuman ? `${attentionCount || 1} 项等待处理 · ` : ''}{job.updated_at ? new Date(job.updated_at).toLocaleString('zh-CN') : '刚刚更新'}</small>
    </div>
    <div className='course-row-actions'>
      {completed ? <button className='soft-button' type='button' onClick={() => onSupplement(job.id)}>加课次</button> : null}
      <button className='soft-button primary' type='button' onClick={() => onOpen(job.id)}>{openLabel}</button>
      <button className='soft-button danger' type='button' onClick={() => onDelete(job.id)}>删除</button>
    </div>
  </article>
}

function confidenceLabel(value) {
  return ({ high: '较可靠', medium: '建议确认', low: '需要确认', manual: '已手动确认' })[value] || '需要确认'
}

function rangeLabel(assignment) {
  if (assignment.scope === 'course') return '全课程通用'
  const unit = ({ page: '页', line: '行', paragraph: '段' })[assignment.range?.unit] || ''
  return assignment.range ? `${assignment.range.start}–${assignment.range.end}${unit}` : '整份'
}

function MaterialArchivePanel({ groups, materials, onGroupsChange, onMaterialsChange, onOcr, onAiAnalyze, ocrJobs, ocrAvailable, aiBusy }) {
  const [selectedKey, setSelectedKey] = useState(materials[0]?.clientKey || '')
  const selected = materials.find(material => material.clientKey === selectedKey) || materials[0]
  useEffect(() => { if (!materials.some(material => material.clientKey === selectedKey)) setSelectedKey(materials[0]?.clientKey || '') }, [materials.length, selectedKey])

  function updateMaterial(clientKey, mapper) { onMaterialsChange(materials.map(material => material.clientKey === clientKey ? mapper(material) : material)) }
  function updateGroup(key, patch) { onGroupsChange(groups.map(group => group.key === key ? { ...group, ...patch } : group)) }
  function addGroup() { const order = groups.length + 1; onGroupsChange([...groups, { key: `manual-${Date.now()}`, title: `课次 ${order}`, order, confidence: 'manual', reason: '手动创建', existing: false }]) }
  function moveGroup(key, direction) { const index = groups.findIndex(group => group.key === key); const target = index + direction; if (index < 0 || target < 0 || target >= groups.length) return; const next = [...groups]; const [group] = next.splice(index, 1); next.splice(target, 0, group); onGroupsChange(next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }))) }
  function mergeGroup(sourceKey, targetKey) {
    if (!targetKey || sourceKey === targetKey) return
    onMaterialsChange(materials.map(material => ({ ...material, assignments: (material.assignments || []).map(assignment => assignment.lessonKey === sourceKey ? { ...assignment, lessonKey: targetKey, locked: true, source: 'manual', confidence: 'manual' } : assignment) })))
    onGroupsChange(groups.filter(group => group.key !== sourceKey).map((group, index) => ({ ...group, order: index + 1 })))
  }
  function deleteGroup(key) {
    const assigned = materials.some(material => (material.assignments || []).some(assignment => assignment.lessonKey === key))
    if (assigned && typeof window !== 'undefined' && !window.confirm('这个课次仍有材料分配。删除后，这些材料会回到未归档。')) return
    onMaterialsChange(materials.map(material => ({
      ...material,
      assignments: (material.assignments || []).filter(assignment => assignment.lessonKey !== key),
      groupingStatus: (material.assignments || []).some(assignment => assignment.lessonKey !== key) ? material.groupingStatus : 'unassigned'
    })))
    onGroupsChange(groups.filter(group => group.key !== key).map((group, index) => ({ ...group, order: index + 1 })))
  }
  function assignWhole(clientKey, lessonKey) {
    updateMaterial(clientKey, material => {
      const existing = (material.assignments || []).find(assignment => assignment.scope === 'lesson' && assignment.lessonKey === lessonKey && assignment.range?.start === 1 && assignment.range?.end === materialRangeExtent(material))
      if (existing) return material
      return { ...material, assignments: [...(material.assignments || []).filter(assignment => assignment.scope !== 'unassigned'), wholeMaterialAssignment(material, { lessonKey, source: 'manual', confidence: 'manual', locked: true })], groupingStatus: 'confirmed' }
    })
  }
  function addCourseWide(clientKey) { updateMaterial(clientKey, material => ({ ...material, assignments: [wholeMaterialAssignment(material, { scope: 'course', source: 'manual', confidence: 'manual', locked: true })], groupingStatus: 'confirmed' })) }
  function clearAssignments(clientKey) { updateMaterial(clientKey, material => ({ ...material, assignments: [], groupingStatus: 'unassigned' })) }
  function updateAssignment(clientKey, id, patch) { updateMaterial(clientKey, material => ({ ...material, assignments: (material.assignments || []).map(assignment => assignment.id === id ? { ...assignment, ...patch, source: 'manual', confidence: 'manual', locked: true } : assignment), groupingStatus: 'confirmed' })) }
  function removeAssignment(clientKey, id) { updateMaterial(clientKey, material => ({ ...material, assignments: (material.assignments || []).filter(assignment => assignment.id !== id), groupingStatus: (material.assignments || []).length > 1 ? 'confirmed' : 'unassigned' })) }
  function updateRole(clientKey, role) { updateMaterial(clientKey, material => ({ ...material, role })) }

  return <div className='course-archive-panel'>
    <div className='course-stage-heading compact'><div><span>课次与材料</span><h3>确认归档关系</h3></div><div className='course-row-actions'><button className='soft-button' type='button' disabled={aiBusy} onClick={onAiAnalyze}>{aiBusy ? '正在分析…' : 'AI 重新分析'}</button><button className='soft-button' type='button' onClick={addGroup}>＋ 新建课次</button></div></div>
    <p className='course-archive-hint'>拖动材料到课次即可归档；点击材料可设置跨课次范围。</p>
    <div className='course-archive-grid'>
      <aside className='course-archive-lessons'><h4>课次</h4>{groups.map(group => {
        const count = materials.reduce((sum, material) => sum + (material.assignments || []).filter(assignment => assignment.lessonKey === group.key).length, 0)
        return <article key={group.key} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); assignWhole(event.dataTransfer.getData('text/course-material'), group.key) }}>
          <input value={group.title} onChange={event => updateGroup(group.key, { title: event.target.value, confidence: 'manual' })} />
          <span>{count} 项分配 · {confidenceLabel(group.confidence)}</span>
          {group.reason ? <small title={group.reason}>{group.reason}</small> : null}
          <div><button type='button' disabled={group.order === 1} onClick={() => moveGroup(group.key, -1)}>↑</button><button type='button' disabled={group.order === groups.length} onClick={() => moveGroup(group.key, 1)}>↓</button><select aria-label={`合并 ${group.title}`} value='' onChange={event => mergeGroup(group.key, event.target.value)}><option value=''>合并到…</option>{groups.filter(item => item.key !== group.key).map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select><button type='button' className='danger' onClick={() => deleteGroup(group.key)}>删除</button></div>
        </article>
      })}<div className='course-archive-drop-special' onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addCourseWide(event.dataTransfer.getData('text/course-material')) }}>全课程通用</div><div className='course-archive-drop-special muted' onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); clearAssignments(event.dataTransfer.getData('text/course-material')) }}>暂不归档</div></aside>
      <main className='course-material-pool'><h4>材料</h4>{materials.map(material => { const job = ocrJobs[material.clientKey]; const assignments = material.assignments || []; return <button type='button' draggable key={material.clientKey} className={`${selected?.clientKey === material.clientKey ? 'active' : ''} ${assignments.length ? '' : 'unassigned'}`} onDragStart={event => event.dataTransfer.setData('text/course-material', material.clientKey)} onClick={() => setSelectedKey(material.clientKey)}><span><b>{material.sourceFile}</b><small>{KIND_LABELS[material.kind] || '课程资料'} · {formatNumber(material.charCount)} 字</small></span><em>{material.ocrRequired ? (job?.state === 'running' ? `识别 ${job.extractedPages || 0}/${job.totalPages || '…'}` : '待识别') : assignments.length ? `${assignments.length} 项分配` : '未归档'}</em></button>})}</main>
      <aside className='course-material-inspector'>{selected ? <>
        <header><span>{KIND_LABELS[selected.kind] || '课程资料'}</span><h4>{selected.sourceFile}</h4></header>
        <label>材料作用<select value={selected.role} onChange={event => updateRole(selected.clientKey, event.target.value)}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {selected.ocrRequired ? <div className='course-ocr-action'><button className='soft-button primary' type='button' disabled={!ocrAvailable || ['uploading', 'running'].includes(ocrJobs[selected.clientKey]?.state)} onClick={() => onOcr(selected)}>{ocrJobs[selected.clientKey]?.state === 'uploading' ? '正在上传…' : ocrJobs[selected.clientKey]?.state === 'running' ? `识别中 ${ocrJobs[selected.clientKey]?.extractedPages || 0}/${ocrJobs[selected.clientKey]?.totalPages || '…'}` : '在线识别'}</button>{!ocrAvailable ? <small>在线识别未配置</small> : ocrJobs[selected.clientKey]?.error ? <small className='error'>{ocrJobs[selected.clientKey].error}</small> : null}</div> : null}
        <div className='course-assignment-list'>{(selected.assignments || []).map(assignment => <article key={assignment.id}>
          <div className='course-assignment-head'><strong>{assignment.scope === 'course' ? '全课程通用' : groups.find(group => group.key === assignment.lessonKey)?.title || '未指定课次'}</strong><button type='button' aria-label='删除分配' onClick={() => removeAssignment(selected.clientKey, assignment.id)}>×</button></div>
          {assignment.scope === 'lesson' ? <label>课次<select value={assignment.lessonKey} onChange={event => updateAssignment(selected.clientKey, assignment.id, { lessonKey: event.target.value })}>{groups.map(group => <option key={group.key} value={group.key}>{group.title}</option>)}</select></label> : null}
          {assignment.scope === 'lesson' ? <div className='course-assignment-range'><span>{({ page: '页码', line: '行号', paragraph: '段落' })[assignment.range?.unit || materialRangeUnit(selected)]}</span><input type='number' min='1' max={materialRangeExtent(selected)} value={assignment.range?.start || 1} onChange={event => updateAssignment(selected.clientKey, assignment.id, { range: { ...(assignment.range || {}), unit: materialRangeUnit(selected), start: Number(event.target.value), end: Math.max(Number(event.target.value), Number(assignment.range?.end || event.target.value)) } })} /><b>—</b><input type='number' min='1' max={materialRangeExtent(selected)} value={assignment.range?.end || materialRangeExtent(selected)} onChange={event => updateAssignment(selected.clientKey, assignment.id, { range: { ...(assignment.range || {}), unit: materialRangeUnit(selected), start: Math.min(Number(assignment.range?.start || 1), Number(event.target.value)), end: Number(event.target.value) } })} /></div> : null}
          <small>{rangeLabel(assignment)} · {confidenceLabel(assignment.confidence)}</small>{assignment.reason ? <p>{assignment.reason}</p> : null}
        </article>)}</div>
        <div className='course-inspector-actions'><select value='' onChange={event => { if (event.target.value) assignWhole(selected.clientKey, event.target.value) }}><option value=''>＋ 分配到课次</option>{groups.map(group => <option key={group.key} value={group.key}>{group.title}</option>)}</select><button type='button' onClick={() => addCourseWide(selected.clientKey)}>设为全课程通用</button><button type='button' onClick={() => clearAssignments(selected.clientKey)}>暂不归档</button></div>
      </> : <p className='empty-copy'>选择一份材料查看分配。</p>}</aside>
    </div>
  </div>
}

export function CourseTextPackDesk() {
  const router = useRouter()
  const [view, setView] = useState('library')
  const [importStep, setImportStep] = useState('select')
  const [files, setFiles] = useState([])
  const [roles, setRoles] = useState({})
  const [courseName, setCourseName] = useState('')
  const [teacher, setTeacher] = useState('')
  const [materials, setMaterials] = useState([])
  const [groups, setGroups] = useState([])
  const [textPack, setTextPack] = useState(null)
  const [jobs, setJobs] = useState([])
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [parseProgress, setParseProgress] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [ocrJobs, setOcrJobs] = useState({})
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [capabilities, setCapabilities] = useState(null)
  const [aiGroupingBusy, setAiGroupingBusy] = useState(false)
  const [supplementTarget, setSupplementTarget] = useState(null)
  const fileInputRef = useRef(null)
  const openedQueryRef = useRef('')

  const summary = useMemo(() => { if (!textPack) return null; try { return summarizeTextPack(textPack) } catch (error) { return { error: error instanceof Error ? error.message : '课程资料无法预览' } } }, [textPack])
  const sourceSummary = useMemo(() => ({
    lessonCount: textPack?.lessons?.length || 0,
    transcriptCount: materials.filter(material => material.role === 'transcript').length,
    deckCount: materials.filter(material => material.role === 'slides').length,
    totalChars: materials.reduce((sum, material) => sum + Number(material.charCount || 0), 0),
    unassigned: materials.filter(material => !(material.assignments || []).length).length
  }), [textPack, materials])

  async function refreshJobs() { const data = await requestCourseJson('/api/courses/textpack', {}, '课程列表读取失败'); setJobs(data.jobs || []) }
  useEffect(() => { refreshJobs().catch(error => setMessage(formatCourseApiError(error))); requestCourseJson('/api/courses/capabilities', {}, '服务状态读取失败').then(setCapabilities).catch(() => {}) }, [])
  useEffect(() => {
    const queryJob = String(router.query?.job || '')
    if (!router.isReady || !queryJob || openedQueryRef.current === queryJob) return
    const queryAction = String(router.query?.action || '')
    const queryKey = `${queryJob}:${queryAction}`
    if (openedQueryRef.current === queryKey) return
    openedQueryRef.current = queryKey
    openJob(queryJob, { supplement: queryAction === 'supplement' }).catch(error => setMessage(formatCourseApiError(error)))
  }, [router.isReady, router.query?.job, router.query?.action])

  function resetImport({ keepCourse = false } = {}) {
    setFiles([]); setRoles({}); setMaterials([]); setGroups([]); setTextPack(null); setImportStep('select'); setStatus('idle'); setMessage(''); setOcrJobs({})
    if (!keepCourse) { setCourseName(''); setTeacher(''); setSupplementTarget(null) }
  }

  function appendFiles(nextFiles) {
    const existing = new Set(files.map(materialFileKey)); const additions = nextFiles.filter(file => !existing.has(materialFileKey(file)))
    const merged = [...files, ...additions]
    setMessage(nextFiles.length && additions.length < nextFiles.length ? `已忽略 ${nextFiles.length - additions.length} 份重复资料。` : '')
    setFiles(merged); setTextPack(null); setImportStep('select')
    setRoles(current => ({ ...current, ...Object.fromEntries(additions.map(file => [materialFileKey(file), inferredRole(file)])) }))
    if (!courseName) setCourseName(defaultCourseName(merged))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  function removeFile(key) { setFiles(current => current.filter(file => materialFileKey(file) !== key)); setRoles(current => { const next = { ...current }; delete next[key]; return next }); setMaterials(current => current.filter(material => material.clientKey !== key)); setTextPack(null); setImportStep('select') }
  function handleFileDrop(event) { event.preventDefault(); setDragActive(false); appendFiles(Array.from(event.dataTransfer?.files || [])) }


  async function analyzeFiles() {
    setStatus('preparing'); setMessage(''); const parsedKeys = new Set(materials.map(material => material.clientKey)); const pendingFiles = files.filter(file => !parsedKeys.has(materialFileKey(file))); setParseProgress({ current: 0, total: pendingFiles.length || files.length, fileName: '' })
    try {
      const parsed = pendingFiles.length ? await parseCourseMaterialFiles(pendingFiles, roles, setParseProgress) : { materials: [], warnings: [] }
      const existingUpdated = materials.map(material => ({ ...material, role: roles[material.clientKey] || material.role }))
      const combined = [...existingUpdated, ...parsed.materials]
      const seed = groups.length ? groups : (supplementTarget?.lessons || [])
      let suggested = suggestLessonWorkspace(combined, seed)
      let resultMessage = parsed.warnings.length ? parsed.warnings.join('；') : '资料已读取，请确认课次和分配范围。'
      if (capabilities?.courseWriting?.configured && parsed.materials.length) {
        setMaterials(suggested.materials); setGroups(suggested.groups)
        try {
          const data = await requestCourseJson('/api/courses/group-materials', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ courseName, existingLessons: suggested.groups, materials: parsed.materials.map(buildMaterialGroupingIndex) })
          }, '课次分析失败')
          suggested = applyAiGroupingSuggestion(suggested.materials, suggested.groups, data)
        } catch (error) {
          resultMessage = `资料已读取；AI 分析暂未完成：${formatCourseApiError(error)}`
        }
      }
      setMaterials(suggested.materials); setGroups(suggested.groups); setStatus('grouping'); setImportStep('group'); setMessage(resultMessage)
    } catch (error) { setStatus('error'); setMessage(formatCourseApiError(error, '课程资料整理失败')) } finally { setParseProgress(null); setAiGroupingBusy(false) }
  }

  async function rerunAiGrouping() {
    if (!materials.length) return
    setAiGroupingBusy(true); setMessage('')
    try {
      const data = await requestCourseJson('/api/courses/group-materials', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ courseName, existingLessons: groups, materials: materials.map(buildMaterialGroupingIndex) }) }, '课次分析失败')
      const next = applyAiGroupingSuggestion(materials, groups, data)
      setMaterials(next.materials); setGroups(next.groups); setTextPack(null); setMessage('分析完成，请检查低置信度分配。')
    } catch (error) { setMessage(formatCourseApiError(error, '课次分析失败')) } finally { setAiGroupingBusy(false) }
  }

  async function startOcr(material) {
    const file = files.find(item => materialFileKey(item) === material.clientKey)
    if (!file) return setMessage('找不到这份本地文件，请重新添加。')
    setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'uploading' } }))
    try {
      const session = await requestCourseJson('/api/courses/ocr/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ maxBytes: file.size }) }, '无法连接在线文字识别')
      const form = new FormData(); form.append('file', file)
      const submitted = await requestCourseJson(`${session.serviceUrl}/api/ocr/jobs`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, body: form }, '识别任务提交失败')
      const poll = async () => {
        const data = await requestCourseJson(`${session.serviceUrl}/api/ocr/jobs/${submitted.jobId}`, { headers: { authorization: `Bearer ${submitted.accessToken}` } }, '识别进度读取失败')
        setOcrJobs(current => ({ ...current, [material.clientKey]: { state: data.state === 'done' ? 'finishing' : 'running', totalPages: data.totalPages, extractedPages: data.extractedPages } }))
        if (data.state === 'failed') throw new Error(data.error || '在线文字识别失败')
        if (data.state !== 'done') { window.setTimeout(() => poll().catch(handleError), 3500); return }
        const resultData = await requestCourseJson(`${session.serviceUrl}/api/ocr/jobs/${submitted.jobId}/result`, { headers: { authorization: `Bearer ${submitted.accessToken}` } }, '识别结果读取失败')
        setMaterials(current => current.map(item => item.clientKey === material.clientKey ? applyOcrResultToMaterial(item, resultData.result) : item))
        setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'done', totalPages: resultData.result.totalPages, extractedPages: resultData.result.totalPages, dailyPagesUsed: data.dailyPagesUsed, dailyPageBudget: data.dailyPageBudget } }))
        fetch(`${session.serviceUrl}/api/ocr/jobs/${submitted.jobId}`, { method: 'DELETE', headers: { authorization: `Bearer ${submitted.accessToken}` } }).catch(() => {})
      }
      const handleError = error => setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'error', error: formatCourseApiError(error, '在线识别失败') } }))
      await poll()
    } catch (error) { setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'error', error: formatCourseApiError(error, '在线识别失败') } })) }
  }

  function buildPreview() {
    const pending = materials.filter(material => material.ocrRequired)
    if (pending.length) { setMessage(`还有 ${pending.length} 份资料等待在线文字识别。`); return }
    try {
      const input = materialsToTextPackInput({ materials, lessonGroups: groups, courseName: courseName || defaultCourseName(files), teacher, allowEmptyLessons: Boolean(supplementTarget) })
      const next = buildTextPack({ course: input.course, preferences: { origin: 'browser-online-workflow', deterministicPreprocess: true, supplementTargetId: supplementTarget?.jobId || '' }, lessons: input.lessons, decks: input.decks, warnings: input.warnings })
      setTextPack(next); setStatus('ready'); setImportStep('review'); setMessage('归档关系已整理，请最后确认。')
    } catch (error) { setStatus('error'); setMessage(formatCourseApiError(error, '课程资料无法预览')) }
  }

  async function handleImport() {
    if (!textPack) return; setStatus('importing'); setMessage('')
    try {
      const url = supplementTarget ? `/api/courses/jobs/${encodeURIComponent(supplementTarget.jobId)}/supplement` : '/api/courses/textpack'
      const data = await requestCourseJson(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ textPack }) }, supplementTarget ? '课程资料补充失败' : '课程资料导入失败')
      await refreshJobs(); if (data.job?.id || supplementTarget?.jobId) await openJob(data.job?.id || supplementTarget.jobId)
      setMessage(supplementTarget ? '补充资料已加入课程，相关课次将重新整理。' : data.existing ? '这份课程资料已经存在，已打开原有进度。' : '课程资料已导入。')
      setSupplementTarget(null)
    } catch (error) { setStatus('error'); setMessage(formatCourseApiError(error, supplementTarget ? '课程资料补充失败' : '课程资料导入失败')) }
  }
  async function openJob(jobId, options = {}) { const data = await requestCourseJson(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`, {}, '课程进度读取失败'); setSelectedJobId(jobId); setSelectedWorkflow(data.workflow); if (options.supplement) beginSupplement(jobId, data.workflow); else setView('workbench') }
  async function runWorkflowAction(jobId, action) { const data = await requestCourseJson(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) }, '课程操作失败'); setSelectedWorkflow(data.workflow); await refreshJobs(); return data.workflow }
  async function handleDelete(jobId) { if (typeof window !== 'undefined' && !window.confirm('删除这门课程的文字资料和整理进度？原始本地文件不会受到影响。')) return; try { await requestCourseJson(`/api/courses/textpack?id=${encodeURIComponent(jobId)}`, { method: 'DELETE' }, '删除失败'); if (selectedJobId === jobId) { setSelectedJobId(''); setSelectedWorkflow(null) }; await refreshJobs() } catch (error) { setMessage(formatCourseApiError(error, '删除失败')) } }
  function beginSupplement(jobId, workflow) {
    resetImport({ keepCourse: true })
    const lessons = (workflow.lessons || []).map(lesson => ({
      key: lesson.key,
      title: lesson.title,
      order: lesson.order,
      confidence: 'manual',
      reason: '已有课次',
      evidence: [lesson.title, String(lesson.transcript || '').slice(0, 1200)].filter(Boolean),
      existing: true
    }))
    setSupplementTarget({ jobId, lessons })
    setCourseName(workflow.courseSpec?.courseName || '')
    setTeacher(workflow.courseSpec?.teacher || '')
    setGroups(lessons)
    setView('import')
  }

  if (view === 'workbench' && selectedWorkflow) return <CourseWorkbench jobId={selectedJobId} workflow={selectedWorkflow} capabilities={capabilities} onAction={runWorkflowAction} onRefresh={openJob} onBack={() => setView('library')} onSupplement={beginSupplement} initialLessonKey={String(router.query?.lesson || '')} />

  return <div className='course-workspace compact'>
    <nav className='course-page-switcher'><button type='button' className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>课程库</button><button type='button' className={view === 'import' ? 'active' : ''} onClick={() => { if (view !== 'import') resetImport(); setView('import') }}>导入资料</button></nav>
    {view === 'library' ? <section className='course-library-panel'><div className='section-heading compact'><span>课程库</span><h2>已导入课程</h2></div>{jobs.length ? <div className='course-job-list compact-list'>{jobs.map(job => <CourseJobRow key={job.id} job={job} active={selectedJobId === job.id} onOpen={openJob} onDelete={handleDelete} onSupplement={jobId => openJob(jobId, { supplement: true })} />)}</div> : <div className='course-empty-state'><strong>课程库还是空的</strong><p>从“导入资料”添加课堂转录、课件或已有笔记。</p><button className='soft-button primary' type='button' onClick={() => setView('import')}>导入第一门课程</button></div>}</section> : null}
    {view === 'import' ? <section className='course-import-shell'>
      <header className='course-import-header'><div><span>{supplementTarget ? '补充课程资料' : '导入课程资料'}</span><h2>{courseName || '新课程'}</h2>{supplementTarget ? <p>新增材料会匹配到已有课次，也可以新建课次。</p> : null}</div><ServiceLights capabilities={capabilities} /></header>
      <nav className='course-import-steps'><button className={importStep === 'select' ? 'active' : ''} type='button' onClick={() => setImportStep('select')}>1 添加资料</button><button className={importStep === 'group' ? 'active' : ''} type='button' disabled={!materials.length} onClick={() => setImportStep('group')}>2 归档材料</button><button className={importStep === 'review' ? 'active' : ''} type='button' disabled={!textPack} onClick={() => setImportStep('review')}>3 确认导入</button></nav>
      {importStep === 'select' ? <div className='course-import-pane'><div className='course-form-grid'><label>课程名称<input value={courseName} disabled={Boolean(supplementTarget)} onChange={event => setCourseName(event.target.value)} placeholder='例如：证据法专题课' /></label><label>教师<input value={teacher} disabled={Boolean(supplementTarget)} onChange={event => setTeacher(event.target.value)} placeholder='可选' /></label></div><label className={`course-file-drop ${dragActive ? 'is-dragging' : ''}`} onDragEnter={event => { event.preventDefault(); setDragActive(true) }} onDragOver={event => { event.preventDefault(); setDragActive(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false) }} onDrop={handleFileDrop}><input ref={fileInputRef} multiple accept='.srt,.pptx,.ppt,.docx,.doc,.txt,.md,.markdown,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff' type='file' onChange={event => appendFiles(Array.from(event.target.files || []))} /><strong>{dragActive ? '松开即可添加' : files.length ? '继续添加资料' : '选择或拖入课程资料'}</strong><span>可以分多次添加；同一课可包含多份材料。</span></label><div className='course-selected-files'>{files.length ? files.map(file => <article key={materialFileKey(file)}><div><strong>{file.name}</strong><small>{formatNumber(file.size)} 字节</small></div><label>材料作用<select value={roles[materialFileKey(file)] || inferredRole(file)} onChange={event => setRoles(current => ({ ...current, [materialFileKey(file)]: event.target.value }))}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className='course-file-remove' type='button' onClick={() => removeFile(materialFileKey(file))}>移除</button></article>) : <div className='course-empty-state'><strong>还没有选择资料</strong><p>先添加转录、课件、讲义或已有笔记。</p></div>}</div>{parseProgress ? <LoadingLine label={`正在读取 ${parseProgress.current}/${parseProgress.total}`} detail={parseProgress.fileName} /> : null}{aiGroupingBusy ? <LoadingLine label='正在分析课次…' /> : null}<div className='course-primary-row'><button className='soft-button primary' type='button' disabled={!files.length || status === 'preparing' || aiGroupingBusy} onClick={analyzeFiles}>{status === 'preparing' || aiGroupingBusy ? '处理中…' : materials.length ? '分析新增资料' : '读取并分析资料'}</button></div></div> : null}
      {importStep === 'group' ? <div className='course-import-pane'><MaterialArchivePanel groups={groups} materials={materials} onGroupsChange={value => { setGroups(value); setTextPack(null) }} onMaterialsChange={value => { setMaterials(value); setTextPack(null) }} onOcr={startOcr} onAiAnalyze={rerunAiGrouping} ocrJobs={ocrJobs} ocrAvailable={Boolean(capabilities?.onlineOcr?.configured)} aiBusy={aiGroupingBusy} /><div className='course-primary-row'><button className='soft-button' type='button' onClick={() => setImportStep('select')}>继续添加资料</button><button className='soft-button primary' type='button' onClick={buildPreview}>确认归档并继续</button></div></div> : null}
      {importStep === 'review' ? <div className='course-import-pane'>{summary && !summary.error ? <><dl className='course-summary-grid'><div><dt>课程</dt><dd>{summary.courseName}</dd></div><div><dt>课次</dt><dd>{sourceSummary.lessonCount}</dd></div><div><dt>转录</dt><dd>{sourceSummary.transcriptCount}</dd></div><div><dt>课件</dt><dd>{sourceSummary.deckCount}</dd></div><div><dt>文字</dt><dd>{formatNumber(sourceSummary.totalChars)}</dd></div><div><dt>未归档</dt><dd>{sourceSummary.unassigned}</dd></div></dl>{summary.warnings.length ? <div className='course-warning-list'>{summary.warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}</div> : <p className='muted'>资料可以导入。</p>}<div className='course-primary-row'><button className='soft-button' type='button' onClick={() => setImportStep('group')}>返回调整归档</button><button className='soft-button primary' type='button' disabled={status === 'importing'} onClick={handleImport}>{status === 'importing' ? '正在导入…' : supplementTarget ? '补充到课程' : '导入课程'}</button></div></> : <p className='status-line error'>{summary?.error || '课程资料尚未准备完成。'}</p>}</div> : null}
      {message ? <p className={`status-line ${status === 'error' || /失败|等待|HTTP|错误/.test(message) ? 'error' : ''}`}>{message}</p> : null}
    </section> : null}
  </div>
}
