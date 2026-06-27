import {
  getLiveContentBySlug,
  getLiveContentPaths,
  toPublicContentProps
} from '@/lib/contentSnapshots'
import {
  getPublishedContentBySlug,
  listPublishedContentMetadata,
  toSnapshotLikeContent
} from '@/lib/contentRepository'
import { mergeContentPaths } from '@/lib/contentHierarchy'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

function formatDate(date) {
  if (!date) return '未标注日期'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date))
}

function PasswordGate({ content }) {
  const [password, setPassword] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('idle')

  async function unlock(event) {
    event.preventDefault()
    setStatus('loading')

    const response = await fetch('/api/content/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: content.slug, password })
    })

    if (response.ok) {
      const data = await response.json()
      setBody(data.bodyMarkdown)
      setStatus('unlocked')
      return
    }

    if (response.status === 410) {
      setStatus('expired')
      return
    }

    setStatus('error')
  }

  if (status === 'unlocked') {
    return (
      <article className='article-body'>
        <ReactMarkdown>{body}</ReactMarkdown>
      </article>
    )
  }

  return (
    <section className='gate' aria-label='密码访问'>
      <p className='gate-kicker'>需要密码</p>
      <h2>这篇内容被设置为密码访问。</h2>
      <p>输入密码后可以继续阅读。</p>
      <form onSubmit={event => void unlock(event)}>
        <input
          aria-label='访问密码'
          autoComplete='current-password'
          onChange={event => setPassword(event.target.value)}
          placeholder='输入访问密码'
          type='password'
          value={password}
        />
        <button disabled={status === 'loading'} type='submit'>
          {status === 'loading' ? '验证中…' : '打开'}
        </button>
      </form>
      {status === 'error' && <small>密码不对，或者这条分享不可访问。</small>}
      {status === 'expired' && <small>分享已过期。</small>}
    </section>
  )
}

const ContentDetailPage = ({ content }) => {
  return (
    <>
      <Head>
        <title>{`${content.title} · law-tech.dev`}</title>
        <meta name='description' content={content.summary || content.title} />
        {content.access?.allowIndexing === false && (
          <meta name='robots' content='noindex,nofollow' />
        )}
      </Head>

      <div className='detail-page'>
        <div className='wrap'>
          <nav className='top-nav' aria-label='主导航'>
            <Link className='brand' href='/'>
              law-tech.dev
            </Link>
            <div className='nav-links'>
              <Link href='/content'>内容</Link>
              <Link href='/#projects'>项目</Link>
              <Link href='/tools'>工具</Link>
              <Link href='/#about'>关于</Link>
              <Link className='desk-link' href='/desk'>
                工作台
              </Link>
            </div>
          </nav>

          <main className='main'>
            <Link className='back' href='/content'>
              ← 回到内容
            </Link>

            <header className='article-head'>
              <div className='meta'>
                <span>{typeLabels[content.type] || content.type}</span>
                <span>{content.display?.category || content.category}</span>
                <span>{formatDate(content.date || content.updatedAt)}</span>
              </div>
              <h1>{content.title}</h1>
              {content.summary && <p>{content.summary}</p>}
              <div className='chips'>
                {(content.display?.tags || content.tags || []).map(tag => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </header>

            {content.course && (
              <section className='course-panel' aria-label='课程信息'>
                {content.course.name && (
                  <div>
                    <small>课程</small>
                    <strong>{content.course.name}</strong>
                  </div>
                )}
                {content.course.lesson && (
                  <div>
                    <small>课次</small>
                    <strong>{content.course.lesson}</strong>
                  </div>
                )}
                {content.course.teacher && (
                  <div>
                    <small>教师</small>
                    <strong>{content.course.teacher}</strong>
                  </div>
                )}
                {content.course.date && (
                  <div>
                    <small>日期</small>
                    <strong>{formatDate(content.course.date)}</strong>
                  </div>
                )}
              </section>
            )}

            {content.expired ? (
              <section className='gate'>
                <p className='gate-kicker'>分享已过期</p>
                <h2>这条内容的临时访问已经失效。</h2>
                <p>可以之后再向我拿新的访问方式。</p>
              </section>
            ) : content.locked ? (
              <PasswordGate content={content} />
            ) : (
              <article className='article-body'>
                <ReactMarkdown>{content.bodyMarkdown}</ReactMarkdown>
              </article>
            )}
          </main>
        </div>
      </div>

      <style jsx>{`
        .detail-page {
          --bg: #f7f9f8;
          --ink: #1e2322;
          --muted: #66716b;
          --quiet: #87938c;
          --line: #dfe7e1;
          --green: #3f5f3a;
          --blue: #315a8c;
          --gold: #c99a3b;
          min-height: 100vh;
          color: var(--ink);
          background:
            radial-gradient(
              circle at 8% 12%,
              rgba(201, 154, 59, 0.08),
              transparent 18rem
            ),
            linear-gradient(180deg, #fcfefd 0%, var(--bg) 100%);
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .wrap {
          width: min(860px, calc(100% - 40px));
          margin: 0 auto;
        }

        .top-nav {
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
        }

        .brand {
          font-weight: 720;
          letter-spacing: -0.03em;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
          color: var(--muted);
        }

        .desk-link {
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          color: var(--blue);
        }

        .main {
          padding: 44px 0 92px;
        }

        .back {
          color: var(--quiet);
          font-size: 13px;
        }

        .article-head {
          margin-top: 34px;
          padding-bottom: 34px;
          border-bottom: 1px solid var(--line);
        }

        .meta,
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: var(--blue);
          font-size: 13px;
        }

        .meta span + span::before {
          content: '·';
          color: var(--quiet);
          margin-right: 12px;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          margin-top: 18px;
          font-size: clamp(32px, 5vw, 56px);
          line-height: 1.13;
          letter-spacing: -0.06em;
        }

        .article-head p {
          margin-top: 18px;
          max-width: 680px;
          color: #58645e;
          font-size: 16px;
          line-height: 1.8;
        }

        .chips {
          margin-top: 22px;
        }

        .chips span {
          border: 1px solid rgba(63, 95, 58, 0.18);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--green);
          background: rgba(63, 95, 58, 0.055);
          font-size: 12px;
        }

        .course-panel {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 26px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.72);
        }

        .course-panel small {
          display: block;
          color: var(--quiet);
          font-size: 12px;
          margin-bottom: 6px;
        }

        .course-panel strong {
          font-size: 14px;
        }

        .article-body,
        .gate {
          margin-top: 34px;
          padding: 30px;
          border: 1px solid var(--line);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 18px 52px rgba(37, 55, 48, 0.045);
        }

        .gate-kicker {
          color: var(--gold);
          font-size: 13px;
          letter-spacing: 0.1em;
        }

        .gate h2 {
          margin-top: 12px;
          font-size: 24px;
          letter-spacing: -0.04em;
        }

        .gate p {
          margin-top: 12px;
          color: #58645e;
          line-height: 1.75;
        }

        .gate form {
          display: flex;
          gap: 10px;
          margin-top: 22px;
        }

        .gate input {
          flex: 1;
          min-width: 0;
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 12px 14px;
          background: #fff;
          color: var(--ink);
        }

        .gate button {
          border: 0;
          border-radius: 999px;
          padding: 0 18px;
          background: var(--green);
          color: #fff;
          cursor: pointer;
        }

        .gate button:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .gate small {
          display: block;
          margin-top: 12px;
          color: #9a643b;
        }

        :global(.article-body h1),
        :global(.article-body h2),
        :global(.article-body h3) {
          margin: 1.5em 0 0.6em;
          letter-spacing: -0.035em;
          line-height: 1.35;
        }

        :global(.article-body h1:first-child),
        :global(.article-body h2:first-child),
        :global(.article-body h3:first-child) {
          margin-top: 0;
        }

        :global(.article-body p),
        :global(.article-body li) {
          color: #37413c;
          font-size: 16px;
          line-height: 1.9;
        }

        :global(.article-body p + p) {
          margin-top: 1em;
        }

        :global(.article-body ul),
        :global(.article-body ol) {
          padding-left: 1.35em;
        }

        :global(.article-body code) {
          border-radius: 6px;
          padding: 0.12em 0.36em;
          background: rgba(63, 95, 58, 0.08);
        }

        @media (max-width: 760px) {
          .top-nav {
            height: auto;
            padding: 24px 0;
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .nav-links {
            width: 100%;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
          }

          .course-panel {
            grid-template-columns: 1fr 1fr;
          }

          .gate form {
            flex-direction: column;
          }

          .gate button {
            height: 44px;
          }
        }
      `}</style>
    </>
  )
}

ContentDetailPage.layout = 'bare'

export async function getStaticPaths() {
  const livePaths = getLiveContentPaths()
  let databaseItems = []

  try {
    const rows = await listPublishedContentMetadata()
    databaseItems = rows
      .map(row => toSnapshotLikeContent(row))
      .filter(item => item.access?.mode !== 'private')
  } catch (error) {
    console.warn('[content detail] database paths failed; keeping live JSON paths', error)
  }

  return {
    paths: mergeContentPaths(livePaths, databaseItems),
    fallback: 'blocking'
  }
}

export async function getStaticProps({ params }) {
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug

  try {
    const row = await getPublishedContentBySlug(slug)
    if (row) {
      const content = toSnapshotLikeContent(row, { includeBody: true })
      if (content.access?.mode === 'private') {
        return { notFound: true }
      }

      return {
        props: {
          content
        },
        revalidate: 3600
      }
    }
  } catch (error) {
    console.warn('[content detail] database read failed, fallback to live JSON', error)
  }

  const snapshot = getLiveContentBySlug(params.slug)

  if (!snapshot) {
    return { notFound: true }
  }

  return {
    props: {
      content: toPublicContentProps(snapshot, { includeBody: true })
    },
    revalidate: 3600
  }
}

export default ContentDetailPage
