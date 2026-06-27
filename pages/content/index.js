import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import {
  getContentFacets,
  getContentStats,
  getPublicLiveContentIndex
} from '@/lib/contentSnapshots'
import {
  groupContentByCollection,
  mergeContentIndexes
} from '@/lib/contentHierarchy'
import { normalizeNotionContentIndex } from '@/lib/content/notionIndex'
import {
  listPublishedContentMetadata,
  toSnapshotLikeContent
} from '@/lib/contentRepository'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

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

const ContentPage = ({ snapshots, facets, stats }) => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [type, setType] = useState('全部')
  const [tag, setTag] = useState('')

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

  const collections = useMemo(() => groupContentByCollection(filtered), [filtered])
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

            <div className='content-filter-block'>
              <header><span>栏目</span><small>{facets.categories.length}</small></header>
              <div className='content-filter-list'>
                <button className={category === '全部' ? 'active' : ''} type='button' onClick={() => setCategory('全部')}>
                  <span>全部</span><small>{snapshots.length}</small>
                </button>
                {facets.categories.map(item => <button className={category === item ? 'active' : ''} type='button' key={item} onClick={() => setCategory(item)}>
                  <span>{item}</span><small>{categoryCounts[item] || 0}</small>
                </button>)}
              </div>
            </div>

            <div className='content-filter-block'>
              <header><span>类型</span></header>
              <div className='content-compact-chips'>
                <button className={type === '全部' ? 'active' : ''} type='button' onClick={() => setType('全部')}>全部</button>
                {types.map(item => <button className={type === item ? 'active' : ''} type='button' key={item} onClick={() => setType(item)}>{typeLabels[item] || item}</button>)}
              </div>
            </div>

            <div className='content-filter-block'>
              <header><span>标签</span></header>
              <div className='content-tag-cloud'>
                {facets.tags.map(item => <button className={tag === item ? 'active' : ''} type='button' key={item} onClick={() => setTag(current => current === item ? '' : item)}>{item}</button>)}
                {!facets.tags.length ? <span>暂无标签</span> : null}
              </div>
            </div>

            <div className='content-sidebar-signature' aria-hidden='true'>
              <DynamicSignature compact />
            </div>
          </aside>

          <section className='content-library-stream' aria-label='内容列表'>
            <header className='content-stream-head'>
              <div>
                <span>最近更新</span>
                <h2>{filtered.length} 条结果</h2>
              </div>
              {(query || category !== '全部' || type !== '全部' || tag) ? <button type='button' onClick={clearFilters}>清除筛选</button> : null}
            </header>

            <div className='content-collection-list'>
              {collections.map(collection => <section className='content-collection' key={collection.key}>
                <header>
                  <div><span>{collection.category}</span><h3>{collection.collection || '独立内容'}</h3></div>
                  <small>{collection.items.length}</small>
                </header>
                <div className='content-card-grid'>
                  {collection.items.map(item => <Link className={`content-library-card ${item.cover ? 'has-cover' : ''}`} href={itemHref(item)} key={item.id || `${item.source}:${item.slug}`}>
                    {item.cover ? <div className='content-card-cover' style={{ backgroundImage: `url("${item.cover}")` }} aria-hidden='true' /> : null}
                    <div className='content-card-body'>
                      <div className='content-card-meta'>
                        <span>{typeLabels[item.type] || item.type}</span>
                        <span>{sourceLabel(item)}</span>
                        <span>{accessLabels[item.access?.mode] || '公开'}</span>
                      </div>
                      <h4>{item.title}</h4>
                      <p>{item.summary || '暂无摘要。'}</p>
                      {item.course ? <div className='content-course-line'>
                        {item.course.name ? <span>{item.course.name}</span> : null}
                        {item.course.lesson ? <span>{item.course.lesson}</span> : null}
                        {item.course.teacher ? <span>{item.course.teacher}</span> : null}
                      </div> : null}
                      <div className='content-card-tags'>{itemTags(item).slice(0, 6).map(itemTag => <span key={itemTag}>{itemTag}</span>)}</div>
                      <footer><span>{formatDate(item.date || item.updatedAt)}</span><b>阅读 ↗</b></footer>
                    </div>
                  </Link>)}
                </div>
              </section>)}

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
      .content-library-intro h1 {
        margin: 0;
        font-family: var(--display-serif);
        font-size: clamp(44px,7vw,74px);
        font-weight: 600;
        line-height: .95;
        letter-spacing: -.06em;
      }
      .content-library-intro > p {
        margin: 0;
        max-width: 520px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.85;
      }
      .content-library-intro dl {
        display: flex;
        gap: 22px;
        margin: 0;
      }
      .content-library-intro dl div { display: grid; gap: 2px; text-align: right; }
      .content-library-intro dt { color: var(--ink); font-family: var(--display-serif); font-size: 22px; }
      .content-library-intro dd { margin: 0; color: var(--quiet); font-size: 10px; }

      .content-library-workspace {
        display: grid;
        grid-template-columns: 250px minmax(0,1fr);
        gap: 24px;
        align-items: start;
        padding: 28px 0 90px;
      }
      .content-library-sidebar,
      .content-library-stream {
        border: 1px solid rgba(23,35,29,.08);
        border-radius: 24px;
        background: rgba(255,255,255,.54);
        box-shadow: 0 22px 64px rgba(24,63,50,.055), inset 0 1px 0 rgba(255,255,255,.72);
        backdrop-filter: blur(18px);
      }
      .content-library-sidebar {
        position: sticky;
        top: 18px;
        padding: 16px;
      }
      .content-search { display: grid; gap: 7px; color: var(--quiet); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
      .content-search input {
        width: 100%;
        border: 1px solid rgba(23,35,29,.09);
        border-radius: 12px;
        padding: 10px 11px;
        color: var(--ink);
        background: rgba(255,255,255,.72);
        font-size: 12px;
        text-transform: none;
        letter-spacing: 0;
        outline: none;
      }
      .content-search input:focus { border-color: rgba(49,90,140,.3); box-shadow: 0 0 0 3px rgba(49,90,140,.06); }
      .content-filter-block { margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(23,35,29,.07); }
      .content-filter-block header { display: flex; justify-content: space-between; gap: 10px; color: var(--quiet); font-size: 10px; }
      .content-filter-list { display: grid; gap: 3px; margin-top: 9px; }
      .content-filter-list button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border: 0;
        border-radius: 10px;
        padding: 7px 8px;
        color: var(--muted);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }
      .content-filter-list button.active { color: var(--ink); background: rgba(220,233,223,.6); }
      .content-filter-list small { color: var(--quiet); }
      .content-compact-chips,
      .content-tag-cloud { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
      .content-compact-chips button,
      .content-tag-cloud button {
        border: 1px solid rgba(49,90,140,.12);
        border-radius: 999px;
        padding: 4px 7px;
        color: var(--quiet);
        background: rgba(255,255,255,.44);
        font-size: 10px;
        cursor: pointer;
      }
      .content-compact-chips button.active,
      .content-tag-cloud button.active { color: #315a8c; border-color: rgba(49,90,140,.25); background: rgba(226,237,241,.72); }
      .content-tag-cloud > span { color: var(--quiet); font-size: 10px; }
      .content-sidebar-signature { margin: 22px 4px 0; padding-top: 14px; border-top: 1px solid rgba(23,35,29,.07); color: rgba(25,59,49,.72); }

      .content-library-stream { min-width: 0; padding: 20px; }
      .content-stream-head {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        padding: 2px 2px 18px;
        border-bottom: 1px solid rgba(23,35,29,.07);
      }
      .content-stream-head span { color: var(--quiet); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
      .content-stream-head h2 { margin: 4px 0 0; font-family: var(--display-serif); font-size: 24px; font-weight: 600; }
      .content-stream-head button,
      .content-empty button { border: 0; border-radius: 999px; padding: 7px 11px; color: var(--green); background: rgba(220,233,223,.62); cursor: pointer; }
      .content-collection-list { display: grid; gap: 26px; padding-top: 20px; }
      .content-collection { display: grid; gap: 11px; }
      .content-collection > header { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 0 2px; }
      .content-collection > header span { color: var(--quiet); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
      .content-collection > header h3 { margin: 3px 0 0; font-family: var(--display-serif); font-size: 20px; font-weight: 600; }
      .content-collection > header small { color: var(--quiet); }
      .content-card-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
      .content-library-card {
        display: grid;
        min-width: 0;
        overflow: hidden;
        border: 1px solid rgba(23,35,29,.075);
        border-radius: 18px;
        background: rgba(255,255,255,.62);
        transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .content-library-card:hover { transform: translateY(-2px); border-color: rgba(49,90,140,.18); box-shadow: 0 14px 34px rgba(24,63,50,.08); }
      .content-card-cover { min-height: 126px; background-size: cover; background-position: center; }
      .content-card-body { display: flex; min-height: 230px; flex-direction: column; padding: 16px; }
      .content-card-meta { display: flex; flex-wrap: wrap; gap: 8px; color: var(--blue); font-size: 9px; }
      .content-card-meta span + span::before { content: '·'; margin-right: 8px; color: var(--quiet); }
      .content-library-card h4 { margin: 10px 0 0; font-family: var(--display-serif); font-size: 21px; font-weight: 600; line-height: 1.35; letter-spacing: -.025em; }
      .content-library-card p { display: -webkit-box; overflow: hidden; margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.7; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
      .content-course-line { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 11px; color: var(--quiet); font-size: 10px; }
      .content-card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 12px; }
      .content-card-tags span { border-radius: 999px; padding: 3px 6px; color: #41617a; background: rgba(226,237,241,.55); font-size: 9px; }
      .content-library-card footer { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 16px; color: var(--quiet); font-size: 9px; }
      .content-library-card footer b { color: var(--green); font-weight: 600; }
      .content-empty { padding: 44px 20px; text-align: center; color: var(--muted); }
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
        .content-library-sidebar { position: static; }
        .content-library-stream { padding: 14px; }
        .content-sidebar-signature { max-width: 240px; }
      }
    `}</style>
    <LawTechDeskStyles />
  </>
}

ContentPage.layout = 'bare'

export async function getStaticProps() {
  let snapshots = getPublicLiveContentIndex()
  let source = 'live-json'

  try {
    const notionData = await fetchGlobalAllData({ from: 'content-index' })
    const notionSnapshots = normalizeNotionContentIndex(notionData?.allPages || [])
    snapshots = mergeContentIndexes(notionSnapshots, snapshots)
    if (notionSnapshots.length) source = 'notion+live-json'
  } catch (error) {
    console.warn('[content] Notion index read failed; keeping snapshot sources', error)
  }

  try {
    const rows = await listPublishedContentMetadata()
    const databaseSnapshots = rows
      .map(row => toSnapshotLikeContent(row))
      .filter(item => item.access?.mode !== 'private')

    snapshots = mergeContentIndexes(snapshots, databaseSnapshots)
    if (databaseSnapshots.length > 0) source = `${source}+database`
  } catch (error) {
    console.warn('[content] database read failed; keeping Notion and live JSON', error)
  }

  return {
    props: {
      snapshots,
      facets: getContentFacets(snapshots),
      stats: getContentStats(snapshots),
      source
    },
    revalidate: 3600
  }
}

export default ContentPage
