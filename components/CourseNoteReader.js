import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  extractMarkdownHeadings,
  MarkdownDocument,
  stripLeadingDuplicateTitle
} from '@/components/content/MarkdownDocument'
import { ReadingNavigator } from '@/components/content/ReadingNavigator'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { formatCourseApiError, requestCourseJson } from '@/lib/course/clientApi'

function formatDate(value) {
  if (!value) return '尚未更新'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function noteHref(courseId, lessonKey) {
  return `/desk/materials/${encodeURIComponent(courseId)}/${encodeURIComponent(lessonKey)}`
}

export function CourseNoteReader({ jobId, lessonKey }) {
  const router = useRouter()
  const articleRef = useRef(null)
  const [note, setNote] = useState(null)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [courseIndexOpen, setCourseIndexOpen] = useState(true)
  const [tocOpen, setTocOpen] = useState(true)

  useEffect(() => {
    if (!jobId || !lessonKey) return
    setState('loading')
    setMessage('')
    requestCourseJson(
      `/api/courses/notes/${encodeURIComponent(jobId)}?lesson=${encodeURIComponent(lessonKey)}`,
      {},
      '笔记读取失败'
    ).then(data => {
      setNote(data.note || null)
      setState('ready')
    }).catch(error => {
      setMessage(formatCourseApiError(error, '笔记读取失败'))
      setState('error')
    })
  }, [jobId, lessonKey])

  const readableMarkdown = useMemo(
    () => stripLeadingDuplicateTitle(note?.lesson?.markdown || '', note?.lesson?.title || ''),
    [note?.lesson?.markdown, note?.lesson?.title]
  )
  const headings = useMemo(() => extractMarkdownHeadings(readableMarkdown), [readableMarkdown])

  async function moveToTrash() {
    if (!note || busy || typeof window === 'undefined') return
    if (!window.confirm(`将“${note.lesson.title}”移入回收站？正文和历史版本都会保留，可以随时恢复。`)) return
    setBusy(true)
    setMessage('')
    try {
      await requestCourseJson(
        `/api/courses/jobs/${encodeURIComponent(note.course.id)}/workflow`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'trash-lesson-note', lessonKey: note.lesson.key })
        },
        '笔记操作失败'
      )
      await router.replace('/desk/materials?view=trash')
    } catch (error) {
      setMessage(formatCourseApiError(error, '笔记操作失败'))
      setBusy(false)
    }
  }

  function closeMobilePanel() {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) setTocOpen(false)
  }

  if (state === 'loading') {
    return <section className='course-note-reader-state'><p>正在打开笔记…</p></section>
  }

  if (state === 'error' || !note) {
    return <section className='course-note-reader-state'>
      <strong>这份笔记暂时打不开</strong>
      <p>{message || '没有找到可阅读的最终笔记。'}</p>
      <Link className='soft-button' href='/desk/materials'>回到笔记库</Link>
    </section>
  }

  const { course, lesson, navigation } = note

  return <section className={`course-note-reader ${courseIndexOpen ? 'course-index-open' : 'course-index-closed'} ${tocOpen ? 'toc-open' : 'toc-closed'}`}>
    <header className='course-note-reader-head'>
      <div className='course-note-breadcrumbs'>
        <Link href='/desk/materials'>笔记库</Link>
        <span>›</span>
        <span>遇事不决</span>
        <span>›</span>
        <span>{course.name}</span>
      </div>
      <div className='course-note-reader-tools'>
        <button type='button' aria-pressed={courseIndexOpen} onClick={() => setCourseIndexOpen(open => !open)}>
          {courseIndexOpen ? '收起课次' : '课次'}
        </button>
        <button type='button' aria-pressed={tocOpen} onClick={() => setTocOpen(open => !open)}>
          {tocOpen ? '收起目录' : '目录'}
        </button>
        <details className='course-note-reader-manage'>
          <summary>管理</summary>
          <div>
            <Link href={`/desk/courses?job=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(lesson.key)}`}>编辑原笔记</Link>
            <Link href={`/desk/publish?job=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(lesson.key)}`}>转入发布</Link>
            <button className='danger' type='button' disabled={busy} onClick={() => void moveToTrash()}>{busy ? '处理中…' : '移入回收站'}</button>
          </div>
        </details>
      </div>
    </header>

    {message ? <p className='status-line error'>{message}</p> : null}

    <div className='course-note-reader-grid'>
      {courseIndexOpen ? <aside className='course-note-course-index' aria-label='课程目录'>
        <div className='course-note-side-head'>
          <span>课程目录</span>
          <button type='button' onClick={() => setCourseIndexOpen(false)} aria-label='收起课程目录'>×</button>
        </div>
        <h2>{course.name}</h2>
        <p>{course.teacher || '未填写教师'} · {course.noteCount} 份笔记</p>
        <nav>
          {course.lessons.map(item => <Link
            aria-current={item.key === lesson.key ? 'page' : undefined}
            className={item.key === lesson.key ? 'active' : ''}
            href={noteHref(course.id, item.key)}
            key={item.key}
          >
            <b>{item.order || '·'}</b>
            <span>{item.title}</span>
          </Link>)}
        </nav>
        <div className='course-note-signature' aria-hidden='true'>
          <DynamicSignature compact />
        </div>
      </aside> : <button className='course-note-edge-toggle left' type='button' onClick={() => setCourseIndexOpen(true)}>课次</button>}

      <main className='course-note-article'>
        <header>
          <span>第 {lesson.order || '·'} 课</span>
          <h1>{lesson.title}</h1>
          <p>{Number(lesson.charCount || 0).toLocaleString('zh-CN')} 字 · {formatDate(lesson.updatedAt)}{lesson.versionCount ? ` · ${lesson.versionCount} 个版本` : ''}</p>
        </header>
        <MarkdownDocument
          articleRef={articleRef}
          className='course-note-markdown'
          markdown={readableMarkdown}
          title={lesson.title}
        />
        <nav className='course-note-pagination' aria-label='相邻课次'>
          {navigation.previous ? <Link href={noteHref(course.id, navigation.previous.key)}>
            <span>上一课</span>
            <strong>{navigation.previous.title}</strong>
          </Link> : <span />}
          {navigation.next ? <Link className='next' href={noteHref(course.id, navigation.next.key)}>
            <span>下一课</span>
            <strong>{navigation.next.title}</strong>
          </Link> : <span />}
        </nav>
      </main>

      {tocOpen ? <aside className='course-note-toc' aria-label='本文目录'>
        <div className='course-note-side-head'>
          <span>阅读导航</span>
          <button type='button' onClick={() => setTocOpen(false)} aria-label='收起本文目录'>×</button>
        </div>
        <ReadingNavigator articleRef={articleRef} headings={headings} onNavigate={closeMobilePanel} />
      </aside> : <button className='course-note-edge-toggle right' type='button' onClick={() => setTocOpen(true)}>目录</button>}
    </div>

    {(courseIndexOpen || tocOpen) ? <button className='course-note-panel-backdrop' type='button' aria-label='关闭阅读导航' onClick={() => {
      setCourseIndexOpen(false)
      setTocOpen(false)
    }} /> : null}
  </section>
}
