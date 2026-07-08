import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'

import {
  extractMarkdownHeadings,
  MarkdownDocument,
  stripLeadingDuplicateTitle
} from '@/components/content/MarkdownDocument'
import { ReadingNavigator } from '@/components/content/ReadingNavigator'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import {
  mergeContentPaths
} from '@/lib/contentHierarchy'
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

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

function formatDate(date) {
  if (!date) return '未标注日期'
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return '未标注日期'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value)
}

function PasswordGate({ content, onUnlock }) {
  const [password, setPassword] = useState('')
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
      onUnlock(data.bodyMarkdown || '')
      setStatus('unlocked')
      return
    }

    setStatus(response.status === 410 ? 'expired' : 'error')
  }

  return <section className='content-access-gate' aria-label='密码访问'>
    <span>密码访问</span>
    <h2>输入密码后继续阅读</h2>
    <p>这篇内容未公开展示正文。验证通过后，正文会在当前页面展开。</p>
    <form onSubmit={event => void unlock(event)}>
      <input
        aria-label='访问密码'
        autoComplete='current-password'
        onChange={event => setPassword(event.target.value)}
        placeholder='输入访问密码'
        type='password'
        value={password}
      />
      <button disabled={status === 'loading'} type='submit'>{status === 'loading' ? '验证中…' : '打开'}</button>
    </form>
    {status === 'error' ? <small>密码不正确，或者这条分享不可访问。</small> : null}
    {status === 'expired' ? <small>分享已经过期。</small> : null}
  </section>
}

const ContentDetailPage = ({ content }) => {
  const articleRef = useRef(null)
  const [unlockedBody, setUnlockedBody] = useState('')
  const [tocOpen, setTocOpen] = useState(true)
  const body = content.locked ? unlockedBody : content.bodyMarkdown
  const readableBody = useMemo(() => stripLeadingDuplicateTitle(body || '', content.title), [body, content.title])
  const headings = useMemo(() => extractMarkdownHeadings(readableBody), [readableBody])
  const folderPath = content.folder?.path || []
  const tags = content.display?.tags || content.tags || []
  const category = folderPath[0] || content.display?.category || content.category || '未归档'
  const subPath = folderPath.slice(1).filter(Boolean)
  const typeLabel = typeLabels[content.type] || content.type || '内容'
  const dateLabel = formatDate(content.date || content.updatedAt)
  const accessLabel = content.access?.mode === 'password' ? '密码访问' : '公开阅读'

  return <>
    <Head>
      <title>{`${content.title} · law-tech.dev`}</title>
      <meta name='description' content={content.summary || content.title} />
      {content.access?.allowIndexing === false ? <meta name='robots' content='noindex,nofollow' /> : null}
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page content-reading-page content-reading-v2'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell content-reading-shell'>
        <PublicHeader active='content' />

        <article className={`content-reading-frame ${tocOpen ? 'toc-open' : 'toc-closed'}`}>
          <header className='content-reading-hero'>
            <nav className='content-reading-breadcrumbs' aria-label='内容位置'>
              <Link href='/content'>内容库</Link>
              <span>/</span>
              <Link href={`/category/${encodeURIComponent(category)}`}>{category}</Link>
              {subPath.map(part => <span key={part}>/ {part}</span>)}
            </nav>

            <div className='content-reading-title-row'>
              <div>
                <div className='content-reading-kicker'>
                  <span>{typeLabel}</span>
                  <span>{accessLabel}</span>
                  <time>{dateLabel}</time>
                </div>
                <h1>{content.title}</h1>
              </div>
              <button className='content-reading-toc-button' type='button' aria-pressed={tocOpen} onClick={() => setTocOpen(open => !open)}>
                {tocOpen ? '收起目录' : '打开目录'}
              </button>
            </div>

            {content.summary ? <p>{content.summary}</p> : null}

            <div className='content-reading-meta-row'>
              <Link href='/archive'>时间归档</Link>
              <Link href='/search'>搜索内容</Link>
              {tags.slice(0, 8).map(tag => <Link href={`/tag/${encodeURIComponent(tag)}`} key={tag}>#{tag}</Link>)}
            </div>
          </header>

          <div className='content-reading-body'>
            <section className='content-reading-main' aria-label='正文'>
              {content.expired ? <section className='content-access-gate'>
                <span>分享已过期</span>
                <h2>这条内容的临时访问已经失效</h2>
                <p>可以返回内容库继续浏览公开内容。</p>
              </section> : content.locked && !unlockedBody ? <PasswordGate content={content} onUnlock={setUnlockedBody} /> : <MarkdownDocument
                articleRef={articleRef}
                className='content-public-markdown'
                markdown={readableBody}
                title={content.title}
              />}
            </section>

            {tocOpen ? <aside className='content-reading-side' aria-label='本文目录'>
              <div className='content-reading-side-head'>
                <span>阅读导航</span>
                <button type='button' onClick={() => setTocOpen(false)} aria-label='收起目录'>×</button>
              </div>
              <ReadingNavigator articleRef={articleRef} className='content-reading-nav' headings={headings} title='本文目录' />
              <nav className='content-reading-side-links' aria-label='阅读动作'>
                <Link href='/content'>回到内容库</Link>
                <Link href='/archive'>时间归档</Link>
              </nav>
            </aside> : <button className='content-reading-edge-toggle' type='button' onClick={() => setTocOpen(true)}>目录</button>}
          </div>
        </article>

        <footer className='content-reading-foot'>
          <DynamicSignature compact />
        </footer>
      </div>
    </main>

    <style jsx>{`
      .content-reading-page { min-height: 100vh; }
      .content-reading-shell { width: min(1120px, calc(100% - 36px)); }
      .content-reading-frame {
        margin-top: 28px;
        border: 1px solid rgba(255,255,255,.72);
        border-radius: 30px;
        overflow: hidden;
        background: rgba(255,255,255,.56);
        box-shadow: 0 22px 70px rgba(24,63,50,.07), inset 0 1px 0 rgba(255,255,255,.84);
        backdrop-filter: blur(14px) saturate(1.04);
      }
      .content-reading-hero {
        display: grid;
        gap: 18px;
        border-bottom: 1px solid rgba(23,35,29,.08);
        padding: clamp(26px, 5vw, 52px) clamp(24px, 5vw, 58px) 28px;
        background:
          radial-gradient(circle at 94% -18%, rgba(141,170,183,.2), transparent 32%),
          rgba(255,255,255,.36);
      }
      .content-reading-breadcrumbs,
      .content-reading-kicker,
      .content-reading-meta-row,
      .content-reading-side-links {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .content-reading-breadcrumbs,
      .content-reading-breadcrumbs a,
      .content-reading-breadcrumbs span {
        color: var(--quiet);
        font-size: 10px;
      }
      .content-reading-title-row {
        display: grid;
        grid-template-columns: minmax(0,1fr) auto;
        gap: 18px;
        align-items: start;
      }
      .content-reading-kicker {
        color: var(--blue);
        font-size: 10px;
      }
      .content-reading-kicker span + span::before,
      .content-reading-kicker time::before {
        content: '·';
        margin-right: 8px;
        color: var(--quiet);
      }
      .content-reading-hero h1 {
        margin: 12px 0 0;
        max-width: 820px;
        font-family: var(--display-serif);
        font-size: clamp(36px, 5.6vw, 64px);
        font-weight: 600;
        line-height: 1.12;
        letter-spacing: -.055em;
      }
      .content-reading-hero > p {
        max-width: 760px;
        margin: 0;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.85;
      }
      .content-reading-toc-button,
      .content-reading-side-head button,
      .content-reading-edge-toggle {
        border: 1px solid rgba(23,35,29,.08);
        color: var(--muted);
        background: rgba(255,255,255,.62);
        cursor: pointer;
      }
      .content-reading-toc-button {
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 11px;
      }
      .content-reading-meta-row a {
        border: 1px solid rgba(17,63,49,.07);
        border-radius: 999px;
        padding: 5px 9px;
        color: var(--muted);
        background: rgba(255,255,255,.46);
        font-size: 10px;
      }
      .content-reading-body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(210px, 270px);
        gap: 22px;
        align-items: start;
        padding: clamp(22px, 4vw, 42px);
      }
      .toc-closed .content-reading-body { grid-template-columns: minmax(0, 1fr) auto; }
      .content-reading-main {
        min-width: 0;
        border: 1px solid rgba(23,35,29,.06);
        border-radius: 24px;
        padding: clamp(22px, 4.8vw, 54px);
        background: rgba(255,255,255,.78);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
      }
      .content-reading-side {
        position: sticky;
        top: 98px;
        display: grid;
        gap: 13px;
        max-height: calc(100dvh - 122px);
        overflow: auto;
        border: 1px solid rgba(23,35,29,.07);
        border-radius: 20px;
        padding: 13px;
        background: rgba(255,255,255,.54);
        box-shadow: 0 14px 42px rgba(24,63,50,.05), inset 0 1px 0 rgba(255,255,255,.72);
      }
      .content-reading-side-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .content-reading-side-head span {
        color: var(--quiet);
        font-size: 9px;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      .content-reading-side-head button {
        width: 25px;
        height: 25px;
        border-radius: 50%;
      }
      .content-reading-side-links {
        border-top: 1px solid rgba(23,35,29,.07);
        padding-top: 11px;
      }
      .content-reading-side-links a {
        color: var(--leaf);
        font-size: 10px;
      }
      .content-reading-edge-toggle {
        position: sticky;
        top: 120px;
        width: 31px;
        min-height: 78px;
        border-radius: 14px;
        writing-mode: vertical-rl;
        letter-spacing: .12em;
        font-size: 10px;
      }
      .content-reading-foot {
        display: flex;
        justify-content: flex-end;
        margin: 28px 0 0;
        padding: 0 8px;
        color: rgba(25,59,49,.68);
      }
      .content-reading-foot :global(svg) { width: min(220px, 36vw); }

      :global(.content-public-markdown) {
        color: #26302c;
        font-family: var(--display-serif);
        font-size: 17px;
        line-height: 2.06;
      }
      :global(.content-public-markdown h1),
      :global(.content-public-markdown h2),
      :global(.content-public-markdown h3),
      :global(.content-public-markdown h4) {
        scroll-margin-top: 110px;
        font-family: var(--display-serif);
        font-weight: 600;
        line-height: 1.4;
        letter-spacing: -.02em;
      }
      :global(.content-public-markdown h1) { margin: 0 0 1em; font-size: 32px; }
      :global(.content-public-markdown h2) { margin: 2.15em 0 .75em; font-size: 26px; }
      :global(.content-public-markdown h3) { margin: 1.75em 0 .65em; font-size: 21px; }
      :global(.content-public-markdown h4) { margin: 1.45em 0 .55em; font-size: 18px; }
      :global(.content-public-markdown p),
      :global(.content-public-markdown ul),
      :global(.content-public-markdown ol),
      :global(.content-public-markdown blockquote) { margin: 1em 0; }
      :global(.content-public-markdown ul),
      :global(.content-public-markdown ol) { padding-left: 1.4em; }
      :global(.content-public-markdown blockquote) {
        border-left: 3px solid rgba(49,90,140,.24);
        padding: 2px 0 2px 17px;
        color: var(--muted);
      }
      :global(.content-public-markdown pre) {
        overflow: auto;
        border-radius: 15px;
        padding: 15px;
        color: #f4f7f5;
        background: #1f2925;
      }
      :global(.content-public-markdown code:not(pre code)) {
        border-radius: 5px;
        padding: 2px 5px;
        background: rgba(49,90,140,.07);
      }
      :global(.content-public-markdown a) {
        color: #315a8c;
        text-decoration: underline;
        text-decoration-color: rgba(49,90,140,.25);
        text-underline-offset: 3px;
      }
      :global(.content-public-markdown table) {
        display: block;
        max-width: 100%;
        overflow: auto;
        border-collapse: collapse;
      }
      :global(.content-public-markdown th),
      :global(.content-public-markdown td) {
        border: 1px solid rgba(23,35,29,.1);
        padding: 8px 10px;
        text-align: left;
      }

      :global(.content-reading-nav) { display: grid; gap: 10px; }
      :global(.content-reading-nav .reading-progress-head) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: var(--quiet);
        font-size: 9px;
      }
      :global(.content-reading-nav .reading-progress-head strong) { color: var(--leaf); }
      :global(.content-reading-nav .reading-progress-track) {
        overflow: hidden;
        height: 4px;
        border-radius: 999px;
        background: rgba(17,63,49,.08);
      }
      :global(.content-reading-nav .reading-progress-track i) {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--leaf);
        transform-origin: left center;
      }
      :global(.content-reading-nav nav) {
        display: grid;
        gap: 4px;
        max-height: min(48vh, 440px);
        overflow: auto;
      }
      :global(.content-reading-nav nav a) {
        border-radius: 10px;
        padding: 7px 8px;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.45;
      }
      :global(.content-reading-nav nav a.level-3) { padding-left: 16px; }
      :global(.content-reading-nav nav a.level-4) { padding-left: 24px; }
      :global(.content-reading-nav nav a:hover),
      :global(.content-reading-nav nav a.active) {
        color: var(--leaf);
        background: rgba(220,233,223,.58);
      }
      :global(.content-reading-nav p) {
        margin: 0;
        color: var(--quiet);
        font-size: 11px;
        line-height: 1.6;
      }

      .content-access-gate {
        display: grid;
        gap: 12px;
        border: 1px solid rgba(23,35,29,.08);
        border-radius: 20px;
        padding: 24px;
        background: rgba(247,249,248,.68);
      }
      .content-access-gate > span {
        color: var(--honey);
        font-size: 10px;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      .content-access-gate h2 {
        margin: 0;
        font-family: var(--display-serif);
        font-size: 24px;
      }
      .content-access-gate p { margin: 0; color: var(--muted); line-height: 1.8; }
      .content-access-gate form {
        display: flex;
        gap: 8px;
        margin-top: 4px;
      }
      .content-access-gate input {
        flex: 1;
        min-width: 0;
        border: 1px solid rgba(23,35,29,.1);
        border-radius: 999px;
        padding: 11px 13px;
        background: #fff;
      }
      .content-access-gate button {
        border: 0;
        border-radius: 999px;
        padding: 0 16px;
        color: #fff;
        background: var(--leaf);
        cursor: pointer;
      }
      .content-access-gate small { color: #9a643b; }

      @media (max-width: 980px) {
        .content-reading-shell { width: min(100% - 28px, 860px); }
        .content-reading-body,
        .toc-closed .content-reading-body { grid-template-columns: 1fr; }
        .content-reading-side {
          position: static;
          max-height: none;
        }
        .content-reading-edge-toggle {
          position: static;
          width: fit-content;
          min-height: 0;
          padding: 8px 12px;
          writing-mode: horizontal-tb;
        }
      }
      @media (max-width: 640px) {
        .content-reading-shell { width: min(100% - 18px, 640px); }
        .content-reading-frame { margin-top: 18px; border-radius: 22px; }
        .content-reading-hero { padding: 24px 18px; }
        .content-reading-title-row { grid-template-columns: 1fr; }
        .content-reading-hero h1 { font-size: clamp(32px, 10vw, 46px); }
        .content-reading-body { padding: 14px; }
        .content-reading-main { padding: 20px 16px; border-radius: 18px; }
        :global(.content-public-markdown) { font-size: 16px; line-height: 1.96; }
        .content-access-gate form { flex-direction: column; }
        .content-access-gate button { min-height: 42px; }
      }
    `}</style>
    <LawTechDeskStyles />
  </>
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
      if (content.access?.mode === 'private') return { notFound: true }
      return { props: { content }, revalidate: 3600 }
    }
  } catch (error) {
    console.warn('[content detail] database read failed, fallback to live JSON', error)
  }

  const snapshot = getLiveContentBySlug(params.slug)
  if (!snapshot) return { notFound: true }

  return {
    props: { content: toPublicContentProps(snapshot, { includeBody: true }) },
    revalidate: 3600
  }
}

export default ContentDetailPage
