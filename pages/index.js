import Head from 'next/head'
import Link from 'next/link'
import { useMemo } from 'react'

import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.snapshots)) return value.snapshots
  return []
}

function itemTitle(item) {
  return item?.display?.title || item?.title || item?.name || '未命名内容'
}

function itemSummary(item) {
  return item?.display?.summary || item?.summary || item?.description || item?.excerpt || '保留一条可以继续打开的公开内容。'
}

function itemCategory(item) {
  return item?.display?.category || item?.category || item?.folder?.path?.[0] || item?.collection || '未归档'
}

function itemType(item) {
  return typeLabels[item?.type] || item?.type || '内容'
}

function itemDateValue(item) {
  return item?.display?.date || item?.date || item?.createdAt || item?.created_time || item?.lastEditedAt || item?.last_edited_time || item?.updatedAt || ''
}

function itemDate(item) {
  const value = itemDateValue(item)
  if (!value) return '未标注日期'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date)
}

function itemHref(item) {
  if (item?.href) return item.href
  if (item?.slug) return String(item.slug).startsWith('/') ? String(item.slug) : `/content/${item.slug}`
  if (item?.id) return `/content/${item.id}`
  return '/content'
}

function itemTags(item) {
  const tags = item?.display?.tags || item?.tags || item?.properties?.tags || []
  return Array.isArray(tags) ? tags.filter(Boolean).slice(0, 3) : []
}

function itemCover(item) {
  const cover = item?.display?.cover || item?.cover || item?.coverImage || item?.image || item?.thumbnail
  if (typeof cover === 'string' && cover.trim()) return cover
  if (typeof cover?.url === 'string') return cover.url
  return ''
}

function stableHue(seed = '') {
  let hash = 0
  for (const char of String(seed)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash % 52) + 152
}

function coverStyle(item, seed) {
  const cover = itemCover(item)
  const hue = stableHue(seed || itemTitle(item))
  if (cover) {
    return {
      '--cover-hue': hue,
      backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.28), rgba(255,255,255,.08)), url("${cover}")`
    }
  }
  return { '--cover-hue': hue }
}

function sortByDate(items) {
  return [...items].sort((left, right) => {
    const l = new Date(itemDateValue(left) || 0).getTime() || 0
    const r = new Date(itemDateValue(right) || 0).getTime() || 0
    return r - l
  })
}

function FeaturedPanel({ item }) {
  if (!item) {
    return <section className='home-feature-panel empty'>
      <div className='home-cover-mosaic' aria-hidden='true' />
      <div className='home-feature-copy'>
        <span className='home-kicker'>Library</span>
        <h1>内容库正在整理</h1>
        <p>这里会展示最近公开的文章、课程笔记和项目记录。</p>
      </div>
    </section>
  }

  const tags = itemTags(item)
  return <section className='home-feature-panel'>
    <Link className='home-cover-mosaic' href={itemHref(item)} style={coverStyle(item, itemTitle(item))} aria-label={`打开 ${itemTitle(item)}`}>
      <span>{itemType(item)}</span>
    </Link>
    <div className='home-feature-copy'>
      <span className='home-kicker'>{itemCategory(item)} · {itemDate(item)}</span>
      <h1>{itemTitle(item)}</h1>
      <p>{itemSummary(item)}</p>
      <div className='home-tag-row'>
        {tags.length ? tags.map(tag => <Link key={tag} href={`/tag/${encodeURIComponent(tag)}`}>{tag}</Link>) : <Link href='/content'>进入内容库</Link>}
      </div>
    </div>
  </section>
}

function RecentRail({ items }) {
  const recent = items.slice(0, 4)
  return <section className='home-widget home-recent-rail' aria-label='最近内容'>
    <div className='home-widget-head'>
      <span>Recent</span>
      <Link href='/content'>全部</Link>
    </div>
    <div className='home-recent-filmstrip'>
      {recent.map((item, index) => <Link key={`${itemHref(item)}-${index}`} className='home-recent-card' href={itemHref(item)} style={coverStyle(item, `${itemTitle(item)}-${index}`)}>
        <span className='home-recent-date'>{itemDate(item)}</span>
        <strong>{itemTitle(item)}</strong>
        <small>{itemType(item)} · {itemCategory(item)}</small>
      </Link>)}
      {!recent.length && <div className='home-recent-card empty'>暂无公开内容</div>}
    </div>
  </section>
}

function TopicShelf({ items }) {
  const topics = useMemo(() => {
    const map = new Map()
    items.forEach(item => {
      const category = itemCategory(item)
      if (!map.has(category)) map.set(category, { category, count: 0, sample: item })
      map.get(category).count += 1
    })
    return [...map.values()].slice(0, 4)
  }, [items])

  return <section className='home-topic-shelf' aria-label='内容分区'>
    {topics.map(topic => <Link key={topic.category} href={`/content?category=${encodeURIComponent(topic.category)}`} className='home-topic-chip'>
      <span>{topic.category}</span>
      <strong>{topic.count}</strong>
    </Link>)}
    {!topics.length && ['遇事不决', '法与算法', '法律之上'].map(topic => <Link key={topic} href='/content' className='home-topic-chip'><span>{topic}</span><strong>0</strong></Link>)}
  </section>
}

function ToolShelf() {
  const tools = [
    { href: '/content', title: '内容库', desc: '文章与笔记' },
    { href: '/archive', title: '归档', desc: '按时间回看' },
    { href: '/tools', title: '工具', desc: '常用入口' },
    { href: '/desk', title: '工作台', desc: '写作与课程' }
  ]
  return <section className='home-tool-shelf' aria-label='常用入口'>
    {tools.map(tool => <Link href={tool.href} key={tool.href} className='home-tool-tile'>
      <span>{tool.title}</span>
      <small>{tool.desc}</small>
    </Link>)}
  </section>
}

export default function Home({ items = [], stats = {} }) {
  const sortedItems = useMemo(() => sortByDate(items), [items])
  const featured = sortedItems[0]
  const count = stats?.count ?? sortedItems.length
  const categories = stats?.categories ?? new Set(sortedItems.map(itemCategory)).size

  return <>
    <Head>
      <title>Law-Tech · Curacao</title>
      <meta name='description' content='法学、写作、课程与工具的个人工作系统。' />
    </Head>
    <LawTechDeskStyles />
    <PublicHeader />
    <main className='home-desktop-round3'>
      <section className='home-stage' aria-label='Law-Tech 桌面首页'>
        <section className='home-main-window' aria-label='首页主窗口'>
          <div className='home-window-chrome' aria-hidden='true'>
            <span className='red' /><span className='yellow' /><span className='green' />
            <strong>Library Desktop</strong>
          </div>
          <div className='home-window-grid'>
            <FeaturedPanel item={featured} />
            <TopicShelf items={sortedItems} />
            <ToolShelf />
          </div>
        </section>

        <aside className='home-side-rail' aria-label='首页侧边小组件'>
          <section className='home-widget home-stat-widget'>
            <span>Library</span>
            <strong>{count}</strong>
            <small>{categories} 个栏目 · {count} 篇内容</small>
          </section>
          <RecentRail items={sortedItems} />
          <section className='home-widget home-desk-widget'>
            <span>Desk</span>
            <strong>工作台</strong>
            <p>写作、课程与资料入口。</p>
            <Link href='/desk'>进入</Link>
          </section>
          <div className='home-signature-wrap'><DynamicSignature /></div>
        </aside>
      </section>
    </main>
    <style jsx global>{`
      :root {
        --home-ink: #061d16;
        --home-muted: rgba(6, 29, 22, .64);
        --home-soft: rgba(255, 255, 255, .54);
        --home-line: rgba(255, 255, 255, .7);
        --home-shadow: 0 24px 70px rgba(13, 42, 36, .12), 0 8px 22px rgba(13, 42, 36, .08);
      }

      html, body { overflow: hidden; }
      body { min-width: 1100px; }

      body .public-header,
      body .public-header-shell,
      body .public-system-header,
      body .system-menu-bar,
      body .public-menu-bar {
        max-width: min(1120px, calc(100vw - 48px)) !important;
      }

      .home-desktop-round3 {
        position: relative;
        height: 100dvh;
        min-height: 760px;
        overflow: hidden;
        padding: 102px 30px 104px;
        color: var(--home-ink);
        background:
          radial-gradient(circle at 18% 14%, rgba(244, 223, 174, .5), transparent 32%),
          radial-gradient(circle at 82% 14%, rgba(147, 192, 197, .44), transparent 34%),
          linear-gradient(135deg, #f5efd9 0%, #edf6f0 48%, #d7e8e7 100%);
      }

      .home-desktop-round3::before {
        content: '';
        position: absolute;
        inset: 0;
        opacity: .32;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255,255,255,.34) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px);
        background-size: 42px 42px;
        mask-image: linear-gradient(to bottom, black 0 68%, transparent 100%);
      }

      .home-stage {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 304px;
        gap: 20px;
        width: min(1140px, calc(100vw - 60px));
        height: calc(100dvh - 206px);
        min-height: 554px;
        max-height: 690px;
        margin: 0 auto;
      }

      .home-main-window,
      .home-widget {
        border: 1px solid var(--home-line);
        background: linear-gradient(135deg, rgba(255,255,255,.66), rgba(255,255,255,.38));
        box-shadow: var(--home-shadow);
        backdrop-filter: blur(24px) saturate(1.08);
        -webkit-backdrop-filter: blur(24px) saturate(1.08);
      }

      .home-main-window {
        min-width: 0;
        overflow: hidden;
        border-radius: 34px;
      }

      .home-window-chrome {
        display: grid;
        grid-template-columns: 14px 14px 14px 1fr;
        align-items: center;
        gap: 8px;
        height: 48px;
        padding: 0 22px;
        border-bottom: 1px solid rgba(255,255,255,.52);
      }

      .home-window-chrome span {
        width: 11px;
        height: 11px;
        border-radius: 999px;
        box-shadow: inset 0 -1px 2px rgba(0,0,0,.08);
      }
      .home-window-chrome .red { background: #ff5f57; }
      .home-window-chrome .yellow { background: #ffbd2e; }
      .home-window-chrome .green { background: #28c840; }
      .home-window-chrome strong {
        justify-self: center;
        margin-left: -64px;
        color: rgba(6,29,22,.44);
        font-size: 12px;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      .home-window-grid {
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto auto;
        gap: 16px;
        height: calc(100% - 48px);
        padding: 22px;
        min-height: 0;
      }

      .home-feature-panel {
        display: grid;
        grid-template-columns: minmax(230px, .42fr) minmax(0, .58fr);
        gap: 18px;
        min-height: 0;
        overflow: hidden;
        border-radius: 28px;
        border: 1px solid rgba(255,255,255,.62);
        background: rgba(255,255,255,.43);
        padding: 16px;
      }

      .home-cover-mosaic {
        position: relative;
        display: block;
        min-height: 0;
        overflow: hidden;
        border-radius: 24px;
        text-decoration: none;
        background-color: hsl(var(--cover-hue, 172), 42%, 72%);
        background-image:
          radial-gradient(circle at 18% 18%, rgba(255,255,255,.8), transparent 28%),
          radial-gradient(circle at 78% 20%, hsla(var(--cover-hue, 172), 68%, 52%, .54), transparent 32%),
          radial-gradient(circle at 70% 88%, rgba(234, 187, 105, .5), transparent 36%),
          linear-gradient(145deg, hsla(var(--cover-hue, 172), 42%, 70%, .86), rgba(255,255,255,.42));
        background-size: cover;
        background-position: center;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.42);
      }

      .home-cover-mosaic::after {
        content: '';
        position: absolute;
        inset: 14px;
        border: 1px solid rgba(255,255,255,.46);
        border-radius: 20px;
      }

      .home-cover-mosaic span {
        position: absolute;
        left: 18px;
        bottom: 16px;
        z-index: 1;
        border-radius: 999px;
        padding: 7px 10px;
        color: rgba(6,29,22,.76);
        font-size: 11px;
        font-weight: 800;
        background: rgba(255,255,255,.7);
        backdrop-filter: blur(12px);
      }

      .home-feature-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        justify-content: center;
        padding: 4px min(22px, 3vw) 4px 4px;
      }

      .home-kicker,
      .home-widget > span,
      .home-widget-head span {
        color: #002f25;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .42em;
        text-transform: uppercase;
      }

      .home-feature-copy h1 {
        max-width: 520px;
        margin: 12px 0 0;
        color: #07120e;
        font-size: clamp(26px, 3vw, 44px);
        line-height: 1.08;
        letter-spacing: -.055em;
      }

      .home-feature-copy p {
        display: -webkit-box;
        max-width: 560px;
        margin: 14px 0 0;
        overflow: hidden;
        color: var(--home-muted);
        font-size: 14px;
        line-height: 1.75;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
      }

      .home-tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 18px;
      }

      .home-tag-row a,
      .home-desk-widget a,
      .home-tool-tile,
      .home-topic-chip {
        color: #03281f;
        text-decoration: none;
      }

      .home-tag-row a,
      .home-desk-widget a {
        border: 1px solid rgba(2,47,37,.09);
        border-radius: 999px;
        padding: 8px 11px;
        background: rgba(255,255,255,.58);
        font-size: 12px;
        font-weight: 800;
      }

      .home-topic-shelf,
      .home-tool-shelf {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .home-topic-chip,
      .home-tool-tile {
        min-width: 0;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 18px;
        background: rgba(255,255,255,.42);
        padding: 13px;
      }

      .home-topic-chip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .home-topic-chip span,
      .home-tool-tile span {
        overflow: hidden;
        font-size: 13px;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .home-topic-chip strong {
        color: rgba(6,29,22,.54);
        font-size: 20px;
      }

      .home-tool-tile {
        display: grid;
        gap: 5px;
      }

      .home-tool-tile small,
      .home-widget small,
      .home-desk-widget p,
      .home-recent-card small {
        color: var(--home-muted);
        font-size: 12px;
      }

      .home-side-rail {
        display: grid;
        grid-template-rows: 122px minmax(0, 1fr) 132px 54px;
        gap: 14px;
        min-width: 0;
        min-height: 0;
      }

      .home-widget {
        min-width: 0;
        overflow: hidden;
        border-radius: 28px;
        padding: 18px;
      }

      .home-stat-widget {
        display: grid;
        align-content: center;
      }

      .home-stat-widget strong {
        margin-top: 8px;
        color: #050b09;
        font-size: 48px;
        font-weight: 400;
        line-height: .9;
        letter-spacing: -.08em;
      }

      .home-stat-widget small {
        margin-top: 8px;
      }

      .home-widget-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .home-widget-head a {
        color: #03281f;
        font-size: 12px;
        font-weight: 900;
        text-decoration: none;
      }

      .home-recent-rail {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .home-recent-filmstrip {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        min-height: 0;
        overflow: hidden;
      }

      .home-recent-card {
        position: relative;
        display: grid;
        align-content: end;
        min-height: 92px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 20px;
        padding: 13px;
        color: #061d16;
        text-decoration: none;
        background-color: hsl(var(--cover-hue, 172), 38%, 76%);
        background-image:
          linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.76)),
          radial-gradient(circle at 88% 18%, hsla(var(--cover-hue, 172), 70%, 58%, .42), transparent 40%),
          linear-gradient(145deg, rgba(255,255,255,.5), rgba(235,241,232,.56));
        background-size: cover;
        background-position: center;
      }

      .home-recent-card strong {
        display: -webkit-box;
        overflow: hidden;
        font-size: 16px;
        line-height: 1.25;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .home-recent-date {
        margin-bottom: 5px;
        color: rgba(6,29,22,.58);
        font-size: 12px;
        font-weight: 800;
      }

      .home-desk-widget {
        display: grid;
        align-content: center;
        gap: 8px;
      }

      .home-desk-widget strong {
        color: #06120f;
        font-size: 27px;
        line-height: 1;
      }

      .home-signature-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 0;
      }

      .home-signature-wrap svg,
      .home-signature-wrap canvas {
        max-width: 220px;
        max-height: 52px;
      }

      @media (max-width: 1180px) {
        body { min-width: 0; }
        .home-desktop-round3 {
          height: auto;
          min-height: 100dvh;
          overflow: auto;
          padding: 96px 18px 96px;
        }
        html, body { overflow: auto; }
        .home-stage {
          grid-template-columns: 1fr;
          width: min(820px, calc(100vw - 36px));
          height: auto;
          max-height: none;
        }
        .home-side-rail {
          grid-template-rows: none;
          grid-template-columns: 1fr;
        }
        .home-feature-panel {
          grid-template-columns: 1fr;
        }
        .home-cover-mosaic {
          min-height: 210px;
        }
        .home-topic-shelf,
        .home-tool-shelf {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `}</style>
  </>
}

export async function getStaticProps() {
  let items = []
  try {
    items = asArray(await loadPublicContentIndex())
  } catch (error) {
    console.warn('[home] failed to load public content index', error)
  }

  const visible = items.filter(item => item && itemTitle(item) && item?.access !== 'private').slice(0, 24)
  const categories = new Set(visible.map(itemCategory)).size

  return {
    props: {
      items: visible,
      stats: {
        count: visible.length,
        categories
      }
    },
    revalidate: 300
  }
}
