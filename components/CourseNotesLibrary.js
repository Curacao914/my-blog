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
  const [error, setError] = useState('')

  useEffect(() => {
    requestCourseJson('/api/courses/notes', {}, '笔记库读取失败')
      .then(data => {
        setCourses(data.courses || [])
        setState('ready')
      })
      .catch(reason => {
        setError(formatCourseApiError(reason, '笔记库读取失败'))
        setState('error')
      })
  }, [])

  const totals = useMemo(() => ({
    courses: courses.length,
    notes: courses.reduce((sum, course) => sum + Number(course.noteCount || 0), 0),
    lessons: courses.reduce((sum, course) => sum + Number(course.lessonCount || 0), 0)
  }), [courses])

  if (state === 'loading') {
    return <section className='note-library-shell'><p className='empty-copy'>正在读取笔记库…</p></section>
  }

  if (state === 'error') {
    return <section className='note-library-shell'><p className='status-line error'>{error}</p></section>
  }

  return <section className='note-library-shell'>
    <header className='note-library-head'>
      <div>
        <span>Notes Library</span>
        <h2>课程与笔记</h2>
        <p>一门课程包含多个课次；每个课次保存自己的最终笔记和版本。</p>
      </div>
      <dl>
        <div><dt>课程</dt><dd>{totals.courses}</dd></div>
        <div><dt>课次</dt><dd>{totals.lessons}</dd></div>
        <div><dt>笔记</dt><dd>{totals.notes}</dd></div>
      </dl>
    </header>

    {courses.length ? <div className='note-library-list'>{courses.map(course => (
      <article className='note-library-course' key={course.id}>
        <header>
          <div>
            <span>{statusLabel(course.status)}</span>
            <h3>{course.courseName}</h3>
            <p>{course.teacher || '未填写教师'} · {course.noteCount}/{course.lessonCount} 份笔记</p>
          </div>
          <div className='course-row-actions'>
            <Link className='soft-button' href={'/desk/courses?job=' + encodeURIComponent(course.id) + '&action=supplement'}>加课次</Link>
            <Link className='soft-button primary' href={'/desk/courses?job=' + encodeURIComponent(course.id)}>打开课程</Link>
          </div>
        </header>

        <div className='note-library-lessons'>
          {course.lessons.map(lesson => (
            <div className={'note-library-lesson ' + (lesson.hasNote ? 'has-note' : '')} key={lesson.key}>
              <div className='note-library-order'>{lesson.order || '·'}</div>
              <div>
                <span>{statusLabel(lesson.status)}</span>
                <h4>{lesson.title}</h4>
                <p>{lesson.hasNote ? lesson.summary || '已经生成最终笔记。' : '这个课次尚未形成最终笔记。'}</p>
                <small>{lesson.hasNote ? '约 ' + Number(lesson.charCount || 0).toLocaleString('zh-CN') + ' 字 · ' : ''}{formatDate(lesson.updatedAt)}</small>
              </div>
              <Link className='soft-button' href={'/desk/courses?job=' + encodeURIComponent(course.id) + '&lesson=' + encodeURIComponent(lesson.key)}>
                {lesson.hasNote ? '阅读 / 修改' : '继续整理'}
              </Link>
            </div>
          ))}
        </div>
      </article>
    ))}</div> : <div className='course-empty-state'>
      <strong>笔记库还是空的</strong>
      <p>完成第一份课程笔记后，会按“课程 → 课次”出现在这里。</p>
      <Link className='soft-button primary' href='/desk/courses'>开始整理课程</Link>
    </div>}
  </section>
}
