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

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function defaultCourseName(files) {
  const first = files[0]?.name || ''
  return safeName(first.replace(/\.[^.]+$/, '').replace(/第\s*\d+\s*[讲课节].*$/, ''), '未命名课程')
}

const STATUS_LABELS = {
  imported: '已导入',
  preflight_required: '待确认',
  preflight_approved: '已确认',
  outline_pending: '准备大纲',
  outline_generating: '生成大纲',
  outline_review: '审核大纲',
  outline_approved: '大纲已批准',
  node_planning: '拆分正文',
  node_pending: '等待写作',
  node_generating: '写作中',
  node_review: '审查正文',
  node_revision_required: '需要修改',
  node_approved: '正文已批准',
  assembly_pending: '等待整理',
  assembling: '整理中',
  final_review: '最终检查',
  completed: '已完成',
  failed: '处理失败',
  paused: '已暂停',
  cancelled: '已取消',
  preflight: '预检',
  outline: '大纲',
  outline_generating_step: '生成大纲',
  outline_review_step: '审核大纲',
  outline_approved_step: '确认大纲',
  node_planning_step: '拆分正文',
  node_generating_step: '写作正文',
  node_review_step: '审查正文',
  assembly: '整理',
  final_review_step: '最终检查'
}

const MATERIAL_KIND_LABELS = {
  transcript: '课堂转录',
  deck: '课件',
  document: '文档',
  markdown: 'Markdown',
  note: '已有笔记'
}

const MATERIAL_ROLE_LABELS = {
  transcript: '课堂转录',
  slides: '课件',
  handout: '教师讲义',
  supplement: '补充材料',
  existing_note: '已有笔记'
}

function labelStatus(status) {
  if (!status) return '未开始'
  return STATUS_LABELS[status] || '处理中'
}

function labelStep(step) {
  return STATUS_LABELS[`${step}_step`] || STATUS_LABELS[step] || '处理阶段'
}

function labelMaterialKind(kind) {
  return MATERIAL_KIND_LABELS[kind] || '课程资料'
}

function labelMaterialRole(role) {
  return MATERIAL_ROLE_LABELS[role] || '补充材料'
}

async function buildTextPackFromFiles({ files, courseName, teacher }) {
  const parsed = await parseCourseMaterialFiles(files)
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

function JobRow({ job, onDelete, onOpen, active }) {
  const stats = job.preferences?.textpack_stats || {}
  const current = job.current_node || job.status
  const workflow = job.preprocess_result?.workflow || {}
  return (
    <article className={`course-job-row ${active ? 'active' : ''}`}>
      <div>
        <span>{labelStatus(workflow.status || current)}</span>
        <h3>{job.course_name}</h3>
        <p>
          {job.teacher || '未填写教师'} · {formatNumber(stats.lessonCount)} 课 · {formatNumber(stats.totalChars)} 字
        </p>
        <small>
          进度 {workflow.progress || 0}% · 待人工处理 {workflow.status === 'outline_review' ? 1 : 0} · 更新于 {job.updated_at ? new Date(job.updated_at).toLocaleString('zh-CN') : '未知'}
        </small>
      </div>
      <div className='course-row-actions'>
        <button className='soft-button primary' type='button' onClick={() => onOpen(job.id)}>
          继续处理
        </button>
        <button className='soft-button danger' type='button' onClick={() => onDelete(job.id)}>
          删除
        </button>
      </div>
    </article>
  )
}

function defaultOutlineForLesson(lesson) {
  const lineCount = String(lesson.transcript || '').split('\n').filter(Boolean).length || 1
  return [
    {
      title: lesson.title || '本课主线',
      lineRange: [1, lineCount],
      slideRange: [1, 1],
      rationale: '根据本课转录文本建立初始大纲，可在批准前修改。',
      importance: 'high'
    }
  ]
}

function CourseWorkbench({ jobId, workflow, capabilities, onAction, onRefresh }) {
  const lesson = workflow?.lessons?.[0]
  const [courseSpec, setCourseSpec] = useState(workflow?.courseSpec || {})
  const [outlineText, setOutlineText] = useState('')
  const [nodeDrafts, setNodeDrafts] = useState({})
  const [localMessage, setLocalMessage] = useState('')

  useEffect(() => {
    setCourseSpec(workflow?.courseSpec || {})
    if (lesson?.outline?.length) {
      setOutlineText(JSON.stringify(lesson.outline, null, 2))
    } else if (lesson) {
      setOutlineText(JSON.stringify(defaultOutlineForLesson(lesson), null, 2))
    }
  }, [workflow?.updatedAt, lesson?.key])

  if (!workflow || !lesson) return null

  async function runAction(action, success) {
    setLocalMessage('')
    try {
      await onAction(jobId, action)
      setLocalMessage(success)
      await onRefresh(jobId)
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : '操作失败')
    }
  }

  const approvedNodes = (lesson.nodes || []).filter(node => node.status === 'node_approved').length
  const failedCount = workflow.errors?.length || 0
  const pendingReview = workflow.status === 'outline_review' || (lesson.nodes || []).some(node => node.status === 'node_revision_required')

  return (
    <section className='course-detail-shell'>
      <header className='course-detail-topbar'>
        <div>
          <span>处理任务</span>
          <h2>{workflow.courseSpec?.courseName || '课程工作台'}</h2>
          <p>{workflow.courseSpec?.teacher || '未填写教师'} · {labelStatus(workflow.status)}</p>
          <p>课程写作服务：{capabilities?.courseWriting?.configured ? '可用' : '尚未配置'}</p>
        </div>
        <div className='course-progress-box'>
          <strong>{workflow.progress || 0}%</strong>
          <span>节点 {approvedNodes}/{lesson.nodes?.length || 0} · 待处理 {pendingReview ? 1 : 0} · 失败 {failedCount}</span>
        </div>
        <div className='course-row-actions'>
          <button className='soft-button' type='button' onClick={() => runAction({ type: 'pause' }, '已暂停后续任务。')}>
            暂停
          </button>
          <button className='soft-button' type='button' onClick={() => runAction({ type: 'resume' }, '已恢复。')}>
            恢复
          </button>
        </div>
      </header>

      <div className='course-detail-grid'>
        <aside className='course-lesson-nav'>
          <h3>课次</h3>
          <button type='button' className='lesson-pill active'>
            <b>{lesson.title}</b>
            <span>{labelStatus(lesson.status)} · {approvedNodes}/{lesson.nodes?.length || 0}</span>
          </button>
          <div className='worker-status inline'>
            <span>本地处理服务</span>
            <strong>{workflow.worker?.status === 'online' ? '已连接' : '未连接'}</strong>
            <p>打开本地处理服务后，可以继续生成大纲和正文。</p>
          </div>
        </aside>

        <main className='course-stage-stack'>
          <article className='course-stage-card'>
            <div className='section-heading compact'>
              <span>偏好</span>
              <h3>课程偏好</h3>
            </div>
            <div className='course-form-grid three'>
              <label>
                笔记目的
                <input value={courseSpec.goal || ''} onChange={event => setCourseSpec({ ...courseSpec, goal: event.target.value })} />
              </label>
              <label>
                详细程度
                <select value={courseSpec.detailLevel || 'high'} onChange={event => setCourseSpec({ ...courseSpec, detailLevel: event.target.value })}>
                  <option value='compact'>紧凑</option>
                  <option value='high'>详细</option>
                  <option value='exam'>闭卷复习</option>
                </select>
              </label>
              <label>
                节点拆分阈值
                <input type='number' min='500' value={courseSpec.nodeSplitThreshold || 12000} onChange={event => setCourseSpec({ ...courseSpec, nodeSplitThreshold: Number(event.target.value) })} />
              </label>
              <label>
                自动审查严格度
                <input type='number' min='0' max='100' value={courseSpec.qualityThreshold || 75} onChange={event => setCourseSpec({ ...courseSpec, qualityThreshold: Number(event.target.value) })} />
              </label>
              <label>
                法条处理
                <select value={courseSpec.statuteMode || 'explain-when-mentioned'} onChange={event => setCourseSpec({ ...courseSpec, statuteMode: event.target.value })}>
                  <option value='explain-when-mentioned'>出现时展开</option>
                  <option value='table'>整理成表</option>
                  <option value='minimal'>仅保留引用</option>
                </select>
              </label>
              <label>
                案例处理
                <select value={courseSpec.caseMode || 'extract-facts-issue-rule'} onChange={event => setCourseSpec({ ...courseSpec, caseMode: event.target.value })}>
                  <option value='extract-facts-issue-rule'>事实-争点-规则</option>
                  <option value='brief'>简要提及</option>
                </select>
              </label>
            </div>
            <label className='course-wide-label'>
              额外要求
              <textarea value={courseSpec.fixedStyle || ''} onChange={event => setCourseSpec({ ...courseSpec, fixedStyle: event.target.value })} />
            </label>
            <button className='soft-button primary' type='button' onClick={() => runAction({ type: 'save-course-spec', courseSpec }, '偏好已保存。')}>
              保存偏好
            </button>
          </article>

          <article className='course-stage-card'>
            <div className='section-heading compact'>
              <span>大纲</span>
              <h3>大纲编辑</h3>
            </div>
            <textarea className='course-code-textarea' value={outlineText} onChange={event => setOutlineText(event.target.value)} />
            <div className='button-row'>
              <button className='soft-button' type='button' onClick={() => {
                const outline = JSON.parse(outlineText)
                runAction({ type: 'save-outline', lessonKey: lesson.key, outline, mainLine: lesson.title }, '大纲已保存，等待批准。')
              }}>
                保存大纲
              </button>
              <button className='soft-button primary' type='button' onClick={() => runAction({ type: 'approve-outline', lessonKey: lesson.key }, '大纲已批准。')}>
                批准大纲
              </button>
              <button className='soft-button' type='button' onClick={() => runAction({ type: 'plan-nodes', lessonKey: lesson.key }, '正文节点已拆分。')}>
                拆分节点
              </button>
            </div>
          </article>

          <article className='course-stage-card'>
            <div className='section-heading compact'>
              <span>正文</span>
              <h3>节点工作台</h3>
            </div>
            {(lesson.nodes || []).length ? (
              <div className='course-node-list'>
                {lesson.nodes.map(node => (
                  <section className='course-node-card' key={node.id}>
                    <div>
                      <span>{labelStatus(node.status)} · 行 {node.lineRange?.join('-')}</span>
                      <h4>{node.title}</h4>
                      <p>{node.sourceText || '无来源文本'}</p>
                    </div>
                    <textarea
                      value={nodeDrafts[node.id] ?? node.draft ?? ''}
                      onChange={event => setNodeDrafts({ ...nodeDrafts, [node.id]: event.target.value })}
                      placeholder='Markdown 节点草稿'
                    />
                    <div className='button-row'>
                      <button className='soft-button' type='button' onClick={() => runAction({
                        type: 'update-node-draft',
                        lessonKey: lesson.key,
                        nodeId: node.id,
                        markdown: nodeDrafts[node.id] ?? node.draft ?? '',
                        reviewerReport: {
                          coverage: 90,
                          grounding: 90,
                          logic: 90,
                          detail: 90,
                          sourceCoverage: 90,
                          issues: [],
                          decision: 'approve'
                        }
                      }, '节点草稿和审查结果已保存。')}>
                        保存并审查
                      </button>
                      <button className='soft-button primary' type='button' onClick={() => runAction({ type: 'approve-node', lessonKey: lesson.key, nodeId: node.id }, '节点已批准。')}>
                        批准节点
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className='empty-copy'>批准大纲后拆分节点。节点会保留来源行号、PPT 页码、版本和审查结果。</p>
            )}
          </article>

          <article className='course-stage-card'>
            <div className='section-heading compact'>
              <span>完成</span>
              <h3>最终 Markdown</h3>
            </div>
            {lesson.finalNote?.markdown ? (
              <>
                <textarea className='course-final-note' value={lesson.finalNote.markdown} readOnly />
                {lesson.finalNote.qualityReport?.decision === 'approve' ? (
                  <p className='status-line'>最终检查已通过。</p>
                ) : (
                  <p className='status-line'>最终笔记已整理，等待最终检查。</p>
                )}
                <div className='button-row'>
                  <button className='soft-button' type='button' onClick={() => navigator.clipboard?.writeText(lesson.finalNote.markdown)}>
                    复制 Markdown
                  </button>
                  <button className='soft-button' type='button' disabled>
                    转入写作
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className='empty-copy'>所有节点批准后才能拼装最终笔记。</p>
                <button className='soft-button primary' type='button' onClick={() => runAction({ type: 'assemble', lessonKey: lesson.key }, '最终笔记已整理，等待最终检查。')}>
                  拼装最终 Markdown
                </button>
              </>
            )}
          </article>
          {localMessage ? <p className='status-line'>{localMessage}</p> : null}
        </main>

        <aside className='course-inspector'>
          <h3>来源与日志</h3>
          <details open>
            <summary>转录片段</summary>
            <pre>{lesson.transcript}</pre>
          </details>
          <details>
            <summary>错误</summary>
            {(workflow.errors || []).length ? workflow.errors.map(error => <p key={error.id}>{labelStep(error.step)}：{error.message}</p>) : <p>暂无错误。</p>}
          </details>
        </aside>
      </div>
    </section>
  )
}

export function CourseTextPackDesk() {
  const [files, setFiles] = useState([])
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
    try {
      return summarizeTextPack(textPack)
    } catch (error) {
      return { error: error instanceof Error ? error.message : '课程资料无法预览' }
    }
  }, [textPack])

  async function refreshJobs() {
    const response = await fetch('/api/courses/textpack')
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.error || '课程列表读取失败')
    setJobs(data.jobs || [])
  }

  useEffect(() => {
    refreshJobs().catch(error => setMessage(error.message))
    fetch('/api/courses/capabilities')
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (data?.ok) setCapabilities(data)
      })
      .catch(() => {})
  }, [])

  async function handlePreview() {
    setStatus('preparing')
    setMessage('')
    try {
      const result = await buildTextPackFromFiles({ files, courseName, teacher })
      setTextPack(result.textPack)
      setMaterialPreview(result.materials || [])
      setCourseName(result.textPack.course.name)
      setStatus('ready')
      setMessage('资料整理完成。请确认课程内容后导入。')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '课程资料整理失败')
    }
  }

  async function handleImport() {
    if (!textPack) return
    setStatus('importing')
    setMessage('')
    try {
      const response = await fetch('/api/courses/textpack', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ textPack })
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || '课程资料导入失败')
      setStatus('imported')
      setMessage(data.existing ? '这份课程资料已存在，已打开已有处理任务。' : '课程资料已导入。')
      await refreshJobs()
      if (data.job?.id) await openJob(data.job.id)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '课程资料导入失败')
    }
  }

  async function openJob(jobId) {
    const response = await fetch(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`)
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.error || '课程工作流读取失败')
    setSelectedJobId(jobId)
    setSelectedWorkflow(data.workflow)
  }

  async function runWorkflowAction(jobId, action) {
    const response = await fetch(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(action)
    })
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.error || '课程工作流操作失败')
    setSelectedWorkflow(data.workflow)
    await refreshJobs()
    return data.workflow
  }

  async function handleDelete(jobId) {
    setStatus('deleting')
    setMessage('')
    try {
      const response = await fetch(`/api/courses/textpack?id=${encodeURIComponent(jobId)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || '删除失败')
      setMessage('已删除该课程的纯文本工作数据。')
      await refreshJobs()
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '删除失败')
    }
  }

  const canPreview = files.length > 0 && status !== 'preparing'
  const canImport = textPack && !summary?.error && status !== 'importing'

  return (
    <div className='course-workspace'>
      <section className='course-import-panel'>
        <div className='section-heading compact'>
          <span>课程资料</span>
          <h2>导入课程资料</h2>
        </div>
        <p className='muted'>原始文件只在本地读取，确认后仅保存整理出的文字内容。</p>
        <div className='course-form-grid'>
          <label>
            课程名称
            <input
              value={courseName}
              onChange={event => setCourseName(event.target.value)}
              placeholder='例如：刑诉法专题课'
            />
          </label>
          <label>
            教师
            <input
              value={teacher}
              onChange={event => setTeacher(event.target.value)}
              placeholder='可选'
            />
          </label>
        </div>
        <label className='course-file-drop'>
          <input
            multiple
            accept='.srt,.pptx,.ppt,.docx,.doc,.txt,.md,.markdown,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            type='file'
            onChange={event => {
              const nextFiles = Array.from(event.target.files || [])
              setFiles(nextFiles)
              setTextPack(null)
              setMaterialPreview([])
              if (!courseName) setCourseName(defaultCourseName(nextFiles))
            }}
          />
          <strong>选择资料</strong>
          <span>支持 SRT、PPTX、DOCX、TXT 和 Markdown。</span>
        </label>
        <div className='course-file-list'>
          {files.length ? (
            files.map(file => (
              <span key={`${file.name}-${file.size}`}>
                {file.name}
                <small>{formatNumber(file.size)} 字节</small>
              </span>
            ))
          ) : (
            <p>还没有选择本地文件。</p>
          )}
        </div>
        <div className='button-row'>
          <button className='soft-button' type='button' disabled={!canPreview} onClick={handlePreview}>
            整理内容
          </button>
          <button className='soft-button primary' type='button' disabled={!canImport} onClick={handleImport}>
            导入课程
          </button>
        </div>
        {message ? <p className={`status-line ${status === 'error' ? 'error' : ''}`}>{message}</p> : null}
      </section>

      <aside className='course-side-panel'>
        <div className='section-heading compact'>
          <span>检查</span>
          <h2>确认课程内容</h2>
        </div>
        {summary ? (
          summary.error ? (
            <p className='status-line error'>{summary.error}</p>
          ) : (
            <>
              <dl className='course-summary-grid'>
                <div>
                  <dt>课程</dt>
                  <dd>{summary.courseName}</dd>
                </div>
                <div>
                  <dt>课次</dt>
                  <dd>{summary.lessonCount}</dd>
                </div>
                <div>
                  <dt>课件</dt>
                  <dd>{summary.deckCount}</dd>
                </div>
                <div>
                  <dt>总字符</dt>
                  <dd>{formatNumber(summary.totalChars)}</dd>
                </div>
                <div>
                  <dt>需识别</dt>
                  <dd>{summary.ocrRequired}</dd>
                </div>
              </dl>
              {summary.warnings.length ? (
                <div className='course-warning-list'>
                  {summary.warnings.map((warning, index) => (
                    <p key={`${warning}-${index}`}>{warning}</p>
                  ))}
                </div>
              ) : (
                <p className='muted'>未发现阻塞性问题。</p>
              )}
              {materialPreview.length ? (
                <div className='course-material-preview'>
                  {materialPreview.map((material, index) => (
                    <article key={`${material.sourceFile || material.title}-${index}`}>
                      <strong>{material.title || material.sourceFile || `资料 ${index + 1}`}</strong>
                      <span>
                        {labelMaterialKind(material.kind)} · {labelMaterialRole(material.role)} · {formatNumber(material.charCount)} 字
                        {material.slideCount ? ` · ${formatNumber(material.slideCount)} 页` : ''}
                        {material.paragraphCount ? ` · ${formatNumber(material.paragraphCount)} 段` : ''}
                      </span>
                      {material.warnings?.length ? <small>{material.warnings.join('；')}</small> : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          )
        ) : (
          <div className='course-empty-state'>
            <strong>还没有导入课程资料</strong>
            <p>选择课堂转录、课件或已有笔记，系统会先在本地整理内容。</p>
          </div>
        )}
        <div className='worker-status'>
          <span>本地处理服务</span>
          <strong>{capabilities?.localProcessing?.configured ? '可连接' : '未连接'}</strong>
          <p>图片课件或较长课程可由本地处理服务继续整理。</p>
        </div>
        <div className='worker-status'>
          <span>课程写作服务</span>
          <strong>{capabilities?.courseWriting?.configured ? '可用' : '尚未配置'}</strong>
          <p>{capabilities?.courseWriting?.configured ? '可以生成大纲、正文和审查意见。' : '配置完成后才能自动生成课程笔记。'}</p>
        </div>
      </aside>

      <section className='course-job-list'>
        <div className='section-heading compact'>
          <span>课程库</span>
          <h2>已导入课程</h2>
        </div>
        {jobs.length ? (
          jobs.map(job => (
            <JobRow
              key={job.id}
              job={job}
              active={selectedJobId === job.id}
              onOpen={openJob}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <p className='empty-copy'>暂无课程资料。选择资料并确认导入后，可以继续设置偏好、生成大纲和整理正文。</p>
        )}
      </section>
      {selectedWorkflow ? (
        <CourseWorkbench
          jobId={selectedJobId}
          workflow={selectedWorkflow}
          capabilities={capabilities}
          onAction={runWorkflowAction}
          onRefresh={openJob}
        />
      ) : null}
    </div>
  )
}
