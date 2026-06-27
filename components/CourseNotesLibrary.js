import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { formatCourseApiError, requestCourseJson } from '@/lib/course/clientApi'

function statusLabel(status) {
  return ({
    preflight_required: '待设置',
    outline_review: '待确认大纲',
    node_pending: '整理中',
    node_review: '审查中',
    node_revision_required: '修改中',
    node_human_review: '需处理',
    assembly_pending: '待整理全文',
    assembling: '整理全文中',
    final_revision_required: '按要求修改中',
    final_review: '待最终确认',
    final_review_human: '待最终确认',
    note_removed: '最终笔记已删除',
    completed: '已完成',
    paused: '已暂停',
    failed: '处理失败'
  })[status] || '整理中'
}

function formatDate(value) {
  if (!value) return '尚未更新'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function CourseNotesLibrary() {
  const [courses, setCourses] = useState([])
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [view, setView] = useState('notes')
  const [busyKey, setBusyKey] = useState('')

  async function loadCourses() {
    const data = await requestCourseJson('/api/courses/notes', {}, '笔记库读取失败')
    setCourses(data.courses || [])
    setState('ready')
  }

  useEffect(() => {
    loadCourses().catch(error => {
      setMessage(formatCourseApiError(error, '笔记库读取失败'))
      setState('error')
    })
  }, [])

  const totals = useMemo(() => ({
    courses: courses.length,
    notes: courses.reduce((sum, course) => sum + Number(course.noteCount || 0), 0),
    lessons: courses.reduce((sum, course) => sum + Number(course.lessonCount || 0), 0),
    trash: courses.reduce((sum, course) => sum + Number(course.trashCount || 0), 0)
  }), [courses])

  const visibleCourses = useMemo(() => courses
    .map(course => ({
      ...course,
      lessons: (course.lessons || []).filter(lesson =>
        view === 'trash' ? lesson.trashed : !lesson.trashed
      )
    }))
    .filter(course => course.lessons.length), [courses, view])

  async function mutateNote(courseId, lessonKey, type, success) {
    const key = `${courseId}:${lessonKey}:${type}`
    setBusyKey(key)
    setMessage('')
    try {
      await requestCourseJson(
        `/api/courses/jobs/${encodeURIComponent(courseId)}/workflow`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type, lessonKey })
        },
        '笔记操作失败'
      )
      await loadCourses()
      setMessage(success)
    } catch (error) {
      setMessage(formatCourseApiError(error, '笔记操作失败'))
    } finally {
      setBusyKey('')
    }
  }

  function trash(course, lesson) {
    if (typeof window !== 'undefined' && !window.confirm(`将“${lesson.title}”移入回收站？正文和历史版本都会保留，可以随时恢复。`)) return
    void mutateNote(course.id, lesson.key, 'trash-lesson-note', '笔记已移入回收站。')
  }

  function restore(course, lesson) {
    void mutateNote(course.id, lesson.key, 'restore-lesson-note', '笔记已恢复。')
  }

  function purge(course, lesson) {
    if (typeof window === 'undefined') return
    if (!window.confirm(`永久删除“${lesson.title}”的最终笔记和最终版本？原始材料、大纲和节点正文会保留。`)) return
    const confirmation = window.prompt('这是不可撤销操作。请输入“永久删除”继续：', '')
    if (confirmation !== '永久删除') return
    void mutateNote(course.id, lesson.key, 'purge-lesson-note', '最终笔记已永久删除；仍可从节点正文重新生成。')
  }

  if (state === 'loading') {
    return <section className='note-library-shell'><p className='empty-copy'>正在读取笔记库…</p></section>
  }

  if (state === 'error') {
    return <section className='note-library-shell'><p className='status-line error'>{message}</p></section>
  }

  return <section className='note-library-shell'>
    <header className='note-library-head'>
      <div>
        <span>Notes Library</span>
        <h2>课程与笔记</h2>
        <p>一门课程包含多个课次；删除先进入回收站，恢复前不会丢失正文和版本。</p>
      </div>
      <dl>
        <div><dt>课程</dt><dd>{totals.courses}</dd></div>
        <div><dt>课次</dt><dd>{totals.lessons}</dd></div>
        <div><dt>笔记</dt><dd>{totals.notes}</dd></div>
      </dl>
    </header>

    <nav className='note-library-tabs' aria-label='笔记库视图'>
      <button type='button' className={view === 'notes' ? 'active' : ''} onClick={() => setView('notes')}>笔记</button>
      <button type='button' className={view === 'trash' ? 'active' : ''} onClick={() => setView('trash')}>回收站{totals.trash ? ` ${totals.trash}` : ''}</button>
    </nav>

    {message ? <p className={`status-line ${/失败|错误/.test(message) ? 'error' : ''}`}>{message}</p> : null}

    {visibleCourses.length ? <div className='note-library-list'>{visibleCourses.map(course => (
      <article className='note-library-course' key={course.id}>
        <header>
          <div>
            <span>{statusLabel(course.status)}</span>
            <h3>{course.courseName}</h3>
            <p>{course.teacher || '未填写教师'} · {course.noteCount}/{course.lessonCount} 份可见笔记</p>
          </div>
          <div className='course-row-actions'>
            <Link className='soft-button' href={'/desk/courses?job=' + encodeURIComponent(course.id) + '&action=supplement'}>加课次</Link>
            <Link className='soft-button primary' href={'/desk/courses?job=' + encodeURIComponent(course.id)}>打开课程</Link>
          </div>
        </header>

        <div className='note-library-lessons'>
          {course.lessons.map(lesson => {
            const trashBusy = busyKey.startsWith(`${course.id}:${lesson.key}:`)
            return <div className={'note-library-lesson ' + (lesson.hasNote ? 'has-note' : '') + (lesson.trashed ? ' is-trashed' : '')} key={lesson.key}>
              <div className='note-library-order'>{lesson.order || '·'}</div>
              <div>
                <span>{lesson.trashed ? '回收站' : statusLabel(lesson.status)}</span>
                <h4>{lesson.title}</h4>
                <p>{lesson.trashed
                  ? '最终笔记与历史版本仍然保留，恢复后即可继续阅读和修改。'
                  : lesson.hasNote
                    ? lesson.summary || '已经生成最终笔记。'
                    : lesson.status === 'note_removed'
                      ? '最终笔记已永久删除；原始材料、大纲和节点正文仍然保留。'
                      : '这个课次尚未形成最终笔记。'}</p>
                <small>{lesson.charCount ? `约 ${Number(lesson.charCount).toLocaleString('zh-CN')} 字 · ` : ''}{formatDate(lesson.trashed ? lesson.deletedAt : lesson.updatedAt)}</small>
              </div>
              <div className='note-library-lesson-actions'>
                {lesson.trashed ? <>
                  <button className='soft-button primary' type='button' disabled={trashBusy} onClick={() => restore(course, lesson)}>恢复</button>
                  <button className='soft-button danger' type='button' disabled={trashBusy} onClick={() => purge(course, lesson)}>永久删除</button>
                </> : <>
                  <Link className='soft-button' href={'/desk/courses?job=' + encodeURIComponent(course.id) + '&lesson=' + encodeURIComponent(lesson.key)}>
                    {lesson.hasNote ? '阅读 / 修改' : lesson.status === 'note_removed' ? '重新生成' : '继续整理'}
                  </Link>
                  {lesson.hasNote ? <button className='soft-button danger subtle' type='button' disabled={trashBusy} onClick={() => trash(course, lesson)}>移入回收站</button> : null}
                </>}
              </div>
            </div>
          })}
        </div>
      </article>
    ))}</div> : <div className='course-empty-state'>
      <strong>{view === 'trash' ? '回收站是空的' : '笔记库还是空的'}</strong>
      <p>{view === 'trash' ? '移除的课次笔记会先保存在这里。' : '完成第一份课程笔记后，会按“课程 → 课次”出现在这里。'}</p>
      {view === 'notes' ? <Link className='soft-button primary' href='/desk/courses'>开始整理课程</Link> : null}
    </div>}
  </section>
}
