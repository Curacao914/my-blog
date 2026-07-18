import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { LawTechIcon } from '@/components/LawTechIcons'
import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { PublicHeader } from '@/components/law-tech/PublicHeader'
import { SystemWindowControls, useSystemWindow } from '@/components/law-tech/SystemWindowManager'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  publicContentCategory,
  publicContentCollection,
  publicContentDate,
  publicContentHref,
  publicContentStableHue,
  publicContentTags,
  selectRecentPublicContent
} from '@/lib/content/publicContent'
import { DEFAULT_SITE_PROFILE, getPublicSiteProfile, normalizeSiteProfile } from '@/lib/siteProfile'

const MAX_ITEMS = 18
const MAX_RANDOM_ITEMS = 80

const HOME_APPS = [
  { key: 'library', label: '资料库', icon: 'content' },
  { key: 'spaces', label: '栏目', icon: 'atlas' },
  { key: 'chronicle', label: '时间线', icon: 'archive' },
  { key: 'studio', label: '实验室', icon: 'spark' }
]

const HOME_TOOLS = [
  { label: 'OCR', href: 'https://law-tech.dev/ocr/', icon: 'scan', meta: '图片与 PDF' },
  { label: '引注', href: 'https://law-tech.dev/citation/', icon: 'citation', meta: '脚注与书目' },
  { label: '课程', href: '/desk/courses', icon: 'courses', meta: '材料与笔记' },
  { label: '写作', href: '/desk/writing', icon: 'writing', meta: '草稿与项目' }
]

const LOCAL_QUOTES = [
  '系统负责记住，你负责改变主意。',
  '先找到真正的问题，再考虑写得漂亮。',
  '有些绕路后来会变成地图。',
  '法学之外还有风，记得开窗。',
  '答案会过期，值得追的问题通常不会。'
]

const SPACE_LAYOUT = [
  { x: 7, y: 9, w: 38, h: 32, cx: 260, cy: 150 },
  { x: 56, y: 7, w: 36, h: 31, cx: 750, cy: 140 },
  { x: 12, y: 56, w: 34, h: 31, cx: 290, cy: 390 },
  { x: 58, y: 54, w: 34, h: 32, cx: 750, cy: 390 }
]

function safeText(value, fallback = '') {
  const text = String(value || '').trim()
  return text || fallback
}

function formatDate(value, options = {}) {
  if (!value) return options.fallback || '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return options.fallback || '—'
  return new Intl.DateTimeFormat('zh-CN', {
    year: options.withYear ? 'numeric' : undefined,
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

function itemSummary(item = {}) {
  return safeText(item?.display?.summary || item?.summary || item?.description || item?.excerpt, '')
}

function toHomeItem(item = {}) {
  const href = publicContentHref(item)
  const category = publicContentCategory(item)
  const collection = publicContentCollection(item)
  return {
    id: safeText(item?.id || item?.slug || href, href),
    title: safeText(item?.title, '未命名内容'),
    href,
    type: safeText(item?.type, 'page'),
    category,
    collection,
    date: publicContentDate(item),
    summary: itemSummary(item),
    tags: [...new Set(publicContentTags(item).filter(Boolean))].slice(0, 8),
    cover: safeText(item?.cover || item?.pageCoverThumbnail || item?.pageCover, ''),
    hue: publicContentStableHue(`${category}:${collection}:${item?.title || ''}`)
  }
}

function buildCategoryModel(items = []) {
  const groups = new Map()
  items.forEach(item => {
    const category = publicContentCategory(item)
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category).push(toHomeItem(item))
  })
  return [...groups.entries()]
    .map(([name, categoryItems]) => ({
      name,
      count: categoryItems.length,
      latest: categoryItems[0] || null,
      items: categoryItems.slice(0, 6)
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'))
}

function buildSpaceModel(items = [], categories = []) {
  const selected = categories.slice(0, 4)
  const selectedNames = new Set(selected.map(item => item.name))
  const tagCategories = new Map()
  const spaces = selected.map((category, index) => {
    const categoryItems = items
      .filter(item => publicContentCategory(item) === category.name)
      .map(toHomeItem)
    const tagCounts = new Map()
    categoryItems.forEach(item => {
      item.tags.forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1))
    })
    const tags = [...tagCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    tags.forEach(tag => {
      if (!tagCategories.has(tag.name)) tagCategories.set(tag.name, new Set())
      tagCategories.get(tag.name).add(category.name)
    })
    return { ...category, items: categoryItems.slice(0, 8), tags, layout: SPACE_LAYOUT[index] || SPACE_LAYOUT[0] }
  })

  const connectionMap = new Map()
  items.forEach(item => {
    const category = publicContentCategory(item)
    if (!selectedNames.has(category)) return
    const tags = [...new Set(publicContentTags(item).filter(Boolean))]
    tags.forEach(tag => {
      const categoriesForTag = tagCategories.get(tag)
      if (!categoriesForTag || categoriesForTag.size < 2) return
      const names = [...categoriesForTag].sort((a, b) => a.localeCompare(b, 'zh-CN'))
      for (let left = 0; left < names.length; left += 1) {
        for (let right = left + 1; right < names.length; right += 1) {
          const key = `${names[left]}::${names[right]}`
          if (!connectionMap.has(key)) connectionMap.set(key, { from: names[left], to: names[right], tags: new Map(), weight: 0 })
          const connection = connectionMap.get(key)
          connection.tags.set(tag, (connection.tags.get(tag) || 0) + 1)
          connection.weight += 1
        }
      }
    })
  })

  const byName = new Map(spaces.map(space => [space.name, space]))
  const connections = [...connectionMap.values()]
    .map(connection => ({
      ...connection,
      fromSpace: byName.get(connection.from),
      toSpace: byName.get(connection.to),
      tags: [...connection.tags.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 2)
        .map(([name]) => name)
    }))
    .filter(connection => connection.fromSpace && connection.toSpace)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)

  return { spaces, connections }
}

export function buildHomeDesktopModel(publicIndex = {}) {
  const items = Array.isArray(publicIndex?.items) ? publicIndex.items.filter(Boolean) : []
  const recent = selectRecentPublicContent(items, MAX_ITEMS).map(toHomeItem)
  const categories = buildCategoryModel(items)
  const typeCounts = items.reduce((summary, item) => {
    const type = safeText(item?.type, 'page')
    summary[type] = (summary[type] || 0) + 1
    return summary
  }, {})
  const randomItems = [...new Set(items.map(publicContentHref).filter(href => href && href !== '/content'))].slice(0, MAX_RANDOM_ITEMS)
  const covered = recent.filter(item => item.cover)
  const spaceModel = buildSpaceModel(items, categories)

  return {
    source: safeText(publicIndex?.source, 'empty'),
    recent,
    categories: categories.slice(0, 8),
    spaces: spaceModel.spaces,
    connections: spaceModel.connections,
    carousel: (covered.length >= 3 ? covered : recent).slice(0, 7),
    randomItems,
    counts: {
      total: items.length,
      articles: typeCounts.article || 0,
      courseNotes: typeCounts['course-note'] || 0,
      categories: categories.length
    }
  }
}


function ContentCover({ item, compact = false }) {
  const style = item.cover ? { backgroundImage: `url("${item.cover}")` } : { '--home-cover-hue': item.hue }
  return (
    <span className={`home-cover ${item.cover ? 'has-image' : 'is-generated'} ${compact ? 'is-compact' : ''}`} style={style} aria-hidden='true'>
      {!item.cover ? <><b>§</b><small>{item.category}</small></> : null}
    </span>
  )
}

function LibraryWindow({ model, home = {} }) {
  return (
    <div className='home-library-v7 home-scroll-view'>
      <section className='home-library-overview'>
        <header><div><span>Library</span><h1>{home.libraryTitle || '资料库'}</h1></div><p>{model.counts.total} 条内容 · {model.counts.categories} 个栏目</p></header>
        <div className='home-library-shelves'>
          {model.categories.slice(0, 4).map((category, index) => (
            <article className={`tone-${index % 4}`} key={category.name}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h2>{category.name}</h2>
              <p>{category.latest?.title || '暂无内容'}</p>
              <footer><b>{category.count}</b><button type='button' onClick={() => document.dispatchEvent(new CustomEvent('lawtech-home-app', { detail: { app: 'spaces', category: category.name } }))}>展开</button></footer>
            </article>
          ))}
        </div>
      </section>

      <section className='home-library-recent'>
        <header><div><span>Recent</span><h2>{home.recentTitle || '最近更新'}</h2></div><Link href='/content'>全部内容 ↗</Link></header>
        <div>
          {model.recent.slice(0, 6).map((item, index) => (
            <Link data-quicklook href={item.href} key={item.id}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <ContentCover item={item} compact />
              <span><strong>{item.title}</strong><small>{item.category} · {formatDate(item.date)}</small></span>
              <i>↗</i>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function connectionPath(connection) {
  const start = connection.fromSpace.layout
  const end = connection.toSpace.layout
  const bend = Math.max(70, Math.abs(end.cx - start.cx) * .18)
  const direction = start.cy <= end.cy ? -1 : 1
  const controlY = Math.min(start.cy, end.cy) + direction * bend
  return `M ${start.cx} ${start.cy} Q ${(start.cx + end.cx) / 2} ${controlY} ${end.cx} ${end.cy}`
}

function SpacesWindow({ model, requestedCategory = '' }) {
  const [selected, setSelected] = useState(requestedCategory)

  useEffect(() => {
    if (requestedCategory) setSelected(requestedCategory)
  }, [requestedCategory])

  const selectedSpace = model.spaces.find(space => space.name === selected)
  if (selectedSpace) {
    return (
      <div className='home-space-detail home-scroll-view'>
        <header>
          <button type='button' onClick={() => setSelected('')}><LawTechIcon name='collapse' size={15} />返回栏目</button>
          <Link href={`/category/${encodeURIComponent(selectedSpace.name)}`}>查看全部 ↗</Link>
        </header>
        <section className='home-space-detail-head'>
          <span>Collection</span><h1>{selectedSpace.name}</h1><p>{selectedSpace.count} 条内容</p>
          <div>{selectedSpace.tags.map(tag => <span key={tag.name}>{tag.name}<small>{tag.count}</small></span>)}</div>
        </section>
        <div className='home-space-detail-list'>
          {selectedSpace.items.map((item, index) => (
            <Link data-quicklook href={item.href} key={item.id}>
              <b>{String(index + 1).padStart(2, '0')}</b><ContentCover item={item} compact />
              <span><strong>{item.title}</strong><small>{formatDate(item.date)} · {item.tags.slice(0, 3).join(' / ') || item.category}</small></span><i>↗</i>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='home-spaces-view'>
      <header><div><span>Collections</span><h1>栏目</h1></div></header>
      <div className='home-space-map'>
        <svg viewBox='0 0 1000 520' aria-hidden='true'>
          {model.connections.map(connection => (
            <g key={`${connection.from}:${connection.to}`}>
              <path d={connectionPath(connection)} style={{ '--connection-weight': Math.min(4, connection.weight) }} />
              <text x={(connection.fromSpace.layout.cx + connection.toSpace.layout.cx) / 2} y={(connection.fromSpace.layout.cy + connection.toSpace.layout.cy) / 2 - 8}>{connection.tags.join(' · ')}</text>
            </g>
          ))}
        </svg>
        {model.spaces.map((space, index) => (
          <button
            className={`home-space-island tone-${index % 4}`}
            key={space.name}
            onClick={() => setSelected(space.name)}
            style={{ left: `${space.layout.x}%`, top: `${space.layout.y}%`, width: `${space.layout.w}%`, minHeight: `${space.layout.h}%` }}
            type='button'
          >
            <span>{String(index + 1).padStart(2, '0')}</span><h2>{space.name}</h2><p>{space.latest?.title || '暂无内容'}</p>
            <div>{space.tags.slice(0, 3).map(tag => <small key={tag.name}>{tag.name}</small>)}</div><b>{space.count} 条</b>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChronicleWindow({ model }) {
  return (
    <div className='home-chronicle-view home-scroll-view'>
      <header><span>Chronicle</span><h1>时间线</h1></header>
      <ol>
        {model.recent.slice(0, 12).map((item, index) => (
          <li key={item.id}>
            <time>{formatDate(item.date, { withYear: true })}</time><i aria-hidden='true' />
            <Link data-quicklook href={item.href}><span>{item.category}</span><strong>{item.title}</strong>{item.summary ? <small>{item.summary}</small> : null}</Link>
            <b>{String(index + 1).padStart(2, '0')}</b>
          </li>
        ))}
      </ol>
    </div>
  )
}

function StudioWindow() {
  return (
    <div className='home-studio-view home-scroll-view'>
      <section className='home-studio-tools'>
        <header><span>Utilities</span><h1>常用工具</h1></header>
        <div>{HOME_TOOLS.map(tool => <Link href={tool.href} key={tool.label} rel={tool.href.startsWith('http') ? 'noreferrer' : undefined}><i><LawTechIcon name={tool.icon} size={21} /></i><span><strong>{tool.label}</strong><small>{tool.meta}</small></span><b>↗</b></Link>)}</div>
      </section>
    </div>
  )
}

function AppWindow({ model, home = {}, windowController }) {
  const [active, setActive] = useState('library')
  const [requestedCategory, setRequestedCategory] = useState('')
  const activeApp = HOME_APPS.find(item => item.key === active) || HOME_APPS[0]

  useEffect(() => {
    const onSwitch = event => {
      if (!event?.detail?.app) return
      setActive(event.detail.app)
      setRequestedCategory(event.detail.category || '')
    }
    document.addEventListener('lawtech-home-app', onSwitch)
    return () => document.removeEventListener('lawtech-home-app', onSwitch)
  }, [])

  return (
    <section className={`home-workspace app-${active} ${windowController.className}`} data-system-window-id='home:main' aria-label={activeApp.label}>
      <div className='home-app-window home-app-window-v7'>
        <header className='home-app-titlebar home-app-titlebar-v7' onDoubleClick={windowController.toggleFocus}>
          <SystemWindowControls controller={windowController} />
          <nav className='home-window-switcher' aria-label='首页窗口切换'>
            {HOME_APPS.map(app => (
              <button aria-current={active === app.key ? 'page' : undefined} key={app.key} onClick={() => { setActive(app.key); setRequestedCategory('') }} type='button'>
                <LawTechIcon name={app.icon} size={14} /><span>{app.label}</span>
              </button>
            ))}
          </nav>
          <div className='home-app-actions'><Link href='/search' aria-label='搜索'><LawTechIcon name='search' size={15} /></Link><Link href='/content' aria-label='打开内容库'><LawTechIcon name='expand' size={15} /></Link></div>
        </header>
        <div className='home-app-canvas home-app-canvas-v7'>
          {active === 'library' ? <LibraryWindow model={model} home={home} /> : null}
          {active === 'spaces' ? <SpacesWindow model={model} requestedCategory={requestedCategory} /> : null}
          {active === 'chronicle' ? <ChronicleWindow model={model} /> : null}
          {active === 'studio' ? <StudioWindow /> : null}
        </div>
      </div>
    </section>
  )
}

const READING_STACK_CACHE_KEY = 'lawtech-home-reading-stack-v1'

function shuffleReading(values = []) {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    const value = copy[index]
    copy[index] = copy[target]
    copy[target] = value
  }
  return copy
}

function readingItemKey(item = {}) {
  return String(item.id || item.href || item.title || '')
}

function timedReadingSelection(items = [], count = 5, refreshHours = 6) {
  const pool = items.filter(item => readingItemKey(item))
  const keys = pool.map(readingItemKey)
  const now = Date.now()
  const ttl = Math.max(1, Number(refreshHours) || 6) * 60 * 60 * 1000
  let previous = null
  try {
    previous = JSON.parse(window.localStorage.getItem(READING_STACK_CACHE_KEY) || 'null')
  } catch {
    previous = null
  }

  const validKeys = Array.isArray(previous?.keys)
    ? previous.keys.filter(key => keys.includes(key))
    : []

  if (
    Number(previous?.version || 0) === 2 &&
    Number(previous?.expiresAt || 0) > now &&
    validKeys.length >= Math.min(count, keys.length)
  ) {
    return { keys: validKeys.slice(0, count), expiresAt: previous.expiresAt }
  }

  const keepCount = Math.max(0, Math.min(count - 2, validKeys.length))
  const kept = shuffleReading(validKeys).slice(0, keepCount)
  const replacements = shuffleReading(keys.filter(key => !kept.includes(key)))
  const nextKeys = [...kept, ...replacements].slice(0, Math.min(count, keys.length))
  const record = { version: 2, keys: nextKeys, expiresAt: now + ttl }
  try {
    window.localStorage.setItem(READING_STACK_CACHE_KEY, JSON.stringify(record))
  } catch {}
  return record
}

function readingUsableItem(item = {}) {
  return Boolean(
    item &&
    String(item.href || '').trim() &&
    String(item.title || '').trim()
  )
}

function readingInitial(item = {}) {
  const title = String(item.title || '').trim()
  return title ? title.slice(0, 1) : '§'
}

function ArticleStack({ items = [], settings = {} }) {
  const count = Math.max(3, Math.min(7, Number(settings.count) || 5))
  const refreshHours = Math.max(1, Math.min(48, Number(settings.refreshHours) || 6))
  const sourceKey = useMemo(
    () => items.filter(readingUsableItem).map(readingItemKey).join('|'),
    [items]
  )
  const sourceItems = useMemo(
    () => items.filter(readingUsableItem),
    [sourceKey]
  )
  const [slideIndex, setSlideIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [visibleItems, setVisibleItems] = useState(() => sourceItems.slice(0, count))

  useEffect(() => {
    if (settings.enabled === false || typeof window === 'undefined') return undefined
    let timer = 0

    function refresh() {
      const record = timedReadingSelection(sourceItems, count, refreshHours)
      const byKey = new Map(sourceItems.map(item => [readingItemKey(item), item]))
      const selected = record.keys
        .map(key => byKey.get(key))
        .filter(readingUsableItem)
      const next = selected.length
        ? selected.slice(0, count)
        : sourceItems.slice(0, count)

      setResetting(true)
      setVisibleItems(next)
      setSlideIndex(0)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setResetting(false))
      })

      timer = window.setTimeout(
        refresh,
        Math.max(1000, Number(record.expiresAt || 0) - Date.now() + 50)
      )
    }

    refresh()
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [sourceKey, count, refreshHours, settings.enabled])

  const total = visibleItems.length
  const safeActive = total ? slideIndex % total : 0
  const current = total ? visibleItems[safeActive] : null
  const trackItems = total > 1
    ? [...visibleItems, visibleItems[0]]
    : visibleItems

  useEffect(() => {
    if (paused || total <= 1) return undefined
    const timer = window.setInterval(
      () => setSlideIndex(value => value >= total ? 1 : value + 1),
      5000
    )
    return () => window.clearInterval(timer)
  }, [paused, total])

  function finishSlide(event) {
    if (event.target !== event.currentTarget || total <= 1 || slideIndex !== total) return
    setResetting(true)
    setSlideIndex(0)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setResetting(false))
    })
  }

  if (settings.enabled === false || !current) return null

  return (
    <section
      className='home-smart-stack home-smart-stack-v7'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-label='文章轮播'
    >
      <header>
        <span>{settings.title || 'Reading'}</span>
        <small>{String(safeActive + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</small>
      </header>
      <div className='home-stack-viewport'>
        <div
          className={`home-stack-track-v11 ${resetting ? 'is-resetting' : ''}`}
          onTransitionEnd={finishSlide}
          style={{ '--home-reading-slide': slideIndex }}
        >
          {trackItems.map((item, index) => (
            <Link
              data-quicklook
              data-quicklook-title={item.title}
              data-quicklook-meta={`${item.category || '内容'} · ${formatDate(item.date)}`}
              className='home-stack-card-v6 is-current'
              href={item.href}
              key={`${readingItemKey(item)}:${index === total ? 'loop' : index}`}
              aria-hidden={index !== slideIndex}
              tabIndex={index === slideIndex ? 0 : -1}
            >
              {item.cover ? (
                <ContentCover item={item} />
              ) : (
                <span className='home-stack-fallback-v10' aria-hidden='true'>
                  {readingInitial(item)}
                </span>
              )}
              <span className='home-stack-copy-v10'>
                <small>{item.category || '内容'} · {formatDate(item.date)}</small>
                <strong>{item.title}</strong>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function FocusWidget({ focus }) {
  if (focus?.enabled === false || !focus?.title) return null
  const progress = Math.min(100, Math.max(0, Number(focus.progress) || 0))
  return (
    <Link className={`home-focus-widget home-status-widget tone-${focus.tone || 'mint'}`} href={focus.href || '/desk/writing'}>
      <span className='home-status-emoji' aria-hidden='true'>{focus.emoji || '✍️'}</span>
      <span className='home-status-copy'><small>{focus.eyebrow || '状态'}</small><strong>{focus.title}</strong>{focus.meta ? <em>{focus.meta}</em> : null}</span>
      {progress ? <span className='home-status-progress'><i><b style={{ width: `${progress}%` }} /></i><span>{progress}%</span></span> : null}
    </Link>
  )
}

function QuoteWidget({ settings = {} }) {
  const [quote, setQuote] = useState({ text: LOCAL_QUOTES[0], from: '' })
  const [busy, setBusy] = useState(false)
  const refreshHours = Math.max(1, Math.min(48, Number(settings.refreshHours) || 6))
  const ttl = refreshHours * 60 * 60 * 1000

  function readCachedQuote() {
    if (typeof window === 'undefined') return null
    try {
      const cached = JSON.parse(window.localStorage.getItem('lawtech-home-quote-v1') || 'null')
      if (!cached?.quote?.text) return null
      if (Date.now() - Number(cached.savedAt || 0) > ttl) return null
      return cached.quote
    } catch {
      return null
    }
  }

  function cacheQuote(value) {
    if (typeof window === 'undefined' || !value?.text) return
    try {
      window.localStorage.setItem('lawtech-home-quote-v1', JSON.stringify({ quote: value, savedAt: Date.now() }))
    } catch {}
  }

  async function refresh({ force = false } = {}) {
    if (!force) {
      const cached = readCachedQuote()
      if (cached) {
        setQuote(cached)
        return
      }
    }
    setBusy(true)
    try {
      const response = await fetch('/api/quote', { cache: 'no-store' })
      const data = await response.json()
      if (data?.text) {
        const next = { text: data.text, from: data.from || '' }
        setQuote(next)
        cacheQuote(next)
      }
    } catch {
      setQuote(current => {
        const index = Math.max(0, LOCAL_QUOTES.indexOf(current.text))
        const next = { text: LOCAL_QUOTES[(index + 1) % LOCAL_QUOTES.length], from: '' }
        cacheQuote(next)
        return next
      })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (settings.enabled === false) return undefined
    void refresh()
    const timer = window.setInterval(() => void refresh({ force: true }), ttl)
    return () => window.clearInterval(timer)
  }, [settings.enabled, ttl])

  if (settings.enabled === false) return null
  return (
    <section className='home-quote-widget'>
      <button type='button' onClick={() => refresh({ force: true })} aria-label='换一句' disabled={busy}><LawTechIcon name='spark' size={14} /></button>
      <blockquote>{quote.text}</blockquote>
      {quote.from ? <small>— {quote.from}</small> : null}
    </section>
  )
}

function UtilityWidget({ enabled = true }) {
  if (!enabled) return null
  return (
    <section className='home-utility-widget home-utility-widget-v7'>
      <header><span>Launchpad</span><Link href='/tools'>全部 ↗</Link></header>
      <div>{HOME_TOOLS.map(tool => <Link href={tool.href} key={tool.label} rel={tool.href.startsWith('http') ? 'noreferrer' : undefined} title={tool.meta}><LawTechIcon name={tool.icon} size={17} /><span>{tool.label}</span></Link>)}</div>
    </section>
  )
}

function SignatureWidget({ enabled = true }) {
  if (!enabled) return null
  return <div className='home-signature-widget home-signature-widget-v7' aria-label='Curacao 签名'><DynamicSignature compact loop /></div>
}

export default function HomeDesktop({ model, profile }) {
  const safeModel = useMemo(() => model || buildHomeDesktopModel({}), [model])
  const [liveProfile, setLiveProfile] = useState(profile || {})
  const homeWindow = useSystemWindow({ id: 'home:main', title: '首页', href: '/', kind: 'home' })

  useEffect(() => {
    let cancelled = false
    fetch('/api/site-profile', { credentials: 'same-origin' })
      .then(response => response.json())
      .then(data => {
        if (!cancelled && data?.profile) setLiveProfile(data.profile)
      })
      .catch(() => null)
    return () => { cancelled = true }
  }, [])

  const safeProfile = useMemo(() => normalizeSiteProfile(liveProfile || {}), [liveProfile])
  const home = safeProfile.home || DEFAULT_SITE_PROFILE.home
  const focus = home.status || safeProfile.focus

  return (
    <>
      <Head><title>law-tech.dev</title><meta name='description' content='Curacao 的笔记、写作与工具。' /><meta name='theme-color' content='#e8efec' /></Head>
      <main className='home-desktop-v4 home-desktop-v7'>
        <div className='home-wallpaper-v4 home-wallpaper-v7' aria-hidden='true'><i /><i /><i /></div>
        <PublicHeader active='home' randomItems={safeModel.randomItems} />
        <div className={`home-desktop-grid home-desktop-grid-v7 ${homeWindow.className}`}>
          <AppWindow model={safeModel} home={home} windowController={homeWindow} />
          <aside className='home-widget-column home-widget-column-v7'>
            <ArticleStack items={safeModel.carousel} settings={home.reading} />
            <FocusWidget focus={focus} />
            <QuoteWidget settings={home.quote} />
            <UtilityWidget enabled={home.launchpad?.enabled !== false} />
            <SignatureWidget enabled={home.signature?.enabled !== false} />
          </aside>
        </div>
      </main>
    </>
  )
}

HomeDesktop.layout = 'bare'

export async function getStaticProps() {
  const [publicIndex, profile] = await Promise.all([
    loadPublicContentIndex({ from: 'law-tech-home-round7' }),
    getPublicSiteProfile()
  ])
  return { props: { model: buildHomeDesktopModel(publicIndex), profile }, revalidate: 1800 }
}
