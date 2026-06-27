import Link from 'next/link'
import { useRouter } from 'next/router'
import { Children, isValidElement, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

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

function plainText(children) {
  return Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (isValidElement(child)) return plainText(child.props.children)
    return ''
  }).join('')
}

function headingId(value = '') {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/[`*_~[\]()<>{}:：，。！？、“”‘’'"/\\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section'
}

function extractHeadings(markdown = '') {
  return String(markdown || '').split('\n').flatMap((line, index) => {
    const match = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/)
    if (!match) return []
    const title = match[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~`]/g, '')
      .trim()
    return [{ level: match[1].length, title, id: headingId(title), line: index + 1 }]
  })
}

function headingComponent(level) {
  const Tag = `h${level}`
  return function MarkdownHeading({ children }) {
    return <Tag id={headingId(plainText(children))}>{children}</Tag>
  }
}

const markdownComponents = {
  h1: headingComponent(1),
  h2: headingComponent(2),
  h3: headingComponent(3),
  h4: headingComponent(4)
}

function noteHref(courseId, lessonKey) {
  return `/desk/materials/${encodeURIComponent(courseId)}/${encodeURIComponent(lessonKey)}`
}

export function CourseNoteReader({ jobId, lessonKey }) {
  const router = useRouter()
  const [note, setNote] = useState(null)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

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

  const headings = useMemo(() => extractHeadings(note?.lesson?.markdown || ''), [note?.lesson?.markdown])

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

  if (state === 'loading') {
    return <section className='course-note-reader-state'><p>正在铺开笔记…</p></section>
  }

  if (state === 'error' || !note) {
    return <section className='course-note-reader-state'>
      <strong>这份笔记暂时打不开</strong>
      <p>{message || '没有找到可阅读的最终笔记。'}</p>
      <Link className='soft-button' href='/desk/materials'>回到笔记库</Link>
    </section>
  }

  const { course, lesson, navigation } = note

  return <section className='course-note-reader'>
    <header className='course-note-reader-head'>
      <div className='course-note-breadcrumbs'>
        <Link href='/desk/materials'>笔记库</Link>
        <span>›</span>
        <span>遇事不决</span>
        <span>›</span>
        <span>{course.name}</span>
      </div>
      <details className='course-note-reader-manage'>
        <summary>管理</summary>
        <div>
          <Link href={`/desk/courses?job=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(lesson.key)}`}>编辑原笔记</Link>
          <Link href={`/desk/publish?job=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(lesson.key)}`}>转入发布</Link>
          <button className='danger' type='button' disabled={busy} onClick={() => void moveToTrash()}>{busy ? '处理中…' : '移入回收站'}</button>
        </div>
      </details>
    </header>

    {message ? <p className='status-line error'>{message}</p> : null}

    <div className='course-note-reader-grid'>
      <aside className='course-note-course-index' aria-label='课程目录'>
        <span>课程</span>
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
      </aside>

      <main className='course-note-article'>
        <header>
          <span>第 {lesson.order || '·'} 课</span>
          <h1>{lesson.title}</h1>
          <p>{Number(lesson.charCount || 0).toLocaleString('zh-CN')} 字 · {formatDate(lesson.updatedAt)}{lesson.versionCount ? ` · ${lesson.versionCount} 个版本` : ''}</p>
        </header>
        <article className='course-note-markdown'>
          <ReactMarkdown components={markdownComponents}>{lesson.markdown}</ReactMarkdown>
        </article>
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

      <aside className='course-note-toc' aria-label='本文目录'>
        <span>本文目录</span>
        {headings.length ? <nav>{headings.map((heading, index) => <a
          className={`level-${heading.level}`}
          href={`#${heading.id}`}
          key={`${heading.line}:${index}`}
        >{heading.title}</a>)}</nav> : <p>这份笔记没有标题层级。</p>}
      </aside>
    </div>
  </section>
}
