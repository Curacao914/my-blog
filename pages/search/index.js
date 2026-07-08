import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'

import { PublicContentCard } from '@/components/content/PublicContentCard'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  filterPublicContent,
  publicContentCategory,
  publicContentHref,
  publicContentTags
} from '@/lib/content/publicContent'

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

function mergeResults(remote = [], local = []) {
  const merged = new Map()
  ;[...remote, ...local].forEach(item => {
    const key = publicContentHref(item) || `${item.source}:${item.id || item.slug}`
    if (!merged.has(key)) merged.set(key, item)
  })
  return [...merged.values()]
}

export default function PublicSearchPage({ items = [] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [type, setType] = useState('全部')
  const [remote, setRemote] = useState([])
  const [searchState, setSearchState] = useState('idle')
  const [searchMeta, setSearchMeta] = useState({ available: false, total: 0, processingTimeMS: 0 })

  useEffect(() => {
    if (!router.isReady) return
    setQuery(String(router.query.q || router.query.s || ''))
  }, [router.isReady, router.query.q, router.query.s])

  useEffect(() => {
    const keyword = query.trim()
    if (keyword.length < 2) {
      setRemote([])
      setSearchState('idle')
      setSearchMeta({ available: false, total: 0, processingTimeMS: 0 })
      return undefined
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setRemote([])
      setSearchState('loading')
      try {
        const params = new URLSearchParams({ q: keyword, hitsPerPage: '36' })
        if (category !== '全部') params.set('category', category)
        if (type !== '全部') params.set('type', type)
        const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || '搜索失败')
        setRemote(data.available ? data.hits || [] : [])
        setSearchMeta({
          available: Boolean(data.available),
          total: Number(data.total || 0),
          processingTimeMS: Number(data.processingTimeMS || 0)
        })
        setSearchState(data.available ? 'fulltext' : 'local')
      } catch (error) {
        if (error?.name === 'AbortError') return
        setRemote([])
        setSearchState('local')
        setSearchMeta({ available: false, total: 0, processingTimeMS: 0 })
      }
    }, 260)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, category, type])

  const categories = useMemo(() => [...new Set(items.map(publicContentCategory))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [items])
  const types = useMemo(() => [...new Set(items.map(item => item.type).filter(Boolean))], [items])
  const tags = useMemo(() => [...new Set(items.flatMap(publicContentTags))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [items])
  const localResults = useMemo(() => filterPublicContent(items, { query, category, type }), [items, query, category, type])
  const results = useMemo(() => searchMeta.available ? mergeResults(remote, localResults) : localResults, [remote, localResults, searchMeta.available])

  function submit(event) {
    event.preventDefault()
    const nextQuery = query.trim() ? { q: query.trim() } : {}
    void router.replace({ pathname: '/search', query: nextQuery }, undefined, { shallow: true })
  }

  function clear() {
    setQuery('')
    setCategory('全部')
    setType('全部')
    setRemote([])
    void router.replace('/search', undefined, { shallow: true })
  }

  const searchLabel = searchState === 'loading'
    ? '正在检索正文'
    : searchMeta.available
      ? `全文搜索 · ${searchMeta.total} 条匹配`
      : query.trim()
        ? '标题与标签搜索'
        : '输入关键词开始搜索'

  return <>
    <Head>
      <title>搜索 · law-tech.dev</title>
      <meta name='description' content='搜索 law-tech.dev 的文章、课程笔记、读书记录与项目。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page public-search-page'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='search' />

        <section className='public-search-hero'>
          <div><span className='eyebrow'>Search</span><h1>搜索</h1></div>
          <form onSubmit={submit}>
            <input
              autoComplete='off'
              autoFocus
              onChange={event => setQuery(event.target.value)}
              placeholder='文章中的一句话、课程、栏目或标签'
              type='search'
              value={query}
            />
            <button type='submit'>搜索</button>
          </form>
          <small className={`public-search-mode is-${searchState}`}>{searchLabel}{searchMeta.processingTimeMS ? ` · ${searchMeta.processingTimeMS}ms` : ''}</small>
        </section>

        <section className='public-search-workspace'>
          <aside className='public-search-filters'>
            <details open>
              <summary>栏目 <small>{categories.length}</small></summary>
              <div>
                <button className={category === '全部' ? 'active' : ''} type='button' onClick={() => setCategory('全部')}>全部</button>
                {categories.map(item => <button className={category === item ? 'active' : ''} type='button' key={item} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
            </details>
            <details>
              <summary>类型 <small>{types.length}</small></summary>
              <div>
                <button className={type === '全部' ? 'active' : ''} type='button' onClick={() => setType('全部')}>全部</button>
                {types.map(item => <button className={type === item ? 'active' : ''} type='button' key={item} onClick={() => setType(item)}>{typeLabels[item] || item}</button>)}
              </div>
            </details>
            <details>
              <summary>常用标签 <small>{tags.length}</small></summary>
              <div className='tag-cloud'>
                {tags.slice(0, 30).map(tag => <button type='button' key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}
              </div>
            </details>
            <div className='public-search-signature' aria-hidden='true'><DynamicSignature compact /></div>
          </aside>

          <section className='public-search-results' aria-live='polite'>
            <header>
              <div><span>结果</span><h2>{results.length} 条内容</h2></div>
              {(query || category !== '全部' || type !== '全部') ? <button type='button' onClick={clear}>清除筛选</button> : null}
            </header>
            {results.length ? <div className='public-search-grid'>
              {results.map(item => <PublicContentCard compact item={item} key={item.id || `${item.source}:${item.slug}`} />)}
            </div> : <div className='public-search-empty'>
              <h3>没有找到匹配内容</h3>
              <p>可以换一个更短的关键词，或者清除栏目与类型筛选。</p>
              <button type='button' onClick={clear}>查看全部内容</button>
            </div>}
          </section>
        </section>
      </div>

      <style jsx>{`
        /* public-search-surface-v1: lighter search workspace */
        .public-search-hero { display:grid; grid-template-columns:minmax(0,1fr); align-items:end; gap:10px; padding:28px 0 18px; }
        .public-search-hero h1 { margin:6px 0 0; font-family:var(--display-serif); font-size:clamp(36px,4.8vw,52px); font-weight:600; letter-spacing:-.05em; }
        .public-search-hero form { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; border:1px solid rgba(255,255,255,.72); border-radius:16px; padding:6px; background:rgba(255,255,255,.52); box-shadow:0 10px 28px rgba(24,63,50,.05),inset 0 1px 0 rgba(255,255,255,.86); backdrop-filter:blur(14px); }
        .public-search-hero input { min-width:0; border:0; padding:10px 13px; color:var(--ink); background:transparent; font-size:14px; outline:none; }
        .public-search-hero form button { border:0; border-radius:12px; padding:0 18px; color:#fffaf0; background:var(--leaf); font-weight:650; cursor:pointer; }
        .public-search-mode { grid-column:1; display:block; min-height:16px; margin:0 4px; color:var(--quiet); font-size:9px; }
        .public-search-mode.is-fulltext { color:var(--green); }
        .public-search-workspace { display: grid; grid-template-columns: 210px minmax(0,1fr); gap: 18px; align-items: start; padding-bottom: 82px; }
        .public-search-filters,
        .public-search-results { border: 1px solid rgba(255,255,255,.66); border-radius: 20px; background: rgba(255,255,255,.5); box-shadow: 0 16px 44px rgba(24,63,50,.045), inset 0 1px 0 rgba(255,255,255,.82); backdrop-filter: blur(14px); }
        .public-search-filters { position: sticky; top: 88px; max-height: calc(100dvh - 104px); overflow: auto; padding: 13px; }
        .public-search-filters details { padding: 10px 0; border-bottom: 1px solid rgba(23,35,29,.06); }
        .public-search-filters summary { display: flex; justify-content: space-between; color: var(--quiet); font-size: 10px; cursor: pointer; list-style: none; }
        .public-search-filters summary::-webkit-details-marker { display: none; }
        .public-search-filters details > div { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
        .public-search-filters button { border: 1px solid rgba(49,90,140,.1); border-radius: 999px; padding: 4px 7px; color: var(--quiet); background: rgba(255,255,255,.38); font-size: 10px; cursor: pointer; }
        .public-search-filters button.active { color: #315a8c; border-color: rgba(49,90,140,.25); background: rgba(226,237,241,.75); }
        .public-search-signature { margin-top: 18px; color: rgba(25,59,49,.72); }
        .public-search-results { min-width: 0; padding: 15px; }
        .public-search-results > header { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 3px 3px 17px; border-bottom: 1px solid rgba(23,35,29,.07); }
        .public-search-results header span { color: var(--quiet); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
        .public-search-results h2 { margin: 4px 0 0; font-family: var(--display-serif); font-size: 25px; font-weight: 600; }
        .public-search-results header button,
        .public-search-empty button { border: 0; border-radius: 999px; padding: 8px 11px; color: var(--green); background: rgba(220,233,223,.65); cursor: pointer; }
        .public-search-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 10px; padding-top: 15px; }
        .public-search-empty { padding: 48px 18px; text-align: center; }
        .public-search-empty h3 { margin: 0; font-family: var(--display-serif); font-size: 25px; }
        .public-search-empty p { margin: 9px auto 18px; max-width: 420px; color: var(--muted); line-height: 1.7; }
        @media (max-width: 820px) {
          .public-search-workspace { grid-template-columns: 1fr; }
          .public-search-filters { position: static; max-height: none; }
        }
        @media (max-width: 620px) {
          .public-search-hero { grid-template-columns:1fr; padding-top:24px; }
          .public-search-mode { grid-column:1; }
          .public-search-hero form { grid-template-columns:1fr; }
          .public-search-hero form button { min-height:42px; }
          .public-search-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </main>
    <LawTechDeskStyles />
  </>
}

PublicSearchPage.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'law-tech-search' })
  return {
    props: { items },
    revalidate: 1800
  }
}
