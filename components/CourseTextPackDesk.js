import { useEffect, useMemo, useState } from 'react'

import { extractPptxTextFromFile } from '@/lib/course/pptxText'
import {
  buildTextPack,
  inferLessonOrder,
  parseSrtText,
  safeName,
  summarizeTextPack
} from '@/lib/course/textpack'

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function isSrt(file) {
  return String(file.name || '').toLowerCase().endsWith('.srt')
}

function isPptx(file) {
  return String(file.name || '').toLowerCase().endsWith('.pptx')
}

function isLegacyPpt(file) {
  return String(file.name || '').toLowerCase().endsWith('.ppt')
}

function defaultCourseName(files) {
  const first = files[0]?.name || ''
  return safeName(first.replace(/\.[^.]+$/, '').replace(/第\s*\d+\s*[讲课节].*$/, ''), '未命名课程')
}

async function buildTextPackFromFiles({ files, courseName, teacher }) {
  const warnings = []
  const srtFiles = files.filter(isSrt)
  const pptxFiles = files.filter(isPptx)
  const legacyPpt = files.filter(isLegacyPpt)

  if (legacyPpt.length) {
    warnings.push(`${legacyPpt.map(file => file.name).join('、')} 是 .ppt，请先另存为 .pptx。`)
  }

  const lessons = []
  for (const file of srtFiles) {
    const text = await file.text()
    const parsed = parseSrtText(text, file.name)
    const order = inferLessonOrder(file.name, lessons.length + 1)
    lessons.push({
      order,
      title: safeName(file.name.replace(/\.[^.]+$/, ''), `第 ${order} 课`),
      sourceFile: file.name,
      transcript: parsed.text,
      sourceMap: parsed.sourceMap,
      warnings: parsed.warnings
    })
  }

  const decks = []
  for (const file of pptxFiles) {
    decks.push(await extractPptxTextFromFile(file))
  }

  return buildTextPack({
    course: {
      name: courseName || defaultCourseName(files),
      teacher
    },
    preferences: {
      origin: 'browser-local-preprocess',
      deterministicPreprocess: true
    },
    lessons,
    decks,
    warnings
  })
}

function JobRow({ job, onDelete, onOpen, active }) {
  const stats = job.preferences?.textpack_stats || {}
  const current = job.current_node || job.status
  const workflow = job.preprocess_result?.workflow || {}
  return (
    <article className={`course-job-row ${active ? 'active' : ''}`}>
      <div>
        <span>{current}</span>
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

function CourseWorkbench({ jobId, workflow, onAction, onRefresh }) {
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
          <span>Course Job</span>
          <h2>{workflow.courseSpec?.courseName || '课程工作台'}</h2>
          <p>{workflow.courseSpec?.teacher || '未填写教师'} · {workflow.status}</p>
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
            <span>{lesson.status} · {approvedNodes}/{lesson.nodes?.length || 0}</span>
          </button>
          <div className='worker-status inline'>
            <span>Worker</span>
            <strong>{workflow.worker?.status === 'online' ? '在线' : '等待本地 Worker'}</strong>
            <p>运行 `npm run course:worker:run-job -- --job-id {jobId} --base-url http://127.0.0.1:3000 --token $COURSE_WORKER_TOKEN`。</p>
          </div>
        </aside>

        <main className='course-stage-stack'>
          <article className='course-stage-card'>
            <div className='section-heading compact'>
              <span>Preflight</span>
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
              <span>Outline</span>
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
              <button className='soft-button' type='button' onClick={() => runAction({ type: 'plan-nodes', lessonKey: lesson.key }, '节点任务已拆分。')}>
                拆分节点
              </button>
            </div>
          </article>

          <article className='course-stage-card'>
            <div className='section-heading compact'>
              <span>Nodes</span>
              <h3>节点工作台</h3>
            </div>
            {(lesson.nodes || []).length ? (
              <div className='course-node-list'>
                {lesson.nodes.map(node => (
                  <section className='course-node-card' key={node.id}>
                    <div>
                      <span>{node.status} · 行 {node.lineRange?.join('-')}</span>
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
              <span>Final</span>
              <h3>最终 Markdown</h3>
            </div>
            {lesson.finalNote?.markdown ? (
              <>
                <textarea className='course-final-note' value={lesson.finalNote.markdown} readOnly />
                <div className='button-row'>
                  <button className='soft-button' type='button' onClick={() => navigator.clipboard?.writeText(lesson.finalNote.markdown)}>
                    复制 Markdown
                  </button>
                  <button className='soft-button' type='button' disabled>
                    转入写作（后续接入）
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className='empty-copy'>所有节点批准后才能拼装最终笔记。</p>
                <button className='soft-button primary' type='button' onClick={() => runAction({ type: 'assemble', lessonKey: lesson.key }, '最终笔记已拼装。')}>
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
            {(workflow.errors || []).length ? workflow.errors.map(error => <p key={error.id}>{error.step}: {error.message}</p>) : <p>暂无错误。</p>}
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
  const [jobs, setJobs] = useState([])
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  const summary = useMemo(() => {
    if (!textPack) return null
    try {
      return summarizeTextPack(textPack)
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'TextPack 无法预览' }
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
  }, [])

  async function handlePreview() {
    setStatus('preparing')
    setMessage('')
    try {
      const nextPack = await buildTextPackFromFiles({ files, courseName, teacher })
      setTextPack(nextPack)
      setCourseName(nextPack.course.name)
      setStatus('ready')
      setMessage('TextPack 已在浏览器本地生成，确认后只上传纯文本 JSON。')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'TextPack 生成失败')
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
      if (!response.ok || !data.ok) throw new Error(data.error || 'TextPack 导入失败')
      setStatus('imported')
      setMessage(data.existing ? '这份 TextPack 已存在，已打开现有课程流程。' : 'TextPack 已导入课程流程。')
      await refreshJobs()
      if (data.job?.id) await openJob(data.job.id)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'TextPack 导入失败')
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

  const canPreview = files.some(isSrt) && status !== 'preparing'
  const canImport = textPack && !summary?.error && status !== 'importing'

  return (
    <div className='course-workspace'>
      <section className='course-import-panel'>
        <div className='section-heading compact'>
          <span>TextPack v1</span>
          <h2>本地预处理</h2>
        </div>
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
            accept='.srt,.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation'
            type='file'
            onChange={event => {
              const nextFiles = Array.from(event.target.files || [])
              setFiles(nextFiles)
              setTextPack(null)
              if (!courseName) setCourseName(defaultCourseName(nextFiles))
            }}
          />
          <strong>选择 SRT / PPTX</strong>
          <span>文件只在浏览器读取；确认导入前不会写入数据库。</span>
        </label>
        <div className='course-file-list'>
          {files.length ? (
            files.map(file => (
              <span key={`${file.name}-${file.size}`}>
                {file.name}
                <small>{formatNumber(file.size)} bytes</small>
              </span>
            ))
          ) : (
            <p>还没有选择本地文件。</p>
          )}
        </div>
        <div className='button-row'>
          <button className='soft-button' type='button' disabled={!canPreview} onClick={handlePreview}>
            生成预览
          </button>
          <button className='soft-button primary' type='button' disabled={!canImport} onClick={handleImport}>
            确认导入 TextPack
          </button>
        </div>
        {message ? <p className={`status-line ${status === 'error' ? 'error' : ''}`}>{message}</p> : null}
      </section>

      <aside className='course-side-panel'>
        <div className='section-heading compact'>
          <span>Preview</span>
          <h2>导入前检查</h2>
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
                  <dt>待 OCR</dt>
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
            </>
          )
        ) : (
          <p className='muted'>生成预览后，这里会显示配对、字符数、OCR 状态和警告。</p>
        )}
        <div className='worker-status'>
          <span>本地 Worker</span>
          <strong>未连接</strong>
          <p>可用命令行生成 TextPack 后手动导入；浏览器不会直接读取本机目录。</p>
        </div>
      </aside>

      <section className='course-job-list'>
        <div className='section-heading compact'>
          <span>Imported</span>
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
          <p className='empty-copy'>暂无课程 TextPack。导入后会在这里继续 preflight、大纲和节点写作。</p>
        )}
      </section>
      {selectedWorkflow ? (
        <CourseWorkbench
          jobId={selectedJobId}
          workflow={selectedWorkflow}
          onAction={runWorkflowAction}
          onRefresh={openJob}
        />
      ) : null}
    </div>
  )
}
