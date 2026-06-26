import { useEffect, useMemo, useState } from 'react'

import {
  materialsToTextPackInput,
  parseCourseMaterialFiles
} from '@/lib/course/materialParsers'
import {
  buildTextPack,
  safeName,
  summarizeTextPack
} from '@/lib/course/textpack'
import { getCourseUiState } from '@/lib/course/uiState'

const ROLE_OPTIONS = [
  ['transcript', '课堂转录'],
  ['slides', '课件'],
  ['handout', '教师讲义'],
  ['supplement', '补充材料'],
  ['existing_note', '已有笔记']
]

const MATERIAL_KIND_LABELS = {
  transcript: '课堂转录',
  deck: '课件',
  document: '文档',
  markdown: 'Markdown',
  note: '已有笔记'
}

const MATERIAL_ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS)

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified || 0}`
}

function defaultCourseName(files) {
  const first = files[0]?.name || ''
  return safeName(first.replace(/\.[^.]+$/, '').replace(/第\s*\d+\s*[讲课节].*$/, ''), '未命名课程')
}

function inferredRole(file) {
  const ext = String(file?.name || '').split('.').pop()?.toLowerCase()
  if (ext === 'srt') return 'transcript'
  if (ext === 'pptx' || ext === 'ppt') return 'slides'
  if (ext === 'docx' || ext === 'doc') return 'handout'
  if (ext === 'md' || ext === 'markdown') return 'existing_note'
  return 'supplement'
}

function humanStatus(status) {
  const labels = {
    preflight_required: '等待确认偏好',
    preflight_approved: '准备设计大纲',
    outline_pending: '等待设计大纲',
    outline_generating: '正在设计大纲',
    outline_review: '等待确认大纲',
    outline_approved: '大纲已确认',
    node_planning: '正在拆分正文',
    node_pending: '等待整理正文',
    node_generating: '正在整理正文',
    node_review: '等待检查或确认',
    node_revision_required: '需要修改',
    assembly_pending: '等待整理全文',
    assembling: '正在整理全文',
    final_review: '正在整体检查',
    final_review_human: '等待最终确认',
    completed: '已完成',
    paused: '已暂停',
    failed: '处理失败',
    cancelled: '已取消'
  }
  return labels[status] || '准备中'
}

function latestReview(node) {
  return node?.reviewerReports?.at?.(-1)?.value || null
}

function reviewDecisionLabel(decision) {
  return ({ approve: '通过', revise: '需要修改', human_review: '需要人工判断', human_approved: '人工确认' })[decision] || '等待检查'
}

function isLocalServiceOnline(workflow) {
  const lastSeen = Date.parse(workflow?.worker?.lastSeenAt || '')
  return workflow?.worker?.status === 'online' && Number.isFinite(lastSeen) && Date.now() - lastSeen < 120000
}

async function buildCourseMaterialBundle({ files, roles, courseName, teacher }) {
  const parsed = await parseCourseMaterialFiles(files, roles)
  if (!parsed.materials.length) {
    throw new Error(parsed.warnings[0] || '没有识别到可导入的课程资料。')
  }
  const input = materialsToTextPackInput({
    materials: parsed.materials,
    courseName: courseName || defaultCourseName(files),
    teacher
  })
  const textPack = buildTextPack({
    course: input.course,
    preferences: {
      origin: 'browser-local-preprocess',
      deterministicPreprocess: true
    },
    lessons: input.lessons,
    decks: input.decks,
    warnings: [...parsed.warnings, ...input.warnings]
  })
  return {
    textPack,
    materials: parsed.materials,
    warnings: [...parsed.warnings, ...input.warnings]
  }
}

function ServiceBadge({ label, available, detail }) {
  return (
    <div className={`course-service-badge ${available ? 'is-online' : 'is-offline'}`}>
      <span>{label}</span>
      <strong>{available ? '可用' : '未连接'}</strong>
      <small>{detail}</small>
    </div>
  )
}

function CourseJobRow({ job, active, onOpen, onDelete }) {
  const workflow = job.preprocess_result?.workflow || {}
  const stats = job.preferences?.textpack_stats || {}
  const pendingHuman = ['preflight_required', 'outline_review', 'node_review', 'node_revision_required', 'final_review_human'].includes(workflow.status)
  return (
    <article className={`course-job-row ${active ? 'active' : ''}`}>
      <div>
        <span>{humanStatus(workflow.status || job.current_node)}</span>
        <h3>{job.course_name}</h3>
        <p>{job.teacher || '未填写教师'} · {formatNumber(stats.lessonCount)} 课 · {formatNumber(stats.totalChars)} 字</p>
        <small>进度 {workflow.progress || 0}%{pendingHuman ? ' · 等待你的确认' : ''} · {job.updated_at ? new Date(job.updated_at).toLocaleString('zh-CN') : '刚刚更新'}</small>
      </div>
      <div className='course-row-actions'>
        <button className='soft-button primary' type='button' onClick={() => onOpen(job.id)}>继续整理</button>
        <button className='soft-button danger' type='button' onClick={() => onDelete(job.id)}>删除</button>
      </div>
    </article>
  )
}

function ProgressStepper({ ui }) {
  return (
    <ol className='course-stepper' aria-label='课程整理进度'>
      {ui.stages.map((stage, index) => (
        <li key={stage.key} className={`${stage.complete ? 'is-complete' : ''} ${stage.current ? 'is-current' : ''} ${stage.locked ? 'is-locked' : ''}`}>
          <i>{stage.complete ? '✓' : index + 1}</i>
          <span>{stage.label}</span>
        </li>
      ))}
    </ol>
  )
}

function CoursePreferences({ value, onChange, onSave, busy }) {
  return (
    <section className='course-stage-card'>
      <div className='course-stage-heading'>
        <div><span>第一步</span><h3>确定笔记整理方式</h3></div>
        <p>这些规则会同时交给大纲、正文和审查环节。</p>
      </div>
      <div className='course-form-grid three'>
        <label>笔记用途
          <select value={value.goal || '全面笔记'} onChange={event => onChange({ ...value, goal: event.target.value })}>
            <option>全面笔记</option><option>闭卷复习</option><option>案例训练</option><option>快速回顾</option>
          </select>
        </label>
        <label>详细程度
          <select value={value.detailLevel || 'high'} onChange={event => onChange({ ...value, detailLevel: event.target.value })}>
            <option value='compact'>紧凑</option><option value='high'>详细</option><option value='exam'>闭卷复习</option>
          </select>
        </label>
        <label>课堂口语
          <select value={value.preserveOralStyle || 'clean'} onChange={event => onChange({ ...value, preserveOralStyle: event.target.value })}>
            <option value='clean'>整理为书面表达</option><option value='selective'>保留关键原话</option><option value='preserve'>尽量保留</option>
          </select>
        </label>
        <label>法条处理
          <select value={value.statuteMode || 'explain-when-mentioned'} onChange={event => onChange({ ...value, statuteMode: event.target.value })}>
            <option value='explain-when-mentioned'>出现时展开</option><option value='table'>集中整理</option><option value='minimal'>仅保留引用</option>
          </select>
        </label>
        <label>案例处理
          <select value={value.caseMode || 'extract-facts-issue-rule'} onChange={event => onChange({ ...value, caseMode: event.target.value })}>
            <option value='extract-facts-issue-rule'>完整整理</option><option value='brief'>简要提及</option>
          </select>
        </label>
        <label>自动审查严格度
          <select value={String(value.qualityThreshold || 75)} onChange={event => onChange({ ...value, qualityThreshold: Number(event.target.value) })}>
            <option value='70'>适中</option><option value='75'>严格</option><option value='85'>很严格</option>
          </select>
        </label>
      </div>
      <label className='course-wide-label'>补充要求
        <textarea value={value.fixedStyle || ''} onChange={event => onChange({ ...value, fixedStyle: event.target.value })} placeholder='例如：老师的个人观点单独标记；案例必须保留事实、争点、结论和论证意义。' />
      </label>
      <div className='course-primary-row'>
        <button className='soft-button primary' type='button' disabled={busy} onClick={onSave}>保存偏好并继续</button>
      </div>
    </section>
  )
}

function OutlineEditor({ lesson, onSave, onApprove, busy }) {
  const [outline, setOutline] = useState(lesson.outline || [])

  useEffect(() => setOutline(lesson.outline || []), [lesson.key, lesson.outline])

  function update(index, patch) {
    setOutline(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch, userEdited: true } : item))
  }

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= outline.length) return
    setOutline(items => {
      const next = [...items]
      const [current] = next.splice(index, 1)
      next.splice(target, 0, current)
      return next.map(item => ({ ...item, userEdited: true }))
    })
  }

  function remove(index) {
    setOutline(items => items.filter((_, itemIndex) => itemIndex !== index))
  }

  function add() {
    const last = outline.at(-1)
    const start = Number(last?.lineRange?.[1] || 0) + 1
    setOutline(items => [...items, {
      id: `outline-user-${Date.now()}`,
      title: '新节点', lineRange: [start, start], slideRange: [1, 1], rationale: '', importance: 'normal', locked: false, userEdited: true,
      concepts: [], statutes: [], cases: []
    }])
  }

  const awaitingGeneration = !outline.length
  return (
    <section className='course-stage-card'>
      <div className='course-stage-heading'>
        <div><span>第二步</span><h3>确认本课大纲</h3></div>
        <p>{awaitingGeneration ? '本地处理服务会先阅读全部材料，再生成可核对来源的大纲。' : '逐项检查标题、转录范围和课件页码。锁定的节点不会被自动改写。'}</p>
      </div>
      {awaitingGeneration ? (
        <div className='course-waiting-card'><strong>正在等待大纲</strong><p>保持本地处理服务运行，完成后刷新本页即可查看。</p></div>
      ) : (
        <div className='course-outline-list'>
          {outline.map((node, index) => (
            <article className='course-outline-item' key={node.id || index}>
              <div className='course-outline-order'>{index + 1}</div>
              <div className='course-outline-fields'>
                <label>节点标题<input value={node.title || ''} onChange={event => update(index, { title: event.target.value })} /></label>
                <div className='course-range-grid'>
                  <label>转录起始行<input type='number' min='1' value={node.lineRange?.[0] || 1} onChange={event => update(index, { lineRange: [Number(event.target.value), Number(node.lineRange?.[1] || event.target.value)] })} /></label>
                  <label>结束行<input type='number' min='1' value={node.lineRange?.[1] || 1} onChange={event => update(index, { lineRange: [Number(node.lineRange?.[0] || 1), Number(event.target.value)] })} /></label>
                  <label>课件起始页<input type='number' min='1' value={node.slideRange?.[0] || 1} onChange={event => update(index, { slideRange: [Number(event.target.value), Number(node.slideRange?.[1] || event.target.value)] })} /></label>
                  <label>结束页<input type='number' min='1' value={node.slideRange?.[1] || 1} onChange={event => update(index, { slideRange: [Number(node.slideRange?.[0] || 1), Number(event.target.value)] })} /></label>
                </div>
                <label>本节点要解决什么<textarea value={node.rationale || ''} onChange={event => update(index, { rationale: event.target.value })} /></label>
              </div>
              <div className='course-outline-actions'>
                <button type='button' onClick={() => move(index, -1)} disabled={index === 0}>上移</button>
                <button type='button' onClick={() => move(index, 1)} disabled={index === outline.length - 1}>下移</button>
                <button type='button' className={node.locked ? 'is-active' : ''} onClick={() => update(index, { locked: !node.locked })}>{node.locked ? '已锁定' : '锁定'}</button>
                <button type='button' className='danger' onClick={() => remove(index)}>删除</button>
              </div>
            </article>
          ))}
          <button type='button' className='course-add-outline' onClick={add}>＋ 添加大纲节点</button>
        </div>
      )}
      {!awaitingGeneration ? (
        <div className='course-primary-row'>
          <button className='soft-button' type='button' disabled={busy || !outline.length} onClick={() => onSave(outline)}>保存修改</button>
          <button className='soft-button primary' type='button' disabled={busy || !outline.length} onClick={() => onApprove(outline)}>批准大纲</button>
        </div>
      ) : null}
    </section>
  )
}

function ReviewReport({ report }) {
  if (!report) return <p className='empty-copy'>正文生成后会进行独立检查。</p>
  const scores = [['覆盖', report.coverage], ['依据', report.grounding], ['逻辑', report.logic], ['细节', report.detail], ['来源', report.sourceCoverage]]
  return (
    <div className={`course-review-report decision-${report.decision || 'pending'}`}>
      <header><strong>{reviewDecisionLabel(report.decision)}</strong><span>审查结果</span></header>
      <div className='course-review-scores'>{scores.map(([label, value]) => <div key={label}><span>{label}</span><b>{Number(value || 0)}</b></div>)}</div>
      {report.issues?.length ? <ul>{report.issues.map((issue, index) => <li key={index}>{typeof issue === 'string' ? issue : issue.message || issue.detail || issue.type}</li>)}</ul> : <p>没有发现需要补充的问题。</p>}
    </div>
  )
}

function NodeWorkbench({ lesson, initialNodeId, onAction, busy }) {
  const nodes = lesson.nodes || []
  const [selectedId, setSelectedId] = useState(initialNodeId || nodes[0]?.id || '')
  const selected = nodes.find(node => node.id === selectedId) || nodes[0]
  const [draft, setDraft] = useState(selected?.draft || '')
  const [request, setRequest] = useState('')
  const [humanReason, setHumanReason] = useState('')

  useEffect(() => {
    const next = nodes.find(node => node.id === selectedId) || nodes[0]
    if (next && next.id !== selectedId) setSelectedId(next.id)
    setDraft(next?.draft || '')
    setRequest('')
    setHumanReason('')
  }, [lesson.key, selectedId, selected?.draft, nodes.length])

  if (!nodes.length) {
    return <section className='course-stage-card'><div className='course-waiting-card'><strong>正在建立正文结构</strong><p>大纲批准后，本地处理服务会按来源范围创建节点。</p></div></section>
  }

  const report = latestReview(selected)
  const reviewIsCurrent = Number(report?.reviewedDraftVersion || 0) === Number(selected?.versions?.length || 0)
  const canApprove = report?.decision === 'approve' && reviewIsCurrent
  const needsHuman = report?.decision === 'human_review' && reviewIsCurrent
  const needsRevision = selected?.status === 'node_revision_required' || report?.decision === 'revise'

  return (
    <section className='course-stage-card course-node-workbench'>
      <div className='course-stage-heading'>
        <div><span>正文与审查</span><h3>逐节点整理</h3></div>
        <p>每个节点单独生成、检查和确认，未通过的内容不会进入最终笔记。</p>
      </div>
      <div className='course-node-layout'>
        <nav className='course-node-nav' aria-label='正文节点'>
          {nodes.map((node, index) => (
            <button key={node.id} type='button' className={node.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(node.id)}>
              <i>{index + 1}</i><span><b>{node.title}</b><small>{humanStatus(node.status)}</small></span>
            </button>
          ))}
        </nav>
        {selected ? (
          <div className='course-node-editor'>
            <header>
              <div><span>转录 {selected.lineRange?.join('–')} 行 · 课件 {selected.slideRange?.join('–')} 页</span><h4>{selected.title}</h4></div>
              <strong>{humanStatus(selected.status)}</strong>
            </header>
            <label>节点正文<textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder='正文会由本地处理服务生成，也可以在这里继续修改。' /></label>
            <div className='course-primary-row'>
              <button className='soft-button' type='button' disabled={busy || !draft.trim()} onClick={() => onAction({ type: 'save-node-draft', lessonKey: lesson.key, nodeId: selected.id, markdown: draft }, '节点草稿已保存。')}>保存草稿</button>
              {canApprove ? <button className='soft-button primary' type='button' disabled={busy} onClick={() => onAction({ type: 'approve-node', lessonKey: lesson.key, nodeId: selected.id }, '节点已确认。')}>确认本节点</button> : null}
            </div>
            {!reviewIsCurrent && report ? <p className='empty-copy'>正文已修改，正在等待重新检查。</p> : <ReviewReport report={report} />}
            {needsRevision ? (
              <div className='course-feedback-box'>
                <label>补充修改要求<textarea value={request} onChange={event => setRequest(event.target.value)} placeholder='指出需要补充、删改或重新核对的具体内容。' /></label>
                <button className='soft-button primary' type='button' disabled={busy || !request.trim()} onClick={() => onAction({ type: 'request-node-revision', lessonKey: lesson.key, nodeId: selected.id, request }, '修改要求已提交。')}>提交局部修改</button>
              </div>
            ) : null}
            {needsHuman ? (
              <div className='course-feedback-box'>
                <label>人工判断说明<textarea value={humanReason} onChange={event => setHumanReason(event.target.value)} placeholder='说明接受当前版本的理由。' /></label>
                <button className='soft-button primary' type='button' disabled={busy || !humanReason.trim()} onClick={() => onAction({ type: 'approve-node-human', lessonKey: lesson.key, nodeId: selected.id, reason: humanReason }, '节点已由你确认。')}>人工确认本节点</button>
              </div>
            ) : null}
            <details className='course-source-drawer'><summary>查看本节点来源</summary><pre>{selected.sourceText || '没有可显示的转录来源。'}</pre>{selected.pptText ? <pre>{selected.pptText}</pre> : null}</details>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function FinalNoteStage({ lesson, onAction, busy }) {
  const [markdown, setMarkdown] = useState(lesson.finalNote?.markdown || '')
  useEffect(() => setMarkdown(lesson.finalNote?.markdown || ''), [lesson.key, lesson.finalNote?.markdown])

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

  if (!markdown) return <section className='course-stage-card'><div className='course-waiting-card'><strong>正在整理最终笔记</strong><p>所有节点确认后，系统会按大纲顺序汇总并进行整体检查。</p></div></section>

  const report = lesson.qualityReport || lesson.finalNote?.qualityReport
  return (
    <section className='course-stage-card'>
      <div className='course-stage-heading'>
        <div><span>最终成果</span><h3>{lesson.status === 'completed' ? '本课笔记已完成' : '检查最终笔记'}</h3></div>
        <p>{lesson.status === 'completed' ? '可以继续编辑或导出 Markdown。' : '整体检查通过后，本课才会正式完成。'}</p>
      </div>
      <textarea className='course-final-note' value={markdown} onChange={event => setMarkdown(event.target.value)} />
      <div className='course-primary-row'>
        <button className='soft-button' type='button' disabled={busy || !markdown.trim()} onClick={() => onAction({ type: 'save-final-note', lessonKey: lesson.key, markdown }, '最终笔记修改已保存，将重新进行整体检查。')}>保存修改</button>
        <button className='soft-button' type='button' onClick={() => navigator.clipboard?.writeText(markdown)}>复制</button>
        <button className='soft-button primary' data-course-export type='button' onClick={exportMarkdown}>导出 Markdown</button>
        {lesson.status === 'final_review_human' ? <button className='soft-button primary' type='button' disabled={busy} onClick={() => onAction({ type: 'approve-final-review', lessonKey: lesson.key }, '最终笔记已确认。')}>确认最终笔记</button> : null}
      </div>
      {report ? <ReviewReport report={report} /> : <p className='empty-copy'>正在等待整体检查结果。</p>}
    </section>
  )
}

function CourseWorkbench({ jobId, workflow, capabilities, onAction, onRefresh }) {
  const firstIncomplete = workflow.lessons?.find(lesson => lesson.status !== 'completed') || workflow.lessons?.[0]
  const [activeLessonKey, setActiveLessonKey] = useState(firstIncomplete?.key || '')
  const [courseSpec, setCourseSpec] = useState(workflow.courseSpec || {})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const lesson = workflow.lessons?.find(item => item.key === activeLessonKey) || firstIncomplete
  const ui = getCourseUiState(workflow, lesson)
  const localOnline = isLocalServiceOnline(workflow)
  const headerPrimaryTypes = new Set(['refresh', 'resume', 'retry'])
  const showHeaderPrimary = ui.primaryAction && headerPrimaryTypes.has(ui.primaryAction.type)

  useEffect(() => {
    if (!workflow.lessons?.some(item => item.key === activeLessonKey)) setActiveLessonKey(firstIncomplete?.key || '')
    setCourseSpec(workflow.courseSpec || {})
  }, [workflow.updatedAt, activeLessonKey, firstIncomplete?.key])

  async function run(action, success) {
    setBusy(true); setMessage('')
    try {
      await onAction(jobId, action)
      setMessage(success || '操作已完成。')
      await onRefresh(jobId)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  if (!lesson) return null

  async function runPrimary() {
    const type = ui.primaryAction?.type
    if (!type) return
    if (type === 'save-course-spec') return run({ type, courseSpec }, '偏好已保存，正在准备大纲。')
    if (type === 'approve-outline') return run({ type, lessonKey: lesson.key }, '大纲已批准。')
    if (type === 'approve-final-review') return run({ type, lessonKey: lesson.key }, '最终笔记已确认。')
    if (type === 'resume' || type === 'retry') return run({ type }, '课程整理已继续。')
    if (type === 'refresh') return onRefresh(jobId)
    if (type === 'export') {
      const button = document.querySelector('[data-course-export]')
      button?.click()
    }
  }

  let stageContent = null
  if (ui.stage === 'preferences') {
    stageContent = <CoursePreferences value={courseSpec} onChange={setCourseSpec} onSave={() => run({ type: 'save-course-spec', courseSpec }, '偏好已保存，正在准备大纲。')} busy={busy} />
  } else if (ui.stage === 'outline') {
    stageContent = <OutlineEditor lesson={lesson} busy={busy} onSave={outline => run({ type: 'edit-outline', lessonKey: lesson.key, outline }, '大纲修改已保存。')} onApprove={async outline => {
      await run({ type: 'edit-outline', lessonKey: lesson.key, outline }, '大纲修改已保存。')
      await run({ type: 'approve-outline', lessonKey: lesson.key }, '大纲已批准。')
    }} />
  } else if (ui.stage === 'writing' || ui.stage === 'review') {
    stageContent = <NodeWorkbench lesson={lesson} onAction={run} busy={busy} />
  } else if (ui.stage === 'assemble' || ui.stage === 'completed') {
    stageContent = <FinalNoteStage lesson={lesson} onAction={run} busy={busy} />
  } else {
    stageContent = <section className='course-stage-card'><div className='course-waiting-card'><strong>课程资料已准备</strong><p>请从当前主操作继续。</p></div></section>
  }

  return (
    <section className='course-detail-shell'>
      <header className='course-detail-topbar'>
        <div>
          <span>课程整理</span>
          <h2>{workflow.courseSpec?.courseName || '课程工作台'}</h2>
          <p>{workflow.courseSpec?.teacher || '未填写教师'} · 当前：{ui.stageLabel}</p>
        </div>
        <div className='course-progress-box'><strong>{workflow.progress || 0}%</strong><span>{ui.explanation}</span></div>
        <div className='course-row-actions'>
          {showHeaderPrimary ? <button className='soft-button primary' type='button' disabled={busy || Boolean(ui.blockedReason)} onClick={runPrimary}>{ui.primaryAction.label}</button> : null}
          {ui.canPause ? <button className='soft-button' type='button' disabled={busy} onClick={() => run({ type: 'pause' }, '已暂停后续处理。')}>暂停</button> : null}
          {ui.canResume ? <button className='soft-button' type='button' disabled={busy} onClick={() => run({ type: 'resume' }, '已恢复处理。')}>恢复</button> : null}
        </div>
      </header>

      <ProgressStepper ui={ui} />

      <div className='course-service-panel'>
        <ServiceBadge label='本地处理服务' available={localOnline} detail={localOnline ? '正在连接课程任务' : '运行本地服务后可自动整理大纲与正文'} />
        <ServiceBadge label='课程写作服务' available={Boolean(capabilities?.courseWriting?.configured)} detail={capabilities?.courseWriting?.configured ? '大纲、正文和审查模型已配置' : '尚未配置模型，页面不会伪装生成成功'} />
        {ui.blockedReason ? <p>{ui.blockedReason}</p> : <p>所有阶段与结果都会保存，刷新页面后可以继续。</p>}
      </div>

      <div className='course-lesson-tabs' role='tablist' aria-label='课次'>
        {(workflow.lessons || []).map(item => (
          <button key={item.key} type='button' role='tab' aria-selected={item.key === lesson.key} className={item.key === lesson.key ? 'active' : ''} onClick={() => setActiveLessonKey(item.key)}>
            <b>{item.title}</b><span>{humanStatus(item.status)}</span>
          </button>
        ))}
      </div>

      {stageContent}

      {message ? <p className={`status-line ${/失败|错误|不能|缺少/.test(message) ? 'error' : ''}`}>{message}</p> : null}
      {(workflow.errors || []).length ? (
        <details className='course-diagnostics'><summary>查看诊断信息</summary>{workflow.errors.map(error => <p key={error.id}>{error.message}</p>)}</details>
      ) : null}
    </section>
  )
}

export function CourseTextPackDesk() {
  const [files, setFiles] = useState([])
  const [roles, setRoles] = useState({})
  const [courseName, setCourseName] = useState('')
  const [teacher, setTeacher] = useState('')
  const [textPack, setTextPack] = useState(null)
  const [materialPreview, setMaterialPreview] = useState([])
  const [jobs, setJobs] = useState([])
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [capabilities, setCapabilities] = useState(null)

  const summary = useMemo(() => {
    if (!textPack) return null
    try { return summarizeTextPack(textPack) } catch (error) { return { error: error instanceof Error ? error.message : '课程资料无法预览' } }
  }, [textPack])

  async function refreshJobs() {
    const response = await fetch('/api/courses/textpack')
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.error || '课程列表读取失败')
    setJobs(data.jobs || [])
  }

  useEffect(() => {
    refreshJobs().catch(error => setMessage(error.message))
    fetch('/api/courses/capabilities').then(response => response.ok ? response.json() : null).then(data => { if (data?.ok) setCapabilities(data) }).catch(() => {})
  }, [])

  async function openJob(jobId) {
    const response = await fetch(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`)
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.error || '课程进度读取失败')
    setSelectedJobId(jobId)
    setSelectedWorkflow(data.workflow)
  }

  async function runWorkflowAction(jobId, action) {
    const response = await fetch(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action)
    })
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.error || '课程操作失败')
    setSelectedWorkflow(data.workflow)
    await refreshJobs()
    return data.workflow
  }

  async function handlePreview() {
    setStatus('preparing'); setMessage('')
    try {
      const result = await buildCourseMaterialBundle({ files, roles, courseName, teacher })
      setTextPack(result.textPack); setMaterialPreview(result.materials || []); setCourseName(result.textPack.course.name)
      setStatus('ready'); setMessage('资料整理完成。请检查课次、材料角色和文字数量。')
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : '课程资料整理失败')
    }
  }

  async function handleImport() {
    if (!textPack) return
    setStatus('importing'); setMessage('')
    try {
      const response = await fetch('/api/courses/textpack', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ textPack }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || '课程资料导入失败')
      setStatus('imported'); setMessage(data.existing ? '这份课程资料已经存在，已打开原有进度。' : '课程资料已导入。')
      await refreshJobs()
      if (data.job?.id) await openJob(data.job.id)
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : '课程资料导入失败')
    }
  }

  async function handleDelete(jobId) {
    if (typeof window !== 'undefined' && !window.confirm('删除这门课程的文字资料和整理进度？原始本地文件不会受到影响。')) return
    try {
      const response = await fetch(`/api/courses/textpack?id=${encodeURIComponent(jobId)}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || '删除失败')
      if (selectedJobId === jobId) { setSelectedJobId(''); setSelectedWorkflow(null) }
      await refreshJobs(); setMessage('课程资料和整理进度已删除。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '删除失败') }
  }

  function selectFiles(nextFiles) {
    setFiles(nextFiles); setTextPack(null); setMaterialPreview([])
    setRoles(Object.fromEntries(nextFiles.map(file => [fileKey(file), inferredRole(file)])))
    if (!courseName) setCourseName(defaultCourseName(nextFiles))
  }

  const canPreview = files.length > 0 && status !== 'preparing'
  const canImport = textPack && !summary?.error && status !== 'importing'

  return (
    <div className='course-workspace'>
      <section className='course-import-panel'>
        <div className='section-heading compact'><span>课程资料</span><h2>导入课程资料</h2></div>
        <p className='muted'>原始文件只在浏览器或本地服务中读取；确认后，仅保存整理出的文字和来源位置。</p>
        <div className='course-form-grid'>
          <label>课程名称<input value={courseName} onChange={event => setCourseName(event.target.value)} placeholder='例如：证据法专题课' /></label>
          <label>教师<input value={teacher} onChange={event => setTeacher(event.target.value)} placeholder='可选' /></label>
        </div>
        <label className='course-file-drop'>
          <input multiple accept='.srt,.pptx,.ppt,.docx,.doc,.txt,.md,.markdown,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document' type='file' onChange={event => selectFiles(Array.from(event.target.files || []))} />
          <strong>选择或拖入课程资料</strong>
          <span>支持 SRT、PPTX、DOCX、TXT 和 Markdown；同一课次可组合多份资料。</span>
        </label>
        <div className='course-selected-files'>
          {files.length ? files.map(file => (
            <article key={fileKey(file)}>
              <div><strong>{file.name}</strong><small>{formatNumber(file.size)} 字节</small></div>
              <label>材料作用<select value={roles[fileKey(file)] || inferredRole(file)} onChange={event => setRoles(current => ({ ...current, [fileKey(file)]: event.target.value }))}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </article>
          )) : <div className='course-empty-state'><strong>还没有选择资料</strong><p>选择课堂转录、课件、教师讲义或已有笔记开始整理。</p></div>}
        </div>
        <div className='course-primary-row'>
          <button className='soft-button' type='button' disabled={!canPreview} onClick={handlePreview}>{status === 'preparing' ? '正在整理…' : '整理内容'}</button>
          <button className='soft-button primary' type='button' disabled={!canImport} onClick={handleImport}>{status === 'importing' ? '正在导入…' : '导入课程'}</button>
        </div>
        {message ? <p className={`status-line ${status === 'error' ? 'error' : ''}`}>{message}</p> : null}
      </section>

      <aside className='course-side-panel'>
        <div className='section-heading compact'><span>检查</span><h2>确认课程内容</h2></div>
        {summary && !summary.error ? (
          <>
            <dl className='course-summary-grid'>
              <div><dt>课次</dt><dd>{summary.lessonCount}</dd></div><div><dt>课件</dt><dd>{summary.deckCount}</dd></div>
              <div><dt>文字</dt><dd>{formatNumber(summary.totalChars)}</dd></div><div><dt>需要识别</dt><dd>{summary.ocrRequired}</dd></div>
            </dl>
            {summary.warnings.length ? <div className='course-warning-list'>{summary.warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}</div> : <p className='muted'>资料可以导入，没有发现阻塞性问题。</p>}
            <div className='course-material-preview'>{materialPreview.map((material, index) => <article key={`${material.sourceFile}-${index}`}><strong>{material.title || material.sourceFile}</strong><span>{MATERIAL_KIND_LABELS[material.kind] || '课程资料'} · {MATERIAL_ROLE_LABELS[material.role] || '补充材料'} · {formatNumber(material.charCount)} 字{material.slideCount ? ` · ${material.slideCount} 页` : ''}</span>{material.warnings?.length ? <small>{material.warnings.join('；')}</small> : null}</article>)}</div>
          </>
        ) : summary?.error ? <p className='status-line error'>{summary.error}</p> : <div className='course-empty-state'><strong>等待整理资料</strong><p>整理完成后，可在这里核对课次、文字数量和需要识别的内容。</p></div>}
      </aside>

      <section className='course-job-list'>
        <div className='section-heading compact'><span>课程库</span><h2>已导入课程</h2></div>
        {jobs.length ? jobs.map(job => <CourseJobRow key={job.id} job={job} active={selectedJobId === job.id} onOpen={openJob} onDelete={handleDelete} />) : <div className='course-empty-state'><strong>课程库还是空的</strong><p>从上方选择资料，确认文字内容后导入第一门课程。</p></div>}
      </section>

      {selectedWorkflow ? <CourseWorkbench jobId={selectedJobId} workflow={selectedWorkflow} capabilities={capabilities} onAction={runWorkflowAction} onRefresh={openJob} /> : null}
    </div>
  )
}
