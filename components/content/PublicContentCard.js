import Link from 'next/link'

import {
  publicContentCategory,
  publicContentCollection,
  publicContentDate,
  publicContentHref,
  publicContentStableHue,
  publicContentTags,
  publicContentTypeLabel
} from '@/lib/content/publicContent'

function formatDate(value) {
  if (!value) return '未标注日期'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未标注日期'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function PublicContentCard({ item, compact = false, featured = false }) {
  const category = publicContentCategory(item)
  const collection = publicContentCollection(item)
  const tags = publicContentTags(item).slice(0, compact ? 3 : 5)
  const hue = publicContentStableHue(`${category}:${collection}:${item?.title}`)
  const coverStyle = item?.cover
    ? { backgroundImage: `url("${item.cover}")` }
    : { '--content-cover-hue': String(hue) }

  return <>
    <Link
      data-quicklook
      data-quicklook-title={item?.title || '未命名内容'}
      data-quicklook-meta={`${publicContentTypeLabel(item?.type)} · ${category}`}
      className={`public-content-card ${compact ? 'is-compact' : ''} ${featured ? 'is-featured' : ''} ${item?.cover ? 'has-cover' : 'generated-cover'}`}
    href={publicContentHref(item)}
  >
    <div
      className={`public-content-card-cover ${item?.cover ? 'has-image' : 'is-generated'}`}
      style={coverStyle}
      aria-hidden='true'
    >
      {!item?.cover ? <>
        <span>{category}</span>
        <strong>{collection}</strong>
      </> : null}
    </div>
    <div className='public-content-card-body'>
      <div className='public-content-card-meta'>
        <span>{publicContentTypeLabel(item?.type)}</span>
        <span>{category}</span>
      </div>
      <h3>{item?.title || '未命名内容'}</h3>
      {item?.summary ? <p>{item.summary}</p> : null}
      {tags.length ? <div className='public-content-card-tags'>
        {tags.map(tag => <span key={tag}>{tag}</span>)}
      </div> : null}
      <footer>
        <span>{formatDate(publicContentDate(item))}</span>
        <b>阅读 ↗</b>
      </footer>
    </div>
    </Link>

    <style jsx>{`
      /* public-content-card-surface-v1: compact card surface */
      .public-content-card {
        display: grid;
        min-width: 0;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.76);
        border-radius: 18px;
        color: var(--ink);
        background: rgba(255,255,255,.58);
        box-shadow: 0 9px 24px rgba(24,63,50,.04), inset 0 1px 0 rgba(255,255,255,.84);
        transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .public-content-card:hover {
        transform: translateY(-2px);
        border-color: rgba(49,90,140,.18);
        box-shadow: 0 13px 32px rgba(24,63,50,.07), inset 0 1px 0 rgba(255,255,255,.88);
      }
      .public-content-card-cover {
        display: grid;
        align-content: end;
        gap: 5px;
        min-height: 104px;
        padding: 14px;
        background-position: center;
        background-size: cover;
      }
      .public-content-card-cover.is-generated {
        color: rgba(255,255,255,.95);
        background:
          radial-gradient(circle at 80% 8%,hsla(var(--content-cover-hue),52%,76%,.34),transparent 38%),
          linear-gradient(145deg,hsl(var(--content-cover-hue),25%,34%),hsl(calc(var(--content-cover-hue) + 18),28%,46%));
      }
      .public-content-card-cover span { font-size: 9px; letter-spacing: .13em; text-transform: uppercase; opacity: .76; }
      .public-content-card-cover strong { font-family: var(--display-serif); font-size: 18px; font-weight: 550; line-height: 1.1; }
      .public-content-card-body { display: flex; min-height: 154px; flex-direction: column; padding: 14px; }
      .public-content-card-meta { display: flex; flex-wrap: wrap; gap: 8px; color: var(--blue); font-size: 9px; }
      .public-content-card-meta span + span::before { content: '·'; margin-right: 8px; color: var(--quiet); }
      h3 { margin: 9px 0 0; font-family: var(--display-serif); font-size: 18px; font-weight: 600; line-height: 1.34; letter-spacing: -.02em; }
      p { display: -webkit-box; overflow: hidden; margin: 7px 0 0; color: var(--muted); font-size: 11px; line-height: 1.65; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .public-content-card-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
      .public-content-card-tags span { border-radius: 999px; padding: 3px 7px; color: #41617a; background: rgba(226,237,241,.58); font-size: 9px; }
      footer { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 12px; color: var(--quiet); font-size: 9px; }
      footer b { color: var(--green); font-weight: 650; }
      .is-compact .public-content-card-cover { min-height: 86px; }
      .is-compact .public-content-card-body { min-height: 132px; padding: 12px; }
      .is-compact h3 { font-size: 18px; }
      .is-compact p { -webkit-line-clamp: 2; }
      .is-featured { height: 100%; grid-template-rows: minmax(160px,.9fr) auto; }
      .is-featured .public-content-card-cover { min-height: 160px; padding: 20px; }
      .is-featured .public-content-card-cover strong { font-size: clamp(27px,3vw,40px); }
      .is-featured .public-content-card-body { min-height: 178px; padding: 18px; }
      .is-featured h3 { font-size: clamp(25px,3vw,34px); }
      .is-featured p { font-size: 12px; -webkit-line-clamp: 3; }
    `}</style>
  </>
}
