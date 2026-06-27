import {
  getContentFacets,
  getContentStats,
  getPublicLiveContentIndex
} from '@/lib/contentSnapshots'
import {
  listPublishedContentMetadata,
  toSnapshotLikeContent
} from '@/lib/contentRepository'
import { groupContentByCollection, mergeContentIndexes } from '@/lib/contentHierarchy'
import Head from 'next/head'
import Link from 'next/link'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

const accessLabels = {
  public: '公开',
  password: '需要密码',
  private: '私有'
}

const fallbackFolders = [
  {
    name: '内容',
    children: [
      { name: '文章', children: [] },
      { name: '课程笔记', children: [] },
      { name: '读书记录', children: [] },
      { name: '公开分享', children: [] }
    ]
  }
]

function formatDate(date) {
  if (!date) return '未标注日期'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date))
}

function renderFolderTree(folders) {
  return (
    <ul className='folder-list'>
      {folders.map(folder => (
        <li key={folder.name}>
          <span>{folder.name}</span>
          {folder.children?.length > 0 && renderFolderTree(folder.children)}
        </li>
      ))}
    </ul>
  )
}

const ContentPage = ({ snapshots, facets, stats }) => {
  const folders = facets.folders.length ? facets.folders : fallbackFolders
  const collections = groupContentByCollection(snapshots)

  return (
    <>
      <Head>
        <title>内容 · law-tech.dev</title>
        <meta
          name='description'
          content='Curacao 的内容入口：文章、课程笔记、读书记录和公开分享。'
        />
        <meta name='theme-color' content='#f7f9f8' />
      </Head>

      <div className='content-page'>
        <div className='wrap'>
          <PublicHeader active='content' />

          <main className='main'>
            <section className='hero'>
              <p className='eyebrow'>Content</p>
              <h1>写过的东西，和正在整理的东西。</h1>
              <p className='lead'>
                文章、课程笔记、读书记录，先按能读懂的方式摆出来。
              </p>
            </section>

            <section className='workspace'>
              <aside className='side-panel' aria-label='内容目录'>
                <div className='panel-head'>
                  <span>目录</span>
                  <small>{stats.total} 条</small>
                </div>
                {renderFolderTree(folders)}

                <div className='facet-block'>
                  <h2>分类</h2>
                  <div className='chips'>
                    {facets.categories.map(category => (
                      <span key={category}>{category}</span>
                    ))}
                    {facets.categories.length === 0 && <span>等待内容</span>}
                  </div>
                </div>

                <div className='facet-block'>
                  <h2>Tags</h2>
                  <div className='chips quiet'>
                    {facets.tags.map(tag => (
                      <span key={tag}>{tag}</span>
                    ))}
                    {facets.tags.length === 0 && <span>暂无 tag</span>}
                  </div>
                </div>
              </aside>

              <section className='content-list' aria-label='内容列表'>
                <div className='list-head'>
                  <div>
                    <h2>最近</h2>
                    <p>公开内容会出现在这里；需要密码的内容会单独提示。</p>
                  </div>
                  <div className='stats'>
                    <span>{stats.byType.article || 0} 篇文章</span>
                    <span>{stats.byType['course-note'] || 0} 份课程笔记</span>
                    <span>{stats.byAccess.password || 0} 个密码分享</span>
                  </div>
                </div>

                <div className='cards'>
                  {collections.map(collection => (
                    <section className='collection-group' key={collection.key}>
                      <header>
                        <span>{collection.category}</span>
                        <h3>{collection.collection || '独立内容'}</h3>
                        <small>{collection.items.length} 条</small>
                      </header>
                      <div className='collection-items'>
                        {collection.items.map(item => (
                          <Link className='content-card' href={`/content/${item.slug}`} key={item.id || item.slug}>
                            <div className='card-meta'>
                              <span>{typeLabels[item.type] || item.type}</span>
                              <span>{item.course?.lesson || item.display?.category || item.category}</span>
                              <span>{accessLabels[item.access?.mode] || '公开'}</span>
                            </div>
                            <h3>{item.title}</h3>
                            <p>{item.summary || '还没有摘要。'}</p>
                            {item.course && <dl className='course-meta'>
                              {item.course.name && <><dt>课程</dt><dd>{item.course.name}</dd></>}
                              {item.course.lesson && <><dt>课次</dt><dd>{item.course.lesson}</dd></>}
                              {item.course.teacher && <><dt>教师</dt><dd>{item.course.teacher}</dd></>}
                            </dl>}
                            <div className='card-foot'>
                              <span>{formatDate(item.date || item.updatedAt)}</span>
                              <span>{item.folder?.path?.join(' / ') || '未归档'}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                  {snapshots.length === 0 && <div className='empty'><h3>这里暂时还空着。</h3><p>等有内容公开后，会出现在这里。</p></div>}
                </div>
              </section>
            </section>
          </main>
        </div>
      </div>

      <style jsx>{`
        .content-page {
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
              circle at 92% 8%,
              rgba(49, 90, 140, 0.08),
              transparent 18rem
            ),
            radial-gradient(
              circle at 6% 18%,
              rgba(201, 154, 59, 0.09),
              transparent 20rem
            ),
            linear-gradient(180deg, #fcfefd 0%, var(--bg) 100%);
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .wrap {
          width: min(1120px, calc(100% - 40px));
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
          padding: 46px 0 90px;
        }

        .hero {
          max-width: 760px;
          margin-bottom: 52px;
        }

        .eyebrow {
          margin: 0 0 16px;
          color: var(--gold);
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        h1 {
          font-size: clamp(31px, 5vw, 56px);
          line-height: 1.12;
          letter-spacing: -0.06em;
          max-width: 720px;
        }

        .lead {
          margin-top: 22px;
          color: #58645e;
          font-size: 16px;
          line-height: 1.85;
          max-width: 680px;
        }

        .workspace {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: 28px;
          align-items: start;
        }

        .side-panel,
        .content-list {
          border: 1px solid var(--line);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.74);
          box-shadow: 0 18px 52px rgba(37, 55, 48, 0.045);
        }

        .side-panel {
          padding: 20px;
          position: sticky;
          top: 20px;
        }

        .panel-head,
        .list-head,
        .card-foot,
        .card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .panel-head {
          padding-bottom: 16px;
          border-bottom: 1px solid var(--line);
          font-weight: 720;
        }

        .panel-head small {
          color: var(--quiet);
          font-weight: 500;
        }

        .folder-list {
          list-style: none;
          margin: 18px 0 26px;
          padding: 0;
          color: #4f5b55;
          font-size: 14px;
        }

        .folder-list ul {
          list-style: none;
          margin: 9px 0 0 14px;
          padding-left: 14px;
          border-left: 1px solid var(--line);
        }

        .folder-list li + li {
          margin-top: 10px;
        }

        .folder-list span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .folder-list span::before {
          content: '';
          width: 7px;
          height: 7px;
          border: 1px solid var(--gold);
          border-radius: 2px;
          background: rgba(201, 154, 59, 0.14);
        }

        .facet-block {
          border-top: 1px solid var(--line);
          padding-top: 18px;
          margin-top: 18px;
        }

        .facet-block h2 {
          font-size: 13px;
          color: var(--quiet);
          margin-bottom: 12px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chips span {
          border: 1px solid rgba(63, 95, 58, 0.18);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--green);
          background: rgba(63, 95, 58, 0.055);
          font-size: 12px;
        }

        .chips.quiet span {
          color: var(--blue);
          background: rgba(49, 90, 140, 0.055);
          border-color: rgba(49, 90, 140, 0.16);
        }

        .content-list {
          padding: 24px;
        }

        .list-head {
          align-items: flex-start;
          padding-bottom: 22px;
          border-bottom: 1px solid var(--line);
        }

        .list-head h2 {
          font-size: 20px;
          letter-spacing: -0.035em;
        }

        .list-head p {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.75;
          margin-top: 8px;
        }

        .stats {
          display: grid;
          gap: 8px;
          min-width: 150px;
        }

        .stats span {
          text-align: right;
          color: var(--quiet);
          font-size: 12px;
        }

        .cards {
          display: grid;
          gap: 18px;
        }

        .collection-group {
          display: grid;
          gap: 10px;
        }

        .collection-group > header {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 3px 12px;
          padding: 4px 2px;
        }

        .collection-group > header span {
          grid-column: 1 / -1;
          color: var(--quiet);
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .collection-group > header h3 {
          font-size: 20px;
        }

        .collection-group > header small {
          color: var(--quiet);
        }

        .collection-items {
          display: grid;
          gap: 12px;
        }

        .cards {
          display: grid;
          gap: 14px;
          padding-top: 18px;
        }

        .content-card {
          padding: 20px;
          border: 1px solid rgba(223, 231, 225, 0.86);
          border-radius: 22px;
          background: rgba(252, 254, 253, 0.7);
        }

        .card-meta {
          justify-content: flex-start;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .card-meta span {
          color: var(--blue);
          font-size: 12px;
        }

        .card-meta span + span::before {
          content: '·';
          color: var(--quiet);
          margin-right: 14px;
        }

        .content-card h3 {
          font-size: 22px;
          letter-spacing: -0.04em;
          line-height: 1.35;
        }

        .content-card p {
          margin-top: 10px;
          color: #58645e;
          font-size: 14px;
          line-height: 1.75;
        }

        .course-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px 14px;
          margin: 18px 0 0;
          padding: 14px;
          border-radius: 16px;
          background: rgba(63, 95, 58, 0.045);
        }

        .course-meta dt {
          color: var(--quiet);
          font-size: 11px;
        }

        .course-meta dd {
          margin: 4px 0 0;
          color: var(--ink);
          font-size: 13px;
        }

        .card-foot {
          margin-top: 18px;
          color: var(--quiet);
          font-size: 12px;
        }

        .empty {
          padding: 32px;
          border: 1px dashed var(--line);
          border-radius: 22px;
          color: var(--muted);
        }

        .empty h3 {
          color: var(--ink);
          font-size: 18px;
          margin-bottom: 8px;
        }

        @media (max-width: 860px) {
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

          .workspace {
            grid-template-columns: 1fr;
          }

          .side-panel {
            position: static;
          }

          .list-head {
            flex-direction: column;
          }

          .stats span {
            text-align: left;
          }

          .course-meta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <LawTechDeskStyles />
    </>
  )
}

ContentPage.layout = 'bare'

export async function getStaticProps() {
  let snapshots = getPublicLiveContentIndex()
  let source = 'live-json'

  try {
    const rows = await listPublishedContentMetadata()
    const databaseSnapshots = rows
      .map(row => toSnapshotLikeContent(row))
      .filter(item => item.access?.mode !== 'private')

    snapshots = mergeContentIndexes(snapshots, databaseSnapshots)
    if (databaseSnapshots.length > 0) source = 'database+live-json'
  } catch (error) {
    console.warn('[content] database read failed, fallback to live JSON', error)
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
