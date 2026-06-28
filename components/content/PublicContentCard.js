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
      .public-content-card {
        display: grid;
        min-width: 0;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.76);
        border-radius: 24px;
        color: var(--ink);
        background: linear-gradient(145deg,rgba(255,255,255,.72),rgba(239,245,241,.5));
        box-shadow: 0 14px 38px rgba(24,63,50,.065), inset 0 1px 0 rgba(255,255,255,.9);
        backdrop-filter: blur(20px) saturate(1.08);
        transition: transform .22s cubic-bezier(.2,.75,.25,1), border-color .22s ease, box-shadow .22s ease;
      }
      .public-content-card:hover {
        transform: translateY(-6px);
        border-color: rgba(49,90,140,.2);
        box-shadow: 0 25px 56px rgba(24,63,50,.13), inset 0 1px 0 rgba(255,255,255,.94);
      }
      .public-content-card-cover {
        display: grid;
        align-content: end;
        gap: 5px;
        min-height: 148px;
        padding: 18px;
        background-position: center;
        background-size: cover;
      }
      .public-content-card-cover.is-generated {
        color: rgba(255,255,255,.95);
        background:
          radial-gradient(circle at 80% 8%,hsla(var(--content-cover-hue),58%,76%,.82),transparent 42%),
          linear-gradient(145deg,hsl(var(--content-cover-hue),32%,27%),hsl(calc(var(--content-cover-hue) + 25),35%,43%));
      }
      .public-content-card-cover span {
        font-size: 9px;
        letter-spacing: .13em;
        text-transform: uppercase;
        opacity: .76;
      }
      .public-content-card-cover strong {
        font-family: var(--display-serif);
        font-size: 22px;
        font-weight: 550;
        line-height: 1.1;
      }
      .public-content-card-body {
        display: flex;
        min-height: 228px;
        flex-direction: column;
        padding: 18px;
      }
      .public-content-card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--blue);
        font-size: 9px;
      }
      .public-content-card-meta span + span::before {
        content: '·';
        margin-right: 8px;
        color: var(--quiet);
      }
      h3 {
        margin: 11px 0 0;
        font-family: var(--display-serif);
        font-size: 22px;
        font-weight: 600;
        line-height: 1.35;
        letter-spacing: -.025em;
      }
      p {
        display: -webkit-box;
        overflow: hidden;
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.75;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }
      .public-content-card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 14px;
      }
      .public-content-card-tags span {
        border-radius: 999px;
        padding: 3px 7px;
        color: #41617a;
        background: rgba(226,237,241,.58);
        font-size: 9px;
      }
      footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: auto;
        padding-top: 18px;
        color: var(--quiet);
        font-size: 9px;
      }
      footer b { color: var(--green); font-weight: 650; }
      .is-compact .public-content-card-cover { min-height: 112px; }
      .is-compact .public-content-card-body { min-height: 194px; padding: 15px; }
      .is-compact h3 { font-size: 19px; }
      .is-compact p { -webkit-line-clamp: 2; }
      .is-featured { height: 100%; grid-template-rows: minmax(220px,1.18fr) auto; }
      .is-featured .public-content-card-cover { min-height: 220px; padding: 25px; }
      .is-featured .public-content-card-cover strong { font-size: clamp(27px,3vw,40px); }
      .is-featured .public-content-card-body { min-height: 244px; padding: 23px; }
      .is-featured h3 { font-size: clamp(25px,3vw,34px); }
      .is-featured p { font-size: 13px; -webkit-line-clamp: 4; }
    `}</style>
  </>
}
