import Head from 'next/head'
import Link from 'next/link'

import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { groupContentByCollection } from '@/lib/contentHierarchy'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'

const preferredCategoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

function itemHref(item) {
  return item?.href || (item?.slug ? `/content/${item.slug}` : '/content')
}

function itemCategory(item) {
  return item?.display?.category || item?.category || item?.folder?.path?.[0] || '未归档'
}

function itemTags(item) {
  return item?.display?.tags || item?.tags || []
}

function itemDate(item) {
  const value = item?.date || item?.createdAt || item?.updatedAt
  if (!value) return '未标注日期'
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(new Date(value))
  } catch (error) {
    return '未标注日期'
  }
}

function stableHue(value = '') {
  let hash = 0
  for (const char of String(value || 'Curacao')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 58 + 154
}

function coverStyle(item, key) {
  if (item?.cover) {
    return {
      '--cover-hue': String(stableHue(key)),
      backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.28), rgba(255,255,255,.06)), url("${item.cover}")`
    }
  }
  return { '--cover-hue': String(stableHue(key)) }
}

function categoryCounts(items = []) {
  const counts = new Map(preferredCategoryOrder.map(category => [category, 0]))
  items.forEach(item => {
    const category = itemCategory(item)
    counts.set(category, (counts.get(category) || 0) + 1)
  })
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((left, right) => {
      const leftIndex = preferredCategoryOrder.indexOf(left[0])
      const rightIndex = preferredCategoryOrder.indexOf(right[0])
      if (leftIndex >= 0 || rightIndex >= 0) {
        if (leftIndex < 0) return 1
        if (rightIndex < 0) return -1
        return leftIndex - rightIndex
      }
      return String(left[0]).localeCompare(String(right[0]), 'zh-CN')
    })
}

function trimText(value, fallback, limit = 104) {
  const text = String(value || fallback || '').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}…`
}

function FeatureCard({ item }) {
  const tags = itemTags(item).slice(0, 3)
  return <Link className='home-feature-card' href={itemHref(item)}>
    <div className='home-feature-cover' style={coverStyle(item, item?.slug || item?.title)}>
      <span>{itemCategory(item)}</span>
    </div>
    <div className='home-feature-copy'>
      <small>{itemCategory(item)} · {itemDate(item)}</small>
      <h1>{item?.title || '最近一篇内容'}</h1>
      <p>{trimText(item?.summary, '这里会展示最近公开内容的摘要。')}</p>
      <div className='home-feature-tags'>
        {(tags.length ? tags : ['文章', '笔记']).map(tag => <span key={tag}>{tag}</span>)}
      </div>
    </div>
  </Link>
}

function EmptyFeature() {
  return <div className='home-feature-card is-empty'>
    <div className='home-feature-cover' style={{ '--cover-hue': '174' }}><span>Library</span></div>
    <div className='home-feature-copy'>
      <small>Library Desktop</small>
      <h1>内容库</h1>
      <p>公开内容会在这里形成首页入口。现在先保留一个稳定、可继续打磨的桌面骨架。</p>
      <div className='home-feature-tags'><span>文章</span><span>笔记</span></div>
    </div>
  </div>
}

function RecentList({ items }) {
  return <div className='home-recent-filmstrip'>
    {items.length ? items.map(item => <Link className='home-recent-card' href={itemHref(item)} key={item.slug || item.title}>
      <span>{itemDate(item)}</span>
      <strong>{item?.title || '未命名内容'}</strong>
      <small>{itemCategory(item)}</small>
    </Link>) : <div className='home-recent-card is-empty'>
      <span>Today</span>
      <strong>还没有公开内容</strong>
      <small>等待内容索引更新</small>
    </div>}
  </div>
}

function HomeDesktop({ snapshots = [], collections = [] }) {
  const items = snapshots.filter(Boolean)
  const featured = items[0]
  const recent = items.slice(0, 5)
  const categories = categoryCounts(items).slice(0, 4)
  const collectionCount = collections.length || new Set(items.map(itemCategory)).size || 0

  return <>
    <Head>
      <title>Curacao · Law-Tech</title>
      <meta name='description' content='Curacao 的法学、写作、课程与工具桌面。' />
    </Head>
    <LawTechDeskStyles />
    <div className='home-desktop-round3-clean'>
      <PublicHeader />
      <main className='home-stage-clean' aria-label='Law-Tech 首页桌面'>
        <section className='home-main-window' aria-label='内容库桌面窗口'>
          <div className='home-window-bar'>
            <div className='home-window-lights' aria-hidden='true'><span /><span /><span /></div>
            <span>Library Desktop</span>
          </div>
          <div className='home-window-body'>
            {featured ? <FeatureCard item={featured} /> : <EmptyFeature />}
            <div className='home-category-shelf' aria-label='栏目入口'>
              {categories.map(([category, count]) => <Link href={`/content?category=${encodeURIComponent(category)}`} className='home-category-tile' key={category}>
                <strong>{category}</strong>
                <span>{count}</span>
              </Link>)}
            </div>
            <div className='home-action-shelf' aria-label='常用入口'>
              <Link href='/content'><strong>内容库</strong><span>文章与笔记</span></Link>
              <Link href='/archive'><strong>归档</strong><span>按时间回看</span></Link>
              <Link href='/tools'><strong>工具</strong><span>常用入口</span></Link>
              <Link href='/desk'><strong>工作台</strong><span>写作与课程</span></Link>
            </div>
          </div>
        </section>

        <aside className='home-side-rail' aria-label='首页状态栏'>
          <section className='home-rail-card home-stat-card'>
            <small>Library</small>
            <strong>{items.length}</strong>
            <span>{collectionCount} 个栏目 · {items.length} 篇内容</span>
          </section>
          <section className='home-rail-card home-recent-panel'>
            <div className='home-rail-title'><small>Recent</small><Link href='/content'>全部</Link></div>
            <RecentList items={recent} />
          </section>
          <section className='home-rail-card home-desk-card'>
            <small>Desk</small>
            <strong>工作台</strong>
            <div><Link href='/desk/today'>今日</Link><Link href='/desk'>系统</Link></div>
          </section>
          <div className='home-signature-wrap'><DynamicSignature compact /></div>
        </aside>
      </main>
    </div>
    <style jsx global>{`
      html,
      body,
      #__next {
        min-height: 100%;
      }

      body:has(.home-desktop-round3-clean) {
        margin: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 18% 14%, rgba(255, 230, 172, .58), transparent 30%),
          radial-gradient(circle at 78% 10%, rgba(175, 219, 224, .66), transparent 38%),
          linear-gradient(135deg, #f4ead1 0%, #eef5ef 48%, #d7e8e6 100%);
      }

      .home-desktop-round3-clean {
        position: relative;
        min-height: 100dvh;
        height: 100dvh;
        overflow: hidden;
        color: #062f27;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
        isolation: isolate;
      }

      .home-desktop-round3-clean::before {
        content: '';
        position: absolute;
        inset: 0;
        opacity: .28;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(0, 58, 46, .055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 58, 46, .05) 1px, transparent 1px);
        background-size: 72px 72px;
        mask-image: linear-gradient(to bottom, transparent 0, black 13%, black 82%, transparent 100%);
      }

      .home-stage-clean {
        position: relative;
        z-index: 2;
        width: min(1380px, calc(100vw - 84px));
        height: calc(100dvh - 168px);
        margin: 96px auto 72px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(278px, 336px);
        gap: 22px;
        align-items: stretch;
      }

      .home-main-window,
      .home-rail-card {
        border: 1px solid rgba(255, 255, 255, .68);
        background: linear-gradient(145deg, rgba(255, 255, 255, .54), rgba(255, 255, 255, .22));
        box-shadow: 0 28px 90px rgba(33, 59, 57, .16), inset 0 1px 0 rgba(255, 255, 255, .8);
        backdrop-filter: blur(22px) saturate(1.08);
      }

      .home-main-window {
        min-width: 0;
        overflow: hidden;
        border-radius: 34px;
        display: flex;
        flex-direction: column;
      }

      .home-window-bar {
        position: relative;
        min-height: 60px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 0 26px;
        color: rgba(6, 47, 39, .48);
        font-size: 12px;
        font-weight: 760;
        letter-spacing: .22em;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(255, 255, 255, .48);
      }

      .home-window-lights {
        display: flex;
        gap: 10px;
      }

      .home-window-lights span {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        display: block;
      }

      .home-window-lights span:nth-child(1) { background: #ff5f57; }
      .home-window-lights span:nth-child(2) { background: #ffbd2e; }
      .home-window-lights span:nth-child(3) { background: #28c840; }

      .home-window-body {
        min-height: 0;
        flex: 1;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .home-feature-card {
        min-height: 0;
        flex: 1 1 auto;
        display: grid;
        grid-template-columns: minmax(220px, .82fr) minmax(0, 1.18fr);
        gap: 24px;
        overflow: hidden;
        border-radius: 28px;
        padding: 20px;
        color: inherit;
        text-decoration: none;
        background: linear-gradient(145deg, rgba(255, 255, 255, .72), rgba(255, 255, 255, .28));
        border: 1px solid rgba(255, 255, 255, .72);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .82);
      }

      .home-feature-cover {
        position: relative;
        min-height: 280px;
        overflow: hidden;
        border-radius: 24px;
        background-size: cover;
        background-position: center;
        background-color: hsl(var(--cover-hue), 52%, 74%);
        background-image:
          radial-gradient(circle at 28% 22%, rgba(255, 255, 255, .62), transparent 32%),
          radial-gradient(circle at 88% 12%, hsla(calc(var(--cover-hue) + 26), 78%, 72%, .72), transparent 30%),
          linear-gradient(145deg, hsl(var(--cover-hue), 56%, 72%), hsl(calc(var(--cover-hue) + 34), 38%, 80%));
      }

      .home-feature-cover::after {
        content: '';
        position: absolute;
        inset: 18px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, .48);
        background: linear-gradient(135deg, rgba(255, 255, 255, .2), transparent);
      }

      .home-feature-cover span {
        position: absolute;
        left: 22px;
        bottom: 22px;
        z-index: 1;
        border-radius: 999px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, .72);
        color: #073b31;
        font-size: 12px;
        font-weight: 760;
      }

      .home-feature-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding: 12px 8px;
      }

      .home-feature-copy small,
      .home-rail-card small {
        color: rgba(6, 47, 39, .62);
        font-size: 11px;
        font-weight: 820;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      .home-feature-copy h1 {
        margin: 12px 0 12px;
        max-width: 620px;
        color: #071f1b;
        font-family: 'Noto Serif SC', 'Songti SC', serif;
        font-size: clamp(34px, 4.2vw, 60px);
        font-weight: 500;
        line-height: 1.05;
        letter-spacing: -.05em;
      }

      .home-feature-copy p {
        max-width: 560px;
        margin: 0;
        color: rgba(6, 47, 39, .62);
        font-size: 15px;
        line-height: 1.8;
      }

      .home-feature-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 22px;
      }

      .home-feature-tags span,
      .home-action-shelf a,
      .home-category-tile,
      .home-desk-card a {
        border: 1px solid rgba(6, 47, 39, .1);
        background: rgba(255, 255, 255, .48);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .65);
      }

      .home-feature-tags span {
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 720;
      }

      .home-category-shelf,
      .home-action-shelf {
        display: grid;
        gap: 12px;
      }

      .home-category-shelf {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
      }

      .home-category-tile,
      .home-action-shelf a {
        min-width: 0;
        color: inherit;
        text-decoration: none;
        border-radius: 18px;
        padding: 16px;
      }

      .home-category-tile {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }

      .home-category-tile strong,
      .home-action-shelf strong {
        font-size: 15px;
      }

      .home-category-tile span {
        color: rgba(6, 47, 39, .56);
        font-size: 22px;
        font-weight: 520;
      }

      .home-action-shelf {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
      }

      .home-action-shelf a {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .home-action-shelf span,
      .home-recent-card small,
      .home-stat-card span {
        color: rgba(6, 47, 39, .56);
        font-size: 12px;
      }

      .home-side-rail {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .home-rail-card {
        border-radius: 28px;
        padding: 20px;
      }

      .home-stat-card {
        min-height: 134px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .home-stat-card strong {
        margin: 6px 0 4px;
        color: #071f1b;
        font-size: 58px;
        font-weight: 460;
        line-height: .9;
      }

      .home-recent-panel {
        min-height: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .home-rail-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .home-rail-title a {
        color: #062f27;
        font-size: 12px;
        font-weight: 760;
        text-decoration: none;
      }

      .home-recent-filmstrip {
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
      }

      .home-recent-card {
        min-height: 92px;
        color: inherit;
        text-decoration: none;
        border-radius: 18px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        gap: 5px;
        border: 1px solid rgba(255, 255, 255, .66);
        background:
          radial-gradient(circle at 14% 12%, rgba(255, 255, 255, .58), transparent 34%),
          linear-gradient(145deg, rgba(255, 255, 255, .58), rgba(255, 255, 255, .24));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .68);
      }

      .home-recent-card span {
        color: rgba(6, 47, 39, .56);
        font-size: 12px;
      }

      .home-recent-card strong {
        display: -webkit-box;
        overflow: hidden;
        color: #071f1b;
        font-family: 'Noto Serif SC', 'Songti SC', serif;
        font-size: 18px;
        line-height: 1.28;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .home-desk-card strong {
        display: block;
        margin: 10px 0 14px;
        color: #071f1b;
        font-family: 'Noto Serif SC', 'Songti SC', serif;
        font-size: 30px;
        font-weight: 520;
      }

      .home-desk-card div {
        display: flex;
        gap: 8px;
      }

      .home-desk-card a {
        border-radius: 999px;
        padding: 8px 12px;
        color: #062f27;
        font-size: 12px;
        font-weight: 760;
        text-decoration: none;
      }

      .home-signature-wrap {
        display: flex;
        justify-content: center;
        min-height: 70px;
      }

      @media (max-width: 1120px) {
        body:has(.home-desktop-round3-clean) {
          overflow: auto;
        }

        .home-desktop-round3-clean {
          height: auto;
          min-height: 100dvh;
          overflow: visible;
        }

        .home-stage-clean {
          width: min(920px, calc(100vw - 36px));
          height: auto;
          min-height: auto;
          margin: 92px auto 108px;
          grid-template-columns: minmax(0, 1fr);
        }

        .home-feature-card {
          grid-template-columns: minmax(0, 1fr);
        }

        .home-feature-cover {
          min-height: 240px;
        }

        .home-side-rail {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }

        .home-category-shelf,
        .home-action-shelf {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `}</style>
  </>
}

HomeDesktop.layout = 'bare'

export async function getStaticProps() {
  const snapshots = await loadPublicContentIndex()
  const collections = groupContentByCollection(snapshots)

  return {
    props: {
      snapshots,
      collections
    },
    revalidate: 60
  }
}

export default HomeDesktop
