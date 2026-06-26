import { useEffect, useMemo, useRef, useState } from 'react'

import {
  applyOcrResultToMaterial,
  materialFileKey,
  materialsToTextPackInput,
  parseCourseMaterialFiles,
  suggestLessonGroups
} from '@/lib/course/materialParsers'
import { buildTextPack, safeName, summarizeTextPack } from '@/lib/course/textpack'
import { getCourseUiState } from '@/lib/course/uiState'

const ROLE_OPTIONS = [
  ['transcript', '课堂转录'],
  ['slides', '课件'],
  ['handout', '教师讲义'],
  ['supplement', '补充材料'],
  ['existing_note', '已有笔记']
]
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS)
const KIND_LABELS = { transcript: '课堂转录', deck: '课件', document: '文档', markdown: 'Markdown', note: '已有笔记', ocr: '扫描资料' }
const AUTO_STATUSES = new Set(['preflight_approved', 'outline_pending', 'outline_generating', 'outline_approved', 'node_planning', 'node_pending', 'node_generating', 'node_review', 'node_revision_required', 'assembly_pending', 'assembling', 'final_review'])

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
    preflight_required: '等待确认偏好', preflight_approved: '准备设计大纲', outline_pending: '等待设计大纲', outline_generating: '正在设计大纲',
    outline_review: '等待确认大纲', outline_approved: '大纲已确认', node_planning: '正在拆分正文', node_pending: '等待整理正文',
    node_generating: '正在整理正文', node_review: '等待检查或确认', node_revision_required: '需要修改', assembly_pending: '等待整理全文',
    assembling: '正在整理全文', final_review: '正在整体检查', final_review_human: '等待最终确认', completed: '已完成', paused: '已暂停', failed: '处理失败', cancelled: '已取消'
  })[status] || '准备中'
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

function ServiceBadge({ label, available, detail }) {
  return <div className={`course-service-badge ${available ? 'is-online' : 'is-offline'}`}><span>{label}</span><strong>{available ? '可用' : '尚未配置'}</strong><small>{detail}</small></div>
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
      <label>自动审查<select value={String(value.qualityThreshold || 75)} onChange={event => onChange({ ...value, qualityThreshold: Number(event.target.value) })}><option value='70'>适中</option><option value='75'>严格</option><option value='85'>很严格</option></select></label>
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
  if (!outline.length) return <section className='course-stage-card'><LoadingLine label={onlineBusy ? '正在设计本课大纲' : '等待开始设计大纲'} detail='系统会阅读本课全部材料，并保留转录行号和课件页码。' /></section>
  return <section className='course-stage-card'>
    <div className='course-stage-heading'><div><span>大纲</span><h3>确认本课结构</h3></div><p>逐项检查标题、转录范围和课件页码。锁定节点不会被自动覆盖。</p></div>
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

function ReviewReport({ report }) {
  if (!report) return <p className='empty-copy'>正文生成后会进行独立检查。</p>
  const scores = [['覆盖', report.coverage], ['依据', report.grounding], ['逻辑', report.logic], ['细节', report.detail], ['来源', report.sourceCoverage]]
  return <div className={`course-review-report decision-${report.decision || 'pending'}`}><header><strong>{reviewDecisionLabel(report.decision)}</strong><span>审查结果</span></header><div className='course-review-scores'>{scores.map(([label, value]) => <div key={label}><span>{label}</span><b>{Number(value || 0)}</b></div>)}</div>{report.issues?.length ? <ul>{report.issues.map((issue, index) => <li key={index}>{typeof issue === 'string' ? issue : issue.message || issue.detail || issue.type}</li>)}</ul> : <p>没有发现需要补充的问题。</p>}</div>
}

function NodeWorkbench({ lesson, onAction, busy, onlineBusy }) {
  const nodes = lesson.nodes || []
  const [selectedId, setSelectedId] = useState(nodes[0]?.id || '')
  const selected = nodes.find(node => node.id === selectedId) || nodes[0]
  const [draft, setDraft] = useState(selected?.draft || '')
  const [request, setRequest] = useState('')
  const [humanReason, setHumanReason] = useState('')
  useEffect(() => { const next = nodes.find(node => node.id === selectedId) || nodes[0]; if (next && next.id !== selectedId) setSelectedId(next.id); setDraft(next?.draft || ''); setRequest(''); setHumanReason('') }, [lesson.key, selectedId, selected?.draft, nodes.length])
  if (!nodes.length) return <section className='course-stage-card'><LoadingLine label={onlineBusy ? '正在建立正文结构' : '等待建立正文结构'} detail='大纲批准后，系统会按来源范围创建节点。' /></section>
  const report = latestReview(selected)
  const reviewIsCurrent = Number(report?.reviewedDraftVersion || 0) === Number(selected?.versions?.length || 0)
  const canApprove = report?.decision === 'approve' && reviewIsCurrent
  const needsHuman = report?.decision === 'human_review' && reviewIsCurrent
  const needsRevision = selected?.status === 'node_revision_required' || report?.decision === 'revise'
  return <section className='course-stage-card course-node-workbench'>
    <div className='course-stage-heading'><div><span>正文与审查</span><h3>逐节点整理</h3></div><p>每个节点单独生成、检查和确认，未通过内容不会进入最终笔记。</p></div>
    {onlineBusy ? <LoadingLine label='课程写作服务正在处理' detail='完成当前节点后会自动更新，无需重复点击。' /> : null}
    <div className='course-node-layout'>
      <nav className='course-node-nav' aria-label='正文节点'>{nodes.map((node, index) => <button key={node.id} type='button' className={node.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(node.id)}><i>{index + 1}</i><span><b>{node.title}</b><small>{humanStatus(node.status)}</small></span></button>)}</nav>
      {selected ? <div className='course-node-editor'><header><div><span>转录 {selected.lineRange?.join('–')} 行 · 课件 {selected.slideRange?.join('–')} 页</span><h4>{selected.title}</h4></div><strong>{humanStatus(selected.status)}</strong></header>
        <label>节点正文<textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder='正文会由课程写作服务生成，也可以在这里继续修改。' /></label>
        <div className='course-primary-row'><button className='soft-button' type='button' disabled={busy || !draft.trim()} onClick={() => onAction({ type: 'save-node-draft', lessonKey: lesson.key, nodeId: selected.id, markdown: draft }, '节点草稿已保存。')}>保存草稿</button>{canApprove ? <button className='soft-button primary' type='button' disabled={busy} onClick={() => onAction({ type: 'approve-node', lessonKey: lesson.key, nodeId: selected.id }, '节点已确认。')}>确认本节点</button> : null}</div>
        {!reviewIsCurrent && report ? <p className='empty-copy'>正文已修改，正在等待重新检查。</p> : <ReviewReport report={report} />}
        {needsRevision ? <div className='course-feedback-box'><label>补充修改要求<textarea value={request} onChange={event => setRequest(event.target.value)} placeholder='指出需要补充、删改或重新核对的具体内容。' /></label><button className='soft-button primary' type='button' disabled={busy || !request.trim()} onClick={() => onAction({ type: 'request-node-revision', lessonKey: lesson.key, nodeId: selected.id, request }, '修改要求已提交。')}>提交局部修改</button></div> : null}
        {needsHuman ? <div className='course-feedback-box'><label>人工判断说明<textarea value={humanReason} onChange={event => setHumanReason(event.target.value)} placeholder='说明接受当前版本的理由。' /></label><button className='soft-button primary' type='button' disabled={busy || !humanReason.trim()} onClick={() => onAction({ type: 'approve-node-human', lessonKey: lesson.key, nodeId: selected.id, reason: humanReason }, '节点已由你确认。')}>人工确认本节点</button></div> : null}
        <details className='course-source-drawer'><summary>查看本节点来源</summary><pre>{selected.sourceText || '没有可显示的转录来源。'}</pre>{selected.pptText ? <pre>{selected.pptText}</pre> : null}</details>
      </div> : null}
    </div>
  </section>
}

function FinalNoteStage({ lesson, onAction, busy, onlineBusy }) {
  const [markdown, setMarkdown] = useState(lesson.finalNote?.markdown || '')
  useEffect(() => setMarkdown(lesson.finalNote?.markdown || ''), [lesson.key, lesson.finalNote?.markdown])
  function exportMarkdown() { if (typeof window === 'undefined' || !markdown) return; const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${safeName(lesson.title || '课程笔记')}-最终笔记.md`; link.click(); URL.revokeObjectURL(url) }
  if (!markdown) return <section className='course-stage-card'><LoadingLine label={onlineBusy ? '正在整理最终笔记' : '等待整理最终笔记'} detail='所有节点确认后，系统会按大纲顺序汇总并整体检查。' /></section>
  const report = lesson.qualityReport || lesson.finalNote?.qualityReport
  return <section className='course-stage-card'><div className='course-stage-heading'><div><span>最终成果</span><h3>{lesson.status === 'completed' ? '本课笔记已完成' : '检查最终笔记'}</h3></div><p>{lesson.status === 'completed' ? '可以继续编辑或导出 Markdown。' : '整体检查通过后，本课才会正式完成。'}</p></div>
    {onlineBusy ? <LoadingLine label='正在进行整体检查' detail='系统会核对覆盖、重复、术语和来源。' /> : null}
    <textarea className='course-final-note' value={markdown} onChange={event => setMarkdown(event.target.value)} />
    <div className='course-primary-row'><button className='soft-button' type='button' disabled={busy || !markdown.trim()} onClick={() => onAction({ type: 'save-final-note', lessonKey: lesson.key, markdown }, '最终笔记修改已保存，将重新进行整体检查。')}>保存修改</button><button className='soft-button' type='button' onClick={() => navigator.clipboard?.writeText(markdown)}>复制</button><button className='soft-button primary' data-course-export type='button' onClick={exportMarkdown}>导出 Markdown</button>{lesson.status === 'final_review_human' ? <button className='soft-button primary' type='button' disabled={busy} onClick={() => onAction({ type: 'approve-final-review', lessonKey: lesson.key }, '最终笔记已确认。')}>确认最终笔记</button> : null}</div>
    {report ? <ReviewReport report={report} /> : <p className='empty-copy'>正在等待整体检查结果。</p>}
  </section>
}

function CourseWorkbench({ jobId, workflow, capabilities, onAction, onRefresh, onRunNext, onBack }) {
  const firstIncomplete = workflow.lessons?.find(lesson => lesson.status !== 'completed') || workflow.lessons?.[0]
  const [activeLessonKey, setActiveLessonKey] = useState(firstIncomplete?.key || '')
  const [courseSpec, setCourseSpec] = useState(workflow.courseSpec || {})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [onlineBusy, setOnlineBusy] = useState(false)
  const attemptedRef = useRef(new Set())
  const lesson = workflow.lessons?.find(item => item.key === activeLessonKey) || firstIncomplete
  const ui = getCourseUiState(workflow, lesson)

  useEffect(() => { if (!workflow.lessons?.some(item => item.key === activeLessonKey)) setActiveLessonKey(firstIncomplete?.key || ''); setCourseSpec(workflow.courseSpec || {}) }, [workflow.updatedAt, activeLessonKey, firstIncomplete?.key])

  async function run(action, success) { setBusy(true); setMessage(''); try { await onAction(jobId, action); setMessage(success || '操作已完成。'); await onRefresh(jobId) } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') } finally { setBusy(false) } }
  async function runNext(manual = false) { if (onlineBusy || !capabilities?.courseWriting?.configured) return; const key = `${workflow.updatedAt || ''}:${workflow.status}:${lesson?.status}`; if (!manual && attemptedRef.current.has(key)) return; attemptedRef.current.add(key); setOnlineBusy(true); setMessage(''); try { const result = await onRunNext(jobId); if (result.idle && manual) setMessage('当前步骤需要你的确认。'); await onRefresh(jobId) } catch (error) { setMessage(error instanceof Error ? error.message : '在线处理失败') } finally { setOnlineBusy(false) } }

  useEffect(() => {
    if (!lesson || onlineBusy || busy || workflow.paused || workflow.status === 'failed' || !capabilities?.courseWriting?.configured) return
    const status = lesson.status || workflow.status
    if (!AUTO_STATUSES.has(status)) return
    const timer = window.setTimeout(() => runNext(false), 450)
    return () => window.clearTimeout(timer)
  }, [workflow.updatedAt, workflow.status, lesson?.status, lesson?.key, capabilities?.courseWriting?.configured, onlineBusy, busy])

  if (!lesson) return null
  let stageContent
  if (ui.stage === 'preferences') stageContent = <CoursePreferences value={courseSpec} onChange={setCourseSpec} onSave={() => run({ type: 'save-course-spec', courseSpec }, '偏好已保存，正在准备大纲。')} busy={busy} />
  else if (ui.stage === 'outline') stageContent = <OutlineEditor lesson={lesson} busy={busy} onlineBusy={onlineBusy} onSave={outline => run({ type: 'edit-outline', lessonKey: lesson.key, outline }, '大纲修改已保存。')} onApprove={async outline => { await run({ type: 'edit-outline', lessonKey: lesson.key, outline }, '大纲修改已保存。'); await run({ type: 'approve-outline', lessonKey: lesson.key }, '大纲已批准。') }} />
  else if (ui.stage === 'writing' || ui.stage === 'review') stageContent = <NodeWorkbench lesson={lesson} onAction={run} busy={busy} onlineBusy={onlineBusy} />
  else if (ui.stage === 'assemble' || ui.stage === 'completed') stageContent = <FinalNoteStage lesson={lesson} onAction={run} busy={busy} onlineBusy={onlineBusy} />
  else stageContent = <section className='course-stage-card'><div className='course-waiting-card'><strong>课程资料已准备</strong><p>请从当前主操作继续。</p></div></section>

  return <section className='course-detail-shell'>
    <header className='course-detail-topbar'><button className='course-back-button' type='button' onClick={onBack}>← 课程库</button><div><span>课程整理</span><h2>{workflow.courseSpec?.courseName || '课程工作台'}</h2><p>{workflow.courseSpec?.teacher || '未填写教师'} · 当前：{ui.stageLabel}</p></div><div className='course-progress-box'><strong>{workflow.progress || 0}%</strong><span>{ui.explanation}</span></div><div className='course-row-actions'>{capabilities?.courseWriting?.configured && AUTO_STATUSES.has(lesson.status || workflow.status) ? <button className='soft-button primary' type='button' disabled={onlineBusy || busy} onClick={() => runNext(true)}>{onlineBusy ? '处理中…' : '继续在线处理'}</button> : null}{ui.canPause ? <button className='soft-button' type='button' disabled={busy} onClick={() => run({ type: 'pause' }, '已暂停后续处理。')}>暂停</button> : null}{ui.canResume ? <button className='soft-button' type='button' disabled={busy} onClick={() => run({ type: 'resume' }, '已恢复处理。')}>恢复</button> : null}</div></header>
    <ProgressStepper ui={ui} />
    <details className='course-service-panel'><summary>服务状态</summary><div><ServiceBadge label='在线文字识别' available={Boolean(capabilities?.onlineOcr?.configured)} detail={capabilities?.onlineOcr?.configured ? '扫描资料可以直接在线识别' : '扫描资料暂时不能自动识别'} /><ServiceBadge label='课程写作服务' available={Boolean(capabilities?.courseWriting?.configured)} detail={capabilities?.courseWriting?.configured ? '大纲、正文和审查模型已配置' : '配置完成后才能自动整理课程笔记'} /></div></details>
    <div className='course-workbench-grid'><aside className='course-lesson-rail'><h3>课次</h3>{(workflow.lessons || []).map(item => <button key={item.key} type='button' className={item.key === lesson.key ? 'active' : ''} onClick={() => setActiveLessonKey(item.key)}><b>{item.title}</b><span>{humanStatus(item.status)}</span></button>)}</aside><main className='course-stage-stack'>{stageContent}{message ? <p className={`status-line ${/失败|错误|不能|缺少/.test(message) ? 'error' : ''}`}>{message}</p> : null}{(workflow.errors || []).length ? <details className='course-diagnostics'><summary>查看诊断信息</summary>{workflow.errors.map(error => <p key={error.id}>{error.message}</p>)}</details> : null}</main></div>
  </section>
}

function CourseJobRow({ job, active, onOpen, onDelete }) {
  const workflow = job.preprocess_result?.workflow || {}
  const stats = job.preferences?.textpack_stats || {}
  const pendingHuman = ['preflight_required', 'outline_review', 'node_review', 'node_revision_required', 'final_review_human'].includes(workflow.status)
  return <article className={`course-job-row ${active ? 'active' : ''}`}><div><span>{humanStatus(workflow.status || job.current_node)}</span><h3>{job.course_name}</h3><p>{job.teacher || '未填写教师'} · {formatNumber(stats.lessonCount)} 课 · {formatNumber(stats.totalChars)} 字</p><small>进度 {workflow.progress || 0}%{pendingHuman ? ' · 等待你的确认' : ''} · {job.updated_at ? new Date(job.updated_at).toLocaleString('zh-CN') : '刚刚更新'}</small></div><div className='course-row-actions'><button className='soft-button primary' type='button' onClick={() => onOpen(job.id)}>继续整理</button><button className='soft-button danger' type='button' onClick={() => onDelete(job.id)}>删除</button></div></article>
}

function GroupingPanel({ groups, materials, onGroupsChange, onMaterialsChange, onOcr, ocrJobs, ocrAvailable }) {
  function updateGroup(key, patch) { onGroupsChange(groups.map(group => group.key === key ? { ...group, ...patch } : group)) }
  function addGroup() { const order = groups.length + 1; onGroupsChange([...groups, { key: `manual-${Date.now()}`, title: `课次 ${order}`, order, confidence: 'manual', materialKeys: [] }]) }
  function moveGroup(key, direction) {
    const index = groups.findIndex(group => group.key === key)
    const target = index + direction
    if (index < 0 || target < 0 || target >= groups.length) return
    const next = [...groups]
    const [group] = next.splice(index, 1)
    next.splice(target, 0, group)
    onGroupsChange(next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })))
  }
  function removeEmptyGroup(key) {
    if (materials.some(material => material.lessonGroupId === key)) return
    onGroupsChange(groups.filter(group => group.key !== key).map((group, index) => ({ ...group, order: index + 1 })))
  }
  function updateMaterial(clientKey, patch) { onMaterialsChange(materials.map(material => material.clientKey === clientKey ? { ...material, ...patch } : material)) }
  return <div className='course-grouping-panel'>
    <div className='course-stage-heading'><div><span>确认课次</span><h3>检查资料如何归组</h3></div><p>系统综合文件名、日期、标题和内容提示分组；低置信度项目请手动确认。</p></div>
    <div className='course-groups'>{groups.map(group => {
      const members = materials.filter(material => material.lessonGroupId === group.key)
      return <section className='course-group-card' key={group.key}><header><input value={group.title} onChange={event => { updateGroup(group.key, { title: event.target.value }); onMaterialsChange(materials.map(material => material.lessonGroupId === group.key ? { ...material, lessonTitle: event.target.value } : material)) }} /><div className='course-group-header-meta'><span>{members.length} 份资料 · {group.confidence === 'high' ? '识别可靠' : group.confidence === 'medium' ? '建议确认' : '需要确认'}</span><div className='course-group-order-actions'><button type='button' disabled={group.order === 1} onClick={() => moveGroup(group.key, -1)}>上移</button><button type='button' disabled={group.order === groups.length} onClick={() => moveGroup(group.key, 1)}>下移</button>{members.length === 0 ? <button type='button' className='danger' onClick={() => removeEmptyGroup(group.key)}>删除</button> : null}</div></div></header>
        <div>{members.map(material => { const job = ocrJobs[material.clientKey]; return <article key={material.clientKey}><div><strong>{material.sourceFile}</strong><small>{KIND_LABELS[material.kind] || '课程资料'} · {formatNumber(material.charCount)} 字</small>{job?.state === 'done' ? <small className='course-ocr-complete'>已在线识别 {job.extractedPages || job.totalPages || 0} 页</small> : null}</div><label>材料作用<select value={material.role} onChange={event => updateMaterial(material.clientKey, { role: event.target.value })}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>所属课次<select value={material.lessonGroupId} onChange={event => { const nextGroup = groups.find(item => item.key === event.target.value); updateMaterial(material.clientKey, { lessonGroupId: event.target.value, lessonOrder: nextGroup?.order || 1, lessonTitle: nextGroup?.title || '' }) }}>{groups.map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>{material.ocrRequired ? <div className='course-ocr-action'><button className='soft-button primary' type='button' disabled={!ocrAvailable || ['uploading', 'running'].includes(job?.state)} onClick={() => onOcr(material)}>{job?.state === 'uploading' ? '正在上传…' : job?.state === 'running' ? `识别中 ${job.extractedPages || 0}/${job.totalPages || '…'}` : '在线识别'}</button>{!ocrAvailable ? <small>在线识别尚未配置</small> : job?.error ? <small className='error'>{job.error}</small> : null}</div> : null}</article>})}</div>
      </section>
    })}</div>
    <button className='soft-button' type='button' onClick={addGroup}>＋ 新建课次</button>
  </div>
}

export function CourseTextPackDesk() {
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
  const fileInputRef = useRef(null)

  const summary = useMemo(() => { if (!textPack) return null; try { return summarizeTextPack(textPack) } catch (error) { return { error: error instanceof Error ? error.message : '课程资料无法预览' } } }, [textPack])
  async function refreshJobs() { const response = await fetch('/api/courses/textpack'); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || '课程列表读取失败'); setJobs(data.jobs || []) }
  useEffect(() => { refreshJobs().catch(error => setMessage(error.message)); fetch('/api/courses/capabilities').then(response => response.ok ? response.json() : null).then(data => { if (data?.ok) setCapabilities(data) }).catch(() => {}) }, [])

  function appendFiles(nextFiles) {
    const existing = new Set(files.map(materialFileKey)); const additions = nextFiles.filter(file => !existing.has(materialFileKey(file)))
    const merged = [...files, ...additions]
    if (nextFiles.length && additions.length < nextFiles.length) setMessage(`已忽略 ${nextFiles.length - additions.length} 份重复资料。`)
    else setMessage('')
    setFiles(merged); setTextPack(null); setMaterials([]); setGroups([]); setImportStep('select')
    setRoles(current => ({ ...current, ...Object.fromEntries(additions.map(file => [materialFileKey(file), inferredRole(file)])) }))
    if (!courseName) setCourseName(defaultCourseName(merged))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  function removeFile(key) { setFiles(current => current.filter(file => materialFileKey(file) !== key)); setRoles(current => { const next = { ...current }; delete next[key]; return next }); setMaterials([]); setGroups([]); setTextPack(null); setImportStep('select') }
  function handleFileDrop(event) {
    event.preventDefault()
    setDragActive(false)
    appendFiles(Array.from(event.dataTransfer?.files || []))
  }

  async function analyzeFiles() {
    setStatus('preparing'); setMessage(''); setParseProgress({ current: 0, total: files.length, fileName: '' })
    try {
      const parsed = await parseCourseMaterialFiles(files, roles, setParseProgress)
      const suggested = suggestLessonGroups(parsed.materials)
      setMaterials(suggested.materials); setGroups(suggested.groups); setStatus('grouping'); setImportStep('group')
      setMessage(parsed.warnings.length ? parsed.warnings.join('；') : '资料已读取，请确认课次与材料作用。')
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '课程资料整理失败') } finally { setParseProgress(null) }
  }

  async function startOcr(material) {
    const file = files.find(item => materialFileKey(item) === material.clientKey)
    if (!file) return setMessage('找不到这份本地文件，请重新添加。')
    setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'uploading' } }))
    try {
      const sessionResponse = await fetch('/api/courses/ocr/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ maxBytes: file.size }) })
      const session = await sessionResponse.json(); if (!sessionResponse.ok || !session.ok) throw new Error(session.error || '无法连接在线文字识别')
      const form = new FormData(); form.append('file', file)
      const submitResponse = await fetch(`${session.serviceUrl}/api/ocr/jobs`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, body: form })
      const submitted = await submitResponse.json(); if (!submitResponse.ok || !submitted.ok) throw new Error(submitted.detail || submitted.error || '识别任务提交失败')
      const poll = async () => {
        const response = await fetch(`${session.serviceUrl}/api/ocr/jobs/${submitted.jobId}`, { headers: { authorization: `Bearer ${submitted.accessToken}` } })
        const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.detail || data.error || '识别进度读取失败')
        setOcrJobs(current => ({ ...current, [material.clientKey]: { state: data.state === 'done' ? 'finishing' : 'running', totalPages: data.totalPages, extractedPages: data.extractedPages } }))
        if (data.state === 'failed') throw new Error(data.error || '在线文字识别失败')
        if (data.state !== 'done') { window.setTimeout(() => poll().catch(handleError), 3500); return }
        const resultResponse = await fetch(`${session.serviceUrl}/api/ocr/jobs/${submitted.jobId}/result`, { headers: { authorization: `Bearer ${submitted.accessToken}` } })
        const resultData = await resultResponse.json(); if (!resultResponse.ok || !resultData.ok) throw new Error(resultData.detail || resultData.error || '识别结果读取失败')
        setMaterials(current => current.map(item => item.clientKey === material.clientKey ? applyOcrResultToMaterial(item, resultData.result) : item))
        setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'done', totalPages: resultData.result.totalPages, extractedPages: resultData.result.totalPages, dailyPagesUsed: data.dailyPagesUsed, dailyPageBudget: data.dailyPageBudget } }))
        fetch(`${session.serviceUrl}/api/ocr/jobs/${submitted.jobId}`, { method: 'DELETE', headers: { authorization: `Bearer ${submitted.accessToken}` } }).catch(() => {})
      }
      const handleError = error => setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'error', error: error instanceof Error ? error.message : '在线识别失败' } }))
      await poll()
    } catch (error) { setOcrJobs(current => ({ ...current, [material.clientKey]: { state: 'error', error: error instanceof Error ? error.message : '在线识别失败' } })) }
  }

  function buildPreview() {
    const pending = materials.filter(material => material.ocrRequired)
    if (pending.length) { setMessage(`还有 ${pending.length} 份资料等待在线文字识别。完成识别或移除这些资料后再继续。`); return }
    const groupMap = new Map(groups.map((group, index) => [group.key, { ...group, order: index + 1 }]))
    const assigned = materials.map(material => { const group = groupMap.get(material.lessonGroupId); return { ...material, lessonOrder: group?.order || 1, lessonTitle: group?.title || `课次 ${group?.order || 1}` } })
    try {
      const input = materialsToTextPackInput({ materials: assigned, courseName: courseName || defaultCourseName(files), teacher })
      const next = buildTextPack({ course: input.course, preferences: { origin: 'browser-online-workflow', deterministicPreprocess: true }, lessons: input.lessons, decks: input.decks, warnings: input.warnings })
      setTextPack(next); setStatus('ready'); setImportStep('review'); setMessage('课次与资料已经整理完成，请最后确认后导入。')
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '课程资料无法预览') }
  }

  async function handleImport() {
    if (!textPack) return; setStatus('importing'); setMessage('')
    try { const response = await fetch('/api/courses/textpack', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ textPack }) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || '课程资料导入失败'); await refreshJobs(); if (data.job?.id) await openJob(data.job.id); setMessage(data.existing ? '这份课程资料已经存在，已打开原有进度。' : '课程资料已导入。') } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '课程资料导入失败') }
  }
  async function openJob(jobId) { const response = await fetch(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || '课程进度读取失败'); setSelectedJobId(jobId); setSelectedWorkflow(data.workflow); setView('workbench') }
  async function runWorkflowAction(jobId, action) { const response = await fetch(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || '课程操作失败'); setSelectedWorkflow(data.workflow); await refreshJobs(); return data.workflow }
  async function runNext(jobId) { const response = await fetch(`/api/courses/jobs/${encodeURIComponent(jobId)}/run-next`, { method: 'POST' }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || '在线处理失败'); if (data.workflow) setSelectedWorkflow(data.workflow); return data }
  async function handleDelete(jobId) { if (typeof window !== 'undefined' && !window.confirm('删除这门课程的文字资料和整理进度？原始本地文件不会受到影响。')) return; const response = await fetch(`/api/courses/textpack?id=${encodeURIComponent(jobId)}`, { method: 'DELETE' }); const data = await response.json(); if (!response.ok || !data.ok) return setMessage(data.error || '删除失败'); if (selectedJobId === jobId) { setSelectedJobId(''); setSelectedWorkflow(null) }; await refreshJobs() }

  if (view === 'workbench' && selectedWorkflow) return <CourseWorkbench jobId={selectedJobId} workflow={selectedWorkflow} capabilities={capabilities} onAction={runWorkflowAction} onRefresh={openJob} onRunNext={runNext} onBack={() => setView('library')} />

  return <div className='course-workspace compact'>
    <nav className='course-page-switcher'><button type='button' className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>课程库</button><button type='button' className={view === 'import' ? 'active' : ''} onClick={() => setView('import')}>导入资料</button></nav>
    {view === 'library' ? <section className='course-library-panel'><div className='section-heading compact'><span>课程库</span><h2>已导入课程</h2></div>{jobs.length ? <div className='course-job-list compact-list'>{jobs.map(job => <CourseJobRow key={job.id} job={job} active={selectedJobId === job.id} onOpen={openJob} onDelete={handleDelete} />)}</div> : <div className='course-empty-state'><strong>课程库还是空的</strong><p>从“导入资料”添加课堂转录、课件或已有笔记。</p><button className='soft-button primary' type='button' onClick={() => setView('import')}>导入第一门课程</button></div>}</section> : null}
    {view === 'import' ? <section className='course-import-shell'>
      <header className='course-import-header'><div><span>导入课程资料</span><h2>{courseName || '新课程'}</h2><p>普通文字资料只在浏览器读取；扫描资料通过在线文字识别后，仅保存文字结果。</p></div><div><ServiceBadge label='在线文字识别' available={Boolean(capabilities?.onlineOcr?.configured)} detail={capabilities?.onlineOcr?.configured ? 'PDF、图片和图片型课件可直接识别' : '扫描资料暂不可识别'} /></div></header>
      <nav className='course-import-steps'><button className={importStep === 'select' ? 'active' : ''} type='button' onClick={() => setImportStep('select')}>1 选择资料</button><button className={importStep === 'group' ? 'active' : ''} type='button' disabled={!materials.length} onClick={() => setImportStep('group')}>2 确认课次</button><button className={importStep === 'review' ? 'active' : ''} type='button' disabled={!textPack} onClick={() => setImportStep('review')}>3 确认导入</button></nav>
      {importStep === 'select' ? <div className='course-import-pane'><div className='course-form-grid'><label>课程名称<input value={courseName} onChange={event => setCourseName(event.target.value)} placeholder='例如：证据法专题课' /></label><label>教师<input value={teacher} onChange={event => setTeacher(event.target.value)} placeholder='可选' /></label></div><label className={`course-file-drop ${dragActive ? 'is-dragging' : ''}`} onDragEnter={event => { event.preventDefault(); setDragActive(true) }} onDragOver={event => { event.preventDefault(); setDragActive(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false) }} onDrop={handleFileDrop}><input ref={fileInputRef} multiple accept='.srt,.pptx,.ppt,.docx,.doc,.txt,.md,.markdown,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff' type='file' onChange={event => appendFiles(Array.from(event.target.files || []))} /><strong>{dragActive ? '松开即可添加' : files.length ? '继续添加资料' : '选择或拖入课程资料'}</strong><span>支持 SRT、PPTX、DOCX、TXT、Markdown、PDF 和常见图片；可以分多次添加。</span></label><div className='course-selected-files'>{files.length ? files.map(file => <article key={materialFileKey(file)}><div><strong>{file.name}</strong><small>{formatNumber(file.size)} 字节</small></div><label>材料作用<select value={roles[materialFileKey(file)] || inferredRole(file)} onChange={event => setRoles(current => ({ ...current, [materialFileKey(file)]: event.target.value }))}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className='course-file-remove' type='button' onClick={() => removeFile(materialFileKey(file))}>移除</button></article>) : <div className='course-empty-state'><strong>还没有选择资料</strong><p>同一门课程可一次或分多次添加多节课资料。</p></div>}</div>{parseProgress ? <LoadingLine label={`正在读取 ${parseProgress.current}/${parseProgress.total}`} detail={parseProgress.fileName} /> : null}<div className='course-primary-row'><button className='soft-button primary' type='button' disabled={!files.length || status === 'preparing'} onClick={analyzeFiles}>{status === 'preparing' ? '正在读取…' : '整理并识别课次'}</button></div></div> : null}
      {importStep === 'group' ? <div className='course-import-pane'><GroupingPanel groups={groups} materials={materials} onGroupsChange={setGroups} onMaterialsChange={setMaterials} onOcr={startOcr} ocrJobs={ocrJobs} ocrAvailable={Boolean(capabilities?.onlineOcr?.configured)} /><div className='course-primary-row'><button className='soft-button' type='button' onClick={() => setImportStep('select')}>返回添加资料</button><button className='soft-button primary' type='button' onClick={buildPreview}>确认课次并继续</button></div></div> : null}
      {importStep === 'review' ? <div className='course-import-pane'>{summary && !summary.error ? <><dl className='course-summary-grid'><div><dt>课程</dt><dd>{summary.courseName}</dd></div><div><dt>课次</dt><dd>{summary.lessonCount}</dd></div><div><dt>课件</dt><dd>{summary.deckCount}</dd></div><div><dt>文字</dt><dd>{formatNumber(summary.totalChars)}</dd></div></dl>{summary.warnings.length ? <div className='course-warning-list'>{summary.warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}</div> : <p className='muted'>资料可以导入，没有发现阻塞性问题。</p>}<div className='course-primary-row'><button className='soft-button' type='button' onClick={() => setImportStep('group')}>返回调整课次</button><button className='soft-button primary' type='button' disabled={status === 'importing'} onClick={handleImport}>{status === 'importing' ? '正在导入…' : '导入课程'}</button></div></> : <p className='status-line error'>{summary?.error || '课程资料尚未准备完成。'}</p>}</div> : null}
      {message ? <p className={`status-line ${status === 'error' || /失败|等待/.test(message) ? 'error' : ''}`}>{message}</p> : null}
    </section> : null}
  </div>
}
