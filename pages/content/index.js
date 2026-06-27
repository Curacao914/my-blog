import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'

import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import {
  getContentFacets,
  getContentStats
} from '@/lib/contentSnapshots'
import { groupContentByCollection } from '@/lib/contentHierarchy'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

const accessLabels = {
  public: '公开',
  password: '密码访问',
  private: '私密'
}

const preferredCategoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

function compareCategories(left, right) {
  const leftIndex = preferredCategoryOrder.indexOf(left)
  const rightIndex = preferredCategoryOrder.indexOf(right)
  if (leftIndex >= 0 || rightIndex >= 0) {
    if (leftIndex < 0) return 1
    if (rightIndex < 0) return -1
    return leftIndex - rightIndex
  }
  return String(left).localeCompare(String(right), 'zh-CN')
}

function formatDate(date) {
  if (!date) return '未标注日期'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date))
}

function itemCategory(item) {
  return item.display?.category || item.category || item.folder?.path?.[0] || '未归档'
}

function itemTags(item) {
  return item.display?.tags || item.tags || []
}

function itemHref(item) {
  return item.href || `/content/${item.slug}`
}

function sourceLabel(item) {
  if (item.source === 'notion') return 'Notion'
  if (item.source === 'course-worker' || item.source === 'course-workflow') return '课程工作台'
  return '站内内容'
}

function stableHue(value = '') {
  let hash = 0
  for (const char of String(value || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 48 + 148
}

function groupCollectionsByCategory(collections = [], includePreferred = false) {
  const groups = new Map()
  if (includePreferred) {
    preferredCategoryOrder.forEach(category => groups.set(category, {
      category,
      key: category,
      collections: [],
      count: 0
    }))
  }
  collections.forEach(collection => {
    if (!groups.has(collection.category)) {
      groups.set(collection.category, {
        category: collection.category,
        key: collection.category,
        collections: [],
        count: 0
      })
    }
    const group = groups.get(collection.category)
    group.collections.push(collection)
    group.count += collection.items.length
  })
  return [...groups.values()].sort((left, right) => compareCategories(left.category, right.category))
}

function updateOpenSet(setter, key, open) {
  setter(current => {
    const next = new Set(current)
    if (open) next.add(key)
    else next.delete(key)
    return next
  })
}

const ContentPage = ({ snapshots, facets, stats }) => {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [type, setType] = useState('全部')
  const [tag, setTag] = useState('')
  const [openCategories, setOpenCategories] = useState(() => new Set())
  const [openCollections, setOpenCollections] = useState(() => new Set())

  useEffect(() => {
    if (!router.isReady) return
    const requestedCategory = String(router.query.category || '')
    const requestedQuery = String(router.query.q || '')
    if (requestedCategory) setCategory(requestedCategory)
    if (requestedQuery) setQuery(requestedQuery)
  }, [router.isReady, router.query.category, router.query.q])

  const categoryCounts = useMemo(() => snapshots.reduce((counts, item) => {
    const key = itemCategory(item)
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {}), [snapshots])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return snapshots.filter(item => {
      const tags = itemTags(item)
      const haystack = [
        item.title,
        item.summary,
        itemCategory(item),
        item.course?.name,
        item.course?.lesson,
        ...tags
      ].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN')

      if (keyword && !haystack.includes(keyword)) return false
      if (category !== '全部' && itemCategory(item) !== category) return false
      if (type !== '全部' && item.type !== type) return false
      if (tag && !tags.includes(tag)) return false
      return true
    })
  }, [snapshots, query, category, type, tag])

  const filtersActive = Boolean(query || category !== '全部' || type !== '全部' || tag)
  const collections = useMemo(() => groupContentByCollection(filtered), [filtered])
  const categoryGroups = useMemo(
    () => groupCollectionsByCategory(collections, !filtersActive),
    [collections, filtersActive]
  )
  const categories = useMemo(() => [...facets.categories].sort(compareCategories), [facets.categories])
  const types = useMemo(() => [...new Set(snapshots.map(item => item.type).filter(Boolean))], [snapshots])

  function clearFilters() {
    setQuery('')
    setCategory('全部')
    setType('全部')
    setTag('')
  }

  return <>
    <Head>
      <title>内容 · law-tech.dev</title>
      <meta name='description' content='Curacao 的文章、课程笔记、读书记录与项目记录。' />
      <meta name='theme-color' content='#f5f3eb' />
    </Head>

    <main className='lawtech-public-page content-library-page'>
      <div className='public-aurora public-aurora-one' aria-hidden='true' />
      <div className='public-aurora public-aurora-two' aria-hidden='true' />
      <div className='public-shell'>
        <PublicHeader active='content' />

        <section className='content-library-intro'>
          <div>
            <span className='eyebrow'>Library</span>
            <h1>内容</h1>
          </div>
          <p>文章、课程笔记、读书记录与项目记录，按栏目和合集持续归档。</p>
          <dl>
            <div><dt>{stats.total}</dt><dd>条内容</dd></div>
            <div><dt>{stats.byType.article || 0}</dt><dd>篇文章</dd></div>
            <div><dt>{stats.byType['course-note'] || 0}</dt><dd>份课程笔记</dd></div>
          </dl>
        </section>

        <section className='content-library-workspace'>
          <aside className='content-library-sidebar' aria-label='内容筛选'>
            <label className='content-search'>
              <span>搜索</span>
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder='标题、摘要、课程或标签' />
            </label>

            <details className='content-filter-block' open>
              <summary><span>栏目</span><small>{categories.length}</small></summary>
              <div className='content-filter-list'>
                <button className={category === '全部' ? 'active' : ''} type='button' onClick={() => setCategory('全部')}>
                  <span>全部</span><small>{snapshots.length}</small>
                </button>
                {categories.map(item => <button className={category === item ? 'active' : ''} type='button' key={item} onClick={() => setCategory(item)}>
                  <span>{item}</span><small>{categoryCounts[item] || 0}</small>
                </button>)}
              </div>
            </details>

            <details className='content-filter-block'>
              <summary><span>类型</span><small>{types.length}</small></summary>
              <div className='content-compact-chips'>
                <button className={type === '全部' ? 'active' : ''} type='button' onClick={() => setType('全部')}>全部</button>
                {types.map(item => <button className={type === item ? 'active' : ''} type='button' key={item} onClick={() => setType(item)}>{typeLabels[item] || item}</button>)}
              </div>
            </details>

            <details className='content-filter-block'>
              <summary><span>标签</span><small>{facets.tags.length}</small></summary>
              <div className='content-tag-cloud'>
                {facets.tags.map(item => <button className={tag === item ? 'active' : ''} type='button' key={item} onClick={() => setTag(current => current === item ? '' : item)}>{item}</button>)}
                {!facets.tags.length ? <span>暂无标签</span> : null}
              </div>
            </details>

            <div className='content-sidebar-signature' aria-hidden='true'>
              <DynamicSignature compact />
            </div>
          </aside>

          <section className='content-library-stream' aria-label='内容列表'>
            <header className='content-stream-head'>
              <div>
                <span>内容目录</span>
                <h2>{filtered.length} 条结果</h2>
              </div>
              {filtersActive ? <button type='button' onClick={clearFilters}>清除筛选</button> : null}
            </header>

            <div className='content-category-list'>
              {categoryGroups.map(group => {
                const categoryOpen = filtersActive || openCategories.has(group.key)
                return <details
                  className='content-category'
                  key={group.key}
                  open={categoryOpen}
                  onToggle={event => {
                    if (!filtersActive) updateOpenSet(setOpenCategories, group.key, event.currentTarget.open)
                  }}
                >
                  <summary>
                    <div><span>栏目</span><h3>{group.category}</h3></div>
                    <div className='content-category-summary'><strong>{group.count}</strong><small>{group.collections.length} 个合集</small></div>
                  </summary>
                  <div className='content-category-body'>
                    {!group.collections.length ? <p className='content-category-empty'>这个栏目还没有公开内容。</p> : null}
                    {group.collections.map(collection => {
                      const collectionOpen = filtersActive || openCollections.has(collection.key)
                      return <details
                        className='content-collection'
                        key={collection.key}
                        open={collectionOpen}
                        onToggle={event => {
                          if (!filtersActive) updateOpenSet(setOpenCollections, collection.key, event.currentTarget.open)
                        }}
                      >
                        <summary>
                          <div><span>合集</span><h4>{collection.collection || '未分合集'}</h4></div>
                          <small>{collection.items.length} 条</small>
                        </summary>
                        <div className='content-card-grid'>
                          {collection.items.map(item => {
                            const coverHue = stableHue(`${itemCategory(item)}:${item.course?.name || item.title}`)
                            return <Link className={`content-library-card ${item.cover ? 'has-cover' : 'generated-cover'}`} href={itemHref(item)} key={item.id || `${item.source}:${item.slug}`}>
                              <div
                                className={`content-card-cover ${item.cover ? 'has-image' : 'is-generated'}`}
                                style={item.cover
                                  ? { backgroundImage: `url("${item.cover}")` }
                                  : { '--cover-hue': String(coverHue) }}
                                aria-hidden='true'
                              >
                                {!item.cover ? <>
                                  <span>{itemCategory(item)}</span>
                                  <strong>{item.course?.name || collection.collection || typeLabels[item.type] || '内容'}</strong>
                                </> : null}
                              </div>
                              <div className='content-card-body'>
                                <div className='content-card-meta'>
                                  <span>{typeLabels[item.type] || item.type}</span>
                                  <span>{sourceLabel(item)}</span>
                                  <span>{accessLabels[item.access?.mode] || '公开'}</span>
                                </div>
                                <h5>{item.title}</h5>
                                <p>{item.summary || '暂无摘要。'}</p>
                                {item.course ? <div className='content-course-line'>
                                  {item.course.name ? <span>{item.course.name}</span> : null}
                                  {item.course.lesson ? <span>{item.course.lesson}</span> : null}
                                  {item.course.teacher ? <span>{item.course.teacher}</span> : null}
                                </div> : null}
                                <div className='content-card-tags'>{itemTags(item).slice(0, 6).map(itemTag => <span key={itemTag}>{itemTag}</span>)}</div>
                                <footer><span>{formatDate(item.date || item.updatedAt)}</span><b>阅读 ↗</b></footer>
                              </div>
                            </Link>
                          })}
                        </div>
                      </details>
                    })}
                  </div>
                </details>
              })}

              {!filtered.length ? <div className='content-empty'>
                <h3>没有匹配的内容</h3>
                <p>可以清除筛选后重新浏览。</p>
                <button type='button' onClick={clearFilters}>查看全部</button>
              </div> : null}
            </div>
          </section>
        </section>
      </div>
    </main>

    <style jsx>{`
      .content-library-page { min-height: 100vh; }
      .content-library-intro {
        display: grid;
        grid-template-columns: minmax(180px,.7fr) minmax(280px,1.3fr) auto;
        gap: 32px;
        align-items: end;
        padding: 48px 0 34px;
        border-bottom: 1px solid rgba(23,35,29,.1);
      }
      .content-library-intro .eyebrow { display: block; margin-bottom: 10px; }
      .content-library-intro h1 { margin: 0; font-family: var(--display-serif); font-size: clamp(44px,7vw,74px); font-weight: 600; line-height: .95; letter-spacing: -.06em; }
      .content-library-intro > p { margin: 0; max-width: 520px; color: var(--muted); font-size: 15px; line-height: 1.85; }
      .content-library-intro dl { display: flex; gap: 22px; margin: 0; }
      .content-library-intro dl div { display: grid; gap: 2px; text-align: right; }
      .content-library-intro dt { color: var(--ink); font-family: var(--display-serif); font-size: 22px; }
      .content-library-intro dd { margin: 0; color: var(--quiet); font-size: 10px; }

      .content-library-workspace { display: grid; grid-template-columns: 250px minmax(0,1fr); gap: 24px; align-items: start; padding: 28px 0 90px; }
      .content-library-sidebar,
      .content-library-stream { border: 1px solid rgba(255,255,255,.7); border-radius: 24px; background: linear-gradient(145deg,rgba(255,255,255,.64),rgba(239,245,241,.42)); box-shadow: 0 22px 64px rgba(24,63,50,.065), inset 0 1px 0 rgba(255,255,255,.82); backdrop-filter: blur(22px) saturate(1.08); }
      .content-library-sidebar { position: sticky; top: 96px; max-height: calc(100dvh - 114px); overflow: auto; padding: 16px; }
      .content-search { display: grid; gap: 7px; color: var(--quiet); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
      .content-search input { width: 100%; border: 1px solid rgba(23,35,29,.09); border-radius: 12px; padding: 10px 11px; color: var(--ink); background: rgba(255,255,255,.72); font-size: 12px; text-transform: none; letter-spacing: 0; outline: none; }
      .content-search input:focus { border-color: rgba(49,90,140,.3); box-shadow: 0 0 0 3px rgba(49,90,140,.06); }
      .content-filter-block { margin-top: 13px; padding-top: 13px; border-top: 1px solid rgba(23,35,29,.07); }
      .content-filter-block > summary { display: flex; justify-content: space-between; gap: 10px; color: var(--quiet); font-size: 10px; cursor: pointer; list-style: none; }
      .content-filter-block > summary::-webkit-details-marker { display: none; }
      .content-filter-block > summary::after { content: '＋'; margin-left: auto; }
      .content-filter-block[open] > summary::after { content: '−'; }
      .content-filter-block > summary small { margin-left: 6px; }
      .content-filter-list { display: grid; gap: 3px; margin-top: 9px; }
      .content-filter-list button { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 0; border-radius: 10px; padding: 7px 8px; color: var(--muted); background: transparent; text-align: left; cursor: pointer; }
      .content-filter-list button.active { color: var(--ink); background: rgba(220,233,223,.6); }
      .content-filter-list small { color: var(--quiet); }
      .content-compact-chips,
      .content-tag-cloud { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
      .content-compact-chips button,
      .content-tag-cloud button { border: 1px solid rgba(49,90,140,.12); border-radius: 999px; padding: 4px 7px; color: var(--quiet); background: rgba(255,255,255,.44); font-size: 10px; cursor: pointer; }
      .content-compact-chips button.active,
      .content-tag-cloud button.active { color: #315a8c; border-color: rgba(49,90,140,.25); background: rgba(226,237,241,.72); }
      .content-tag-cloud > span { color: var(--quiet); font-size: 10px; }
      .content-sidebar-signature { margin: 22px 4px 0; padding-top: 14px; border-top: 1px solid rgba(23,35,29,.07); color: rgba(25,59,49,.72); }

      .content-library-stream { min-width: 0; padding: 20px; }
      .content-stream-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 2px 2px 18px; border-bottom: 1px solid rgba(23,35,29,.07); }
      .content-stream-head span { color: var(--quiet); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
      .content-stream-head h2 { margin: 4px 0 0; font-family: var(--display-serif); font-size: 24px; font-weight: 600; }
      .content-stream-head button,
      .content-empty button { border: 0; border-radius: 999px; padding: 7px 11px; color: var(--green); background: rgba(220,233,223,.62); cursor: pointer; }

      .content-category-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; padding-top: 20px; }
      .content-category { min-width: 0; border: 1px solid rgba(23,35,29,.075); border-radius: 20px; background: rgba(255,255,255,.48); box-shadow: inset 0 1px 0 rgba(255,255,255,.75); transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
      .content-category:hover { transform: translateY(-2px); border-color: rgba(49,90,140,.16); box-shadow: 0 16px 38px rgba(24,63,50,.07), inset 0 1px 0 rgba(255,255,255,.82); }
      .content-category[open] { grid-column: 1 / -1; transform: none; background: rgba(255,255,255,.54); }
      .content-category > summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 116px; padding: 20px; cursor: pointer; list-style: none; }
      .content-category > summary::-webkit-details-marker,
      .content-collection > summary::-webkit-details-marker { display: none; }
      .content-category > summary span,
      .content-collection > summary span { color: var(--quiet); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
      .content-category > summary h3 { margin: 5px 0 0; font-family: var(--display-serif); font-size: 25px; font-weight: 600; }
      .content-category-summary { display: grid; gap: 3px; text-align: right; }
      .content-category-summary strong { font-family: var(--display-serif); font-size: 27px; font-weight: 500; }
      .content-category-summary small { color: var(--quiet); font-size: 9px; }
      .content-category-body { display: grid; gap: 10px; padding: 0 12px 12px; }
      .content-category-empty { margin: 0; border: 1px dashed rgba(23,35,29,.09); border-radius: 14px; padding: 18px; color: var(--quiet); background: rgba(255,255,255,.3); font-size: 11px; text-align: center; }

      .content-collection { border: 1px solid rgba(23,35,29,.065); border-radius: 16px; background: rgba(250,252,250,.5); }
      .content-collection > summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 15px; cursor: pointer; list-style: none; }
      .content-collection > summary h4 { margin: 3px 0 0; font-family: var(--display-serif); font-size: 18px; font-weight: 600; }
      .content-collection > summary small { color: var(--quiet); }
      .content-card-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; padding: 0 10px 10px; }
      .content-library-card { display: grid; min-width: 0; overflow: hidden; border: 1px solid rgba(255,255,255,.76); border-radius: 19px; background: linear-gradient(145deg,rgba(255,255,255,.74),rgba(239,245,241,.52)); box-shadow: 0 12px 32px rgba(24,63,50,.055), inset 0 1px 0 rgba(255,255,255,.88); backdrop-filter: blur(18px); transition: transform .2s cubic-bezier(.2,.75,.25,1), border-color .2s ease, box-shadow .2s ease; }
      .content-library-card:hover { transform: translateY(-5px) scale(1.008); border-color: rgba(49,90,140,.22); box-shadow: 0 22px 48px rgba(24,63,50,.12), inset 0 1px 0 rgba(255,255,255,.9); }
      .content-card-cover { display: grid; align-content: end; gap: 4px; min-height: 132px; padding: 15px; background-size: cover; background-position: center; }
      .content-card-cover.is-generated { color: rgba(255,255,255,.94); background: radial-gradient(circle at 80% 10%,hsla(var(--cover-hue),55%,74%,.85),transparent 43%), linear-gradient(145deg,hsl(var(--cover-hue),32%,27%),hsl(calc(var(--cover-hue) + 26),35%,43%)); }
      .content-card-cover.is-generated span { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; opacity: .75; }
      .content-card-cover.is-generated strong { font-family: var(--display-serif); font-size: 22px; font-weight: 550; line-height: 1.1; }
      .content-card-body { display: flex; min-height: 220px; flex-direction: column; padding: 16px; }
      .content-card-meta { display: flex; flex-wrap: wrap; gap: 8px; color: var(--blue); font-size: 9px; }
      .content-card-meta span + span::before { content: '·'; margin-right: 8px; color: var(--quiet); }
      .content-library-card h5 { margin: 10px 0 0; font-family: var(--display-serif); font-size: 21px; font-weight: 600; line-height: 1.35; letter-spacing: -.025em; }
      .content-library-card p { display: -webkit-box; overflow: hidden; margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.7; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
      .content-course-line { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 11px; color: var(--quiet); font-size: 10px; }
      .content-card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 12px; }
      .content-card-tags span { border-radius: 999px; padding: 3px 6px; color: #41617a; background: rgba(226,237,241,.55); font-size: 9px; }
      .content-library-card footer { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 16px; color: var(--quiet); font-size: 9px; }
      .content-library-card footer b { color: var(--green); font-weight: 600; }
      .content-empty { grid-column: 1 / -1; padding: 44px 20px; text-align: center; color: var(--muted); }
      .content-empty h3 { margin: 0; color: var(--ink); font-family: var(--display-serif); font-size: 22px; }
      .content-empty p { margin: 8px 0 16px; }

      @media (max-width: 980px) {
        .content-library-intro { grid-template-columns: 1fr 1.5fr; }
        .content-library-intro dl { grid-column: 1 / -1; justify-content: flex-start; }
        .content-library-intro dl div { text-align: left; }
        .content-card-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 760px) {
        .content-library-intro { grid-template-columns: 1fr; gap: 16px; padding-top: 30px; }
        .content-library-intro dl { gap: 16px; }
        .content-library-workspace { grid-template-columns: 1fr; padding-top: 18px; }
        .content-library-sidebar { position: static; max-height: none; }
        .content-library-stream { padding: 14px; }
        .content-category-list { grid-template-columns: 1fr; }
        .content-category[open] { grid-column: auto; }
        .content-sidebar-signature { max-width: 240px; }
      }
    `}</style>
    <LawTechDeskStyles />
  </>
}

ContentPage.layout = 'bare'

export async function getStaticProps() {
  const { items: snapshots, source } = await loadPublicContentIndex({
    from: 'content-index'
  })

  return {
    props: {
      snapshots,
      facets: getContentFacets(snapshots),
      stats: getContentStats(snapshots),
      source
    },
    revalidate: 1800
  }
}

export default ContentPage
