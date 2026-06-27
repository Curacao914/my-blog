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
  publicContentTags
} from '@/lib/content/publicContent'

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

export default function PublicSearchPage({ items = [] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [type, setType] = useState('全部')

  useEffect(() => {
    if (!router.isReady) return
    const value = String(router.query.q || router.query.s || '')
    setQuery(value)
  }, [router.isReady, router.query.q, router.query.s])

  const categories = useMemo(() => [...new Set(items.map(publicContentCategory))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [items])
  const types = useMemo(() => [...new Set(items.map(item => item.type).filter(Boolean))], [items])
  const tags = useMemo(() => [...new Set(items.flatMap(publicContentTags))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [items])
  const results = useMemo(() => filterPublicContent(items, { query, category, type }), [items, query, category, type])

  function submit(event) {
    event.preventDefault()
    const nextQuery = query.trim() ? { q: query.trim() } : {}
    void router.replace({ pathname: '/search', query: nextQuery }, undefined, { shallow: true })
  }

  function clear() {
    setQuery('')
    setCategory('全部')
    setType('全部')
    void router.replace('/search', undefined, { shallow: true })
  }

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
          <span className='eyebrow'>Unified search</span>
          <h1>搜索</h1>
          <p>同时检索 Notion 文章与工作台发布内容的标题、摘要、栏目、合集、课程和标签。</p>
          <form onSubmit={submit}>
            <input
              autoComplete='off'
              autoFocus
              onChange={event => setQuery(event.target.value)}
              placeholder='输入标题、课程、栏目或标签'
              type='search'
              value={query}
            />
            <button type='submit'>搜索</button>
          </form>
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
                {tags.slice(0, 24).map(tag => <button type='button' key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}
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
        .public-search-hero { max-width: 820px; padding: 72px 0 34px; }
        .public-search-hero h1 { margin: 10px 0 12px; font-family: var(--display-serif); font-size: clamp(48px,7vw,78px); font-weight: 600; letter-spacing: -.055em; }
        .public-search-hero p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.8; }
        .public-search-hero form { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 9px; margin-top: 26px; border: 1px solid rgba(255,255,255,.78); border-radius: 20px; padding: 8px; background: rgba(255,255,255,.58); box-shadow: 0 18px 50px rgba(24,63,50,.08), inset 0 1px 0 rgba(255,255,255,.9); backdrop-filter: blur(22px); }
        .public-search-hero input { min-width: 0; border: 0; padding: 10px 13px; color: var(--ink); background: transparent; font-size: 15px; outline: none; }
        .public-search-hero button { border: 0; border-radius: 14px; padding: 0 18px; color: #fffaf0; background: var(--leaf); font-weight: 650; cursor: pointer; }
        .public-search-workspace { display: grid; grid-template-columns: 230px minmax(0,1fr); gap: 22px; align-items: start; padding-bottom: 90px; }
        .public-search-filters,
        .public-search-results { border: 1px solid rgba(255,255,255,.72); border-radius: 24px; background: linear-gradient(145deg,rgba(255,255,255,.64),rgba(239,245,241,.43)); box-shadow: 0 22px 64px rgba(24,63,50,.065), inset 0 1px 0 rgba(255,255,255,.84); backdrop-filter: blur(22px); }
        .public-search-filters { position: sticky; top: 96px; max-height: calc(100dvh - 114px); overflow: auto; padding: 15px; }
        .public-search-filters details { padding: 12px 0; border-bottom: 1px solid rgba(23,35,29,.07); }
        .public-search-filters summary { display: flex; justify-content: space-between; color: var(--quiet); font-size: 10px; cursor: pointer; list-style: none; }
        .public-search-filters summary::-webkit-details-marker { display: none; }
        .public-search-filters details > div { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
        .public-search-filters button { border: 1px solid rgba(49,90,140,.11); border-radius: 999px; padding: 5px 8px; color: var(--quiet); background: rgba(255,255,255,.45); font-size: 10px; cursor: pointer; }
        .public-search-filters button.active { color: #315a8c; border-color: rgba(49,90,140,.25); background: rgba(226,237,241,.75); }
        .public-search-signature { margin-top: 18px; color: rgba(25,59,49,.72); }
        .public-search-results { min-width: 0; padding: 18px; }
        .public-search-results > header { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 3px 3px 17px; border-bottom: 1px solid rgba(23,35,29,.07); }
        .public-search-results header span { color: var(--quiet); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
        .public-search-results h2 { margin: 4px 0 0; font-family: var(--display-serif); font-size: 25px; font-weight: 600; }
        .public-search-results header button,
        .public-search-empty button { border: 0; border-radius: 999px; padding: 8px 11px; color: var(--green); background: rgba(220,233,223,.65); cursor: pointer; }
        .public-search-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; padding-top: 18px; }
        .public-search-empty { padding: 70px 20px; text-align: center; }
        .public-search-empty h3 { margin: 0; font-family: var(--display-serif); font-size: 25px; }
        .public-search-empty p { margin: 9px auto 18px; max-width: 420px; color: var(--muted); line-height: 1.7; }
        @media (max-width: 820px) {
          .public-search-workspace { grid-template-columns: 1fr; }
          .public-search-filters { position: static; max-height: none; }
        }
        @media (max-width: 620px) {
          .public-search-hero form { grid-template-columns: 1fr; }
          .public-search-hero button { min-height: 42px; }
          .public-search-grid { grid-template-columns: 1fr; }
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
