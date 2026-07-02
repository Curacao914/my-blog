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
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date))
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
    <p>这篇内容未公开展示正文。</p>
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

  return <>
    <Head>
      <title>{`${content.title} · law-tech.dev`}</title>
      <meta name='description' content={content.summary || content.title} />
      {content.access?.allowIndexing === false ? <meta name='robots' content='noindex,nofollow' /> : null}
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page content-reader-page'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell content-reader-shell'>
        <PublicHeader active='content' />

        <div className={`content-reader-layout ${tocOpen ? 'toc-open' : 'toc-closed'}`}>
          <aside className='content-reader-meta'>
            <Link className='content-reader-back' href='/content'>← 内容</Link>
            <div className='content-reader-meta-block'>
              <span>归档</span>
              <strong>{folderPath[0] || content.display?.category || content.category || '未归档'}</strong>
              {folderPath[1] ? <small>{folderPath[1]}</small> : null}
            </div>
            <div className='content-reader-meta-block'>
              <span>类型</span>
              <strong>{typeLabels[content.type] || content.type}</strong>
              <small>{formatDate(content.date || content.updatedAt)}</small>
            </div>
            {content.course ? <div className='content-reader-meta-block'>
              <span>课程</span>
              <strong>{content.course.name || '课程笔记'}</strong>
              {content.course.lesson ? <small>{content.course.lesson}</small> : null}
              {content.course.teacher ? <small>{content.course.teacher}</small> : null}
            </div> : null}
            {tags.length ? <div className='content-reader-tags'>{tags.map(tag => <span key={tag}>{tag}</span>)}</div> : null}
            <div className='content-reader-signature' aria-hidden='true'><DynamicSignature compact /></div>
          </aside>

          <article className='content-reader-article'>
            <header className='content-reader-head'>
              <div className='content-reader-kicker'>
                <span>{typeLabels[content.type] || content.type}</span>
                <span>{content.access?.mode === 'password' ? '密码访问' : '公开'}</span>
              </div>
              <h1>{content.title}</h1>
              {content.summary ? <p>{content.summary}</p> : null}
              <button className='content-reader-toc-toggle' type='button' aria-pressed={tocOpen} onClick={() => setTocOpen(open => !open)}>
                {tocOpen ? '收起目录' : '打开目录'}
              </button>
            </header>

            {content.expired ? <section className='content-access-gate'>
              <span>分享已过期</span>
              <h2>这条内容的临时访问已经失效</h2>
            </section> : content.locked && !unlockedBody ? <PasswordGate content={content} onUnlock={setUnlockedBody} /> : <MarkdownDocument
              articleRef={articleRef}
              className='content-public-markdown'
              markdown={readableBody}
              title={content.title}
            />}
          </article>

          {tocOpen ? <aside className='content-reader-toc' aria-label='本文目录'>
            <div className='content-reader-toc-head'>
              <span>阅读导航</span>
              <button type='button' onClick={() => setTocOpen(false)} aria-label='收起目录'>×</button>
            </div>
            <ReadingNavigator articleRef={articleRef} headings={headings} title='本文目录' />
          </aside> : <button className='content-reader-edge-toggle' type='button' onClick={() => setTocOpen(true)}>目录</button>}
        </div>
      </div>
    </main>

    <style jsx>{`
      .content-reader-page { min-height: 100vh; }
      .content-reader-shell { width: min(1320px,calc(100% - 36px)); }
      .content-reader-layout {
        position: relative;
        display: grid;
        grid-template-columns: minmax(170px,.48fr) minmax(0,1.65fr) minmax(170px,.48fr);
        gap: 16px;
        align-items: start;
        padding: 38px 0 90px;
      }
      .content-reader-layout.toc-closed { grid-template-columns: minmax(170px,.48fr) minmax(0,1.65fr) 0; }
      .content-reader-meta,
      .content-reader-toc {
        position: sticky;
        top: 18px;
        max-height: calc(100dvh - 36px);
        overflow: auto;
        border: 1px solid rgba(23,35,29,.08);
        border-radius: 22px;
        padding: 15px;
        background: rgba(255,255,255,.56);
        box-shadow: 0 18px 54px rgba(24,63,50,.055), inset 0 1px 0 rgba(255,255,255,.72);
        backdrop-filter: blur(18px);
      }
      .content-reader-back { display: inline-flex; color: var(--blue); font-size: 11px; }
      .content-reader-meta-block { display: grid; gap: 4px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(23,35,29,.07); }
      .content-reader-meta-block > span,
      .content-reader-toc-head > span { color: var(--quiet); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
      .content-reader-meta-block strong { font-family: var(--display-serif); font-size: 15px; font-weight: 600; }
      .content-reader-meta-block small { color: var(--quiet); font-size: 10px; line-height: 1.45; }
      .content-reader-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 16px; }
      .content-reader-tags span { border-radius: 999px; padding: 3px 6px; color: #41617a; background: rgba(226,237,241,.62); font-size: 9px; }
      .content-reader-signature { margin-top: 22px; padding-top: 14px; border-top: 1px solid rgba(23,35,29,.07); color: rgba(25,59,49,.72); }

      .content-reader-article {
        min-width: 0;
        border: 1px solid rgba(23,35,29,.075);
        border-radius: 28px;
        padding: clamp(28px,5vw,64px);
        background: rgba(255,255,255,.68);
        box-shadow: 0 24px 76px rgba(24,63,50,.065), inset 0 1px 0 rgba(255,255,255,.82);
      }
      .content-reader-head { position: relative; padding-bottom: 30px; border-bottom: 1px solid rgba(23,35,29,.08); }
      .content-reader-kicker { display: flex; flex-wrap: wrap; gap: 9px; color: var(--blue); font-size: 10px; }
      .content-reader-kicker span + span::before { content: '·'; margin-right: 9px; color: var(--quiet); }
      .content-reader-head h1 { margin: 13px 0 0; font-family: var(--display-serif); font-size: clamp(34px,5vw,58px); font-weight: 600; line-height: 1.15; letter-spacing: -.05em; }
      .content-reader-head p { margin: 17px 0 0; max-width: 720px; color: var(--muted); font-size: 15px; line-height: 1.8; }
      .content-reader-toc-toggle { position: absolute; right: 0; top: 0; border: 1px solid rgba(23,35,29,.08); border-radius: 999px; padding: 6px 10px; color: var(--quiet); background: rgba(255,255,255,.62); font-size: 10px; cursor: pointer; }
      :global(.content-public-markdown) { padding-top: 26px; color: #26302c; font-size: 16px; line-height: 2; }
      :global(.content-public-markdown h1),
      :global(.content-public-markdown h2),
      :global(.content-public-markdown h3),
      :global(.content-public-markdown h4) { scroll-margin-top: 36px; font-family: var(--display-serif); font-weight: 600; line-height: 1.4; letter-spacing: -.02em; }
      :global(.content-public-markdown h1) { margin: 0 0 1em; font-size: 32px; }
      :global(.content-public-markdown h2) { margin: 2.2em 0 .8em; font-size: 26px; }
      :global(.content-public-markdown h3) { margin: 1.85em 0 .7em; font-size: 21px; }
      :global(.content-public-markdown h4) { margin: 1.55em 0 .6em; font-size: 18px; }
      :global(.content-public-markdown p),
      :global(.content-public-markdown ul),
      :global(.content-public-markdown ol),
      :global(.content-public-markdown blockquote) { margin: 1em 0; }
      :global(.content-public-markdown ul),
      :global(.content-public-markdown ol) { padding-left: 1.4em; }
      :global(.content-public-markdown blockquote) { border-left: 3px solid rgba(49,90,140,.26); padding: 2px 0 2px 17px; color: var(--muted); }
      :global(.content-public-markdown pre) { overflow: auto; border-radius: 15px; padding: 15px; color: #f4f7f5; background: #1f2925; }
      :global(.content-public-markdown code:not(pre code)) { border-radius: 5px; padding: 2px 5px; background: rgba(49,90,140,.07); }
      :global(.content-public-markdown a) { color: #315a8c; text-decoration: underline; text-decoration-color: rgba(49,90,140,.25); text-underline-offset: 3px; }
      :global(.content-public-markdown table) { display: block; max-width: 100%; overflow: auto; border-collapse: collapse; }
      :global(.content-public-markdown th),
      :global(.content-public-markdown td) { border: 1px solid rgba(23,35,29,.1); padding: 8px 10px; text-align: left; }

      .content-reader-toc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .content-reader-toc-head button { width: 24px; height: 24px; border: 0; border-radius: 50%; color: var(--quiet); background: rgba(220,233,223,.55); cursor: pointer; }
      .content-reader-edge-toggle { position: sticky; top: 92px; align-self: start; justify-self: end; width: 30px; min-height: 76px; border: 1px solid rgba(23,35,29,.08); border-radius: 13px 0 0 13px; color: var(--green); background: rgba(248,251,249,.9); writing-mode: vertical-rl; letter-spacing: .12em; font-size: 10px; cursor: pointer; }
      .content-access-gate { margin-top: 28px; border: 1px solid rgba(23,35,29,.08); border-radius: 20px; padding: 24px; background: rgba(247,249,248,.68); }
      .content-access-gate > span { color: var(--gold); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
      .content-access-gate h2 { margin: 10px 0 0; font-family: var(--display-serif); font-size: 24px; }
      .content-access-gate p { color: var(--muted); }
      .content-access-gate form { display: flex; gap: 8px; margin-top: 18px; }
      .content-access-gate input { flex: 1; min-width: 0; border: 1px solid rgba(23,35,29,.1); border-radius: 999px; padding: 11px 13px; background: #fff; }
      .content-access-gate button { border: 0; border-radius: 999px; padding: 0 16px; color: #fff; background: var(--green); cursor: pointer; }
      .content-access-gate small { display: block; margin-top: 10px; color: #9a643b; }

      @media (max-width: 1080px) {
        .content-reader-layout,
        .content-reader-layout.toc-closed { grid-template-columns: minmax(150px,.42fr) minmax(0,1.58fr); }
        .content-reader-toc { position: fixed; z-index: 44; top: 88px; right: 18px; width: min(290px,calc(100vw - 36px)); background: rgba(250,252,251,.98); box-shadow: 0 24px 70px rgba(17,45,36,.18); }
        .content-reader-edge-toggle { position: fixed; z-index: 32; right: 0; top: 130px; }
      }
      @media (max-width: 760px) {
        .content-reader-layout,
        .content-reader-layout.toc-closed { grid-template-columns: 1fr; padding-top: 20px; }
        .content-reader-meta { position: static; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; max-height: none; }
        .content-reader-back,
        .content-reader-signature { grid-column: 1 / -1; }
        .content-reader-meta-block { margin: 0; }
        .content-reader-signature { max-width: 230px; }
        .content-reader-article { padding: 24px 18px; }
        .content-reader-head h1 { padding-right: 0; }
        .content-reader-toc-toggle { position: static; margin-top: 16px; }
        .content-reader-toc { top: 72px; bottom: 18px; max-height: none; }
        .content-access-gate form { flex-direction: column; }
        .content-access-gate button { height: 42px; }
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
