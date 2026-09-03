import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  extractMarkdownHeadings,
  MarkdownDocument,
  stripLeadingDuplicateTitle
} from '@/components/content/MarkdownDocument'
import { ReadingNavigator } from '@/components/content/ReadingNavigator'
import {
  formatCourseApiError,
  requestCourseJson
} from '@/lib/course/clientApi'

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

export function CourseBriefReader({ jobId, lessonKey }) {
  const articleRef = useRef(null)
  const [brief, setBrief] = useState(null)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!jobId || !lessonKey) return
    setState('loading')
    setMessage('')
    requestCourseJson(
      `/api/courses/briefs/read?jobId=${encodeURIComponent(jobId)}&lessonKey=${encodeURIComponent(lessonKey)}`,
      {},
      '课程简报读取失败'
    ).then(data => {
      setBrief(data.brief || null)
      setState(data.hasBrief ? 'ready' : 'empty')
      if (data.migrationMissing) {
        setMessage('可以正常阅读，但已读状态暂时无法保存，请稍后重试。')
      }
    }).catch(error => {
      setMessage(formatCourseApiError(error, '课程简报读取失败'))
      setState('error')
    })
  }, [jobId, lessonKey])

  const markdown = useMemo(
    () => stripLeadingDuplicateTitle(
      brief?.markdown || '',
      brief?.lessonTitle || ''
    ),
    [brief?.markdown, brief?.lessonTitle]
  )
  const headings = useMemo(
    () => extractMarkdownHeadings(markdown),
    [markdown]
  )

  async function toggleRead() {
    if (!brief || busy) return
    setBusy(true)
    setMessage('')
    try {
      const data = await requestCourseJson(
        '/api/courses/briefs/read',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            jobId,
            lessonKey,
            read: !brief.read
          })
        },
        '已读状态保存失败'
      )
      setBrief(data.brief || brief)
      setMessage(data.brief?.read ? '已标记为读过。' : '已恢复为未读。')
    } catch (error) {
      setMessage(formatCourseApiError(error, '已读状态保存失败'))
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') {
    return <section className='course-note-reader-state'>
      <p>正在打开课程简报…</p>
    </section>
  }

  if (state === 'error' || state === 'empty' || !brief) {
    return <section className='course-note-reader-state'>
      <strong>{state === 'empty' ? '这节课还没有课程简报' : '课程简报暂时打不开'}</strong>
      <p>{message || '课程简报生成后会出现在这里。'}</p>
      <Link className='soft-button' href='/desk/materials'>回到笔记库</Link>
    </section>
  }

  return <section className='course-note-reader course-brief-reader'>
    <header className='course-note-reader-head'>
      <div className='course-note-breadcrumbs'>
        <Link href='/desk/materials'>笔记库</Link>
        <span>›</span>
        <span>{brief.courseName}</span>
        <span>›</span>
        <span>课程简报</span>
      </div>
      <div className='course-note-reader-tools'>
        <button
          type='button'
          aria-pressed={brief.read}
          disabled={busy}
          onClick={() => void toggleRead()}
        >
          {busy ? '保存中…' : brief.read ? '已读 · 恢复未读' : '标记为读过'}
        </button>
        {brief.noteUrl
          ? <Link className='course-note-full-link' href={brief.noteUrl}>打开完整笔记</Link>
          : null}
      </div>
    </header>

    {message ? <p className={`status-line ${/失败|迁移/.test(message) ? 'error' : ''}`}>{message}</p> : null}

    <div className='course-note-reader-grid'>
      <main className='course-note-article'>
        <header>
          <span>课程简报</span>
          <h1>{brief.lessonTitle}</h1>
          <p>{brief.courseName}{brief.teacher ? ` · ${brief.teacher}` : ''} · {formatDate(brief.updatedAt)}</p>
        </header>
        {brief.mainLine ? <blockquote>{brief.mainLine}</blockquote> : null}
        <MarkdownDocument
          articleRef={articleRef}
          className='course-note-markdown'
          markdown={markdown}
          title={brief.lessonTitle}
        />
      </main>

      <aside className='course-note-toc' aria-label='本文目录'>
        <div className='course-note-side-head'>
          <span>阅读导航</span>
        </div>
        <ReadingNavigator articleRef={articleRef} headings={headings} />
      </aside>
    </div>

    <style jsx global>{`
      .course-brief-reader .course-note-reader-tools > a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(17, 63, 49, .09);
        border-radius: 999px;
        padding: 6px 10px;
        color: var(--leaf);
        background: rgba(255, 255, 255, .72);
        font-size: 10px;
        line-height: 1.35;
        white-space: nowrap;
      }

      .course-brief-reader .course-note-markdown,
      .course-brief-reader .course-note-markdown p,
      .course-brief-reader .course-note-markdown li,
      .course-brief-reader .course-note-markdown h1,
      .course-brief-reader .course-note-markdown h2,
      .course-brief-reader .course-note-markdown h3,
      .course-brief-reader .course-note-markdown h4 {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .course-brief-reader .course-note-markdown img,
      .course-brief-reader .course-note-markdown video,
      .course-brief-reader .course-note-markdown iframe {
        max-width: 100%;
        height: auto;
      }

      @media (max-width: 760px) {
        .course-brief-reader {
          width: 100%;
          min-width: 0;
        }

        .course-brief-reader .course-note-reader-head {
          gap: 10px;
          padding: 10px;
        }

        .course-brief-reader .course-note-breadcrumbs {
          width: 100%;
          flex-wrap: wrap;
          white-space: normal;
          line-height: 1.5;
        }

        .course-brief-reader .course-note-reader-tools {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 8px;
          width: 100%;
        }

        .course-brief-reader .course-note-reader-tools > button,
        .course-brief-reader .course-note-reader-tools > a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-width: 0;
          min-height: 40px;
          padding: 9px 10px;
          text-align: center;
          line-height: 1.3;
          white-space: normal;
        }

        .course-brief-reader .course-note-reader-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .course-brief-reader .course-note-article {
          order: 1;
          width: 100%;
          min-width: 0;
          overflow: hidden;
          padding: 22px 18px;
        }

        .course-brief-reader .course-note-toc {
          position: static;
          inset: auto;
          order: 2;
          width: 100%;
          max-height: none;
          overflow: visible;
          padding: 14px;
          box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.7);
        }

        .course-brief-reader .reading-navigator nav {
          max-height: none;
          overflow: visible;
        }

        .course-brief-reader .course-note-article > header h1 {
          font-size: clamp(28px, 9vw, 38px);
          letter-spacing: -.03em;
        }

        .course-brief-reader .course-note-markdown,
        .course-brief-reader .markdown-document {
          font-size: 15px;
          line-height: 1.85;
        }

        .course-brief-reader .course-note-markdown h1,
        .course-brief-reader .markdown-document h1 {
          font-size: 26px;
        }

        .course-brief-reader .course-note-markdown h2,
        .course-brief-reader .markdown-document h2 {
          font-size: 22px;
        }

        .course-brief-reader .course-note-markdown h3,
        .course-brief-reader .markdown-document h3 {
          font-size: 19px;
        }
      }

      @media (max-width: 420px) {
        .course-brief-reader .course-note-reader-tools {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `}</style>
  </section>
}
