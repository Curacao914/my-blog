'use client'

import { useEffect, useMemo, useState } from 'react'

function isReadingItem(item) {
  return item.contentType === 'reading' || item.aiTrace?.contentType === 'reading' || item.section === '阅读' || item.sectionKey === 'reading' || item.date === 'reading'
}

function dateText(item) {
  if (item.date === 'reading') return '待读'
  if (item.date === 'none') return '未定'
  return [item.date, item.time].filter(Boolean).join(' ')
}

function sourceText(item) {
  const source = item.source || item.aiTrace?.source || item.aiTrace?.channel || ''
  if (!source) return '手动收录'
  if (source === 'wechat') return '微信'
  if (source === 'web') return '网页'
  return source
}

function tagsFor(item) {
  const tags = item.tags || item.aiTrace?.tags || item.aiTrace?.labels || []
  if (Array.isArray(tags)) return tags.filter(Boolean).slice(0, 4)
  return []
}

function isUuid(value = '') {
  return /^[0-9a-f-]{36}$/i.test(value)
}

function makeMarkdown(item) {
  const linkLines = (item.links || []).map((link) => `- [${link.title || link.url}](${link.url})`).join('\n')
  return [
    `# ${item.title || '未命名阅读'}`,
    '',
    item.summary ? `> ${item.summary}` : '',
    linkLines ? `\n## 链接\n${linkLines}` : '',
    item.note ? `\n## 摘录与想法\n${item.note}` : '\n## 摘录与想法\n',
    ''
  ].filter(Boolean).join('\n')
}

export function ReadingBox() {
  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState('')
  const [drafts, setDrafts] = useState({})
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showListOnMobile, setShowListOnMobile] = useState(true)
  const [showReadItems, setShowReadItems] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const response = await fetch('/api/schedule/items')
      if (!response.ok) return
      const data = await response.json()
      if (cancelled) return
      const loaded = data.items || []
      setItems(loaded)
      setDrafts(Object.fromEntries(loaded.map((item) => [item.id, item.note || ''])))
      const firstReading = loaded.find(isReadingItem)
      if (firstReading) setActiveId(firstReading.id)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const readingItems = useMemo(() => {
    return items
      .filter(isReadingItem)
      .sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1
        if (a.status !== 'done' && b.status === 'done') return -1
        return (b.date || '').localeCompare(a.date || '')
      })
  }, [items])

  const activeReadingItems = useMemo(() => readingItems.filter((item) => item.status !== 'done'), [readingItems])
  const readItems = useMemo(() => readingItems.filter((item) => item.status === 'done'), [readingItems])
  const activeItem = activeReadingItems.find((item) => item.id === activeId) || activeReadingItems[0]

  async function persist(nextItems, nextStatus = '已保存') {
    setIsSaving(true)
    setStatus('')
    try {
      const response = await fetch('/api/schedule/items', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: nextItems, deletedIds: [] })
      })
      if (!response.ok) throw new Error('save failed')
      const data = await response.json()
      setItems(data.items || nextItems)
      setStatus(nextStatus)
    } catch {
      setStatus('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  function patchItem(id, patch) {
    return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
  }

  async function saveNote(item) {
    const nextItems = patchItem(item.id, { note: drafts[item.id] || '' })
    await persist(nextItems)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scheduleItemId: item.id, note: drafts[item.id] || '' })
      })
      if (!response.ok) throw new Error('note draft failed')
      setStatus('已存为笔记草稿')
    } catch {
      setStatus('卡片已保存，笔记表未就绪')
    }
  }

  async function markDone(item) {
    const nextStatus = item.status === 'done' ? 'active' : 'done'
    await persist(patchItem(item.id, { status: nextStatus }), nextStatus === 'done' ? '已标记读完' : '已移回待读')
  }

  async function copyMarkdown(item) {
    const markdown = makeMarkdown({ ...item, note: drafts[item.id] || item.note || '' })
    await navigator.clipboard.writeText(markdown)
    setStatus('Markdown 已复制')
  }

  return (
    <div className={`reading-box ${showListOnMobile ? '' : 'show-detail'}`}>
      <div className="reading-workspace">
        {activeReadingItems.length ? (
          <>
            <aside className="reading-list" aria-label="阅读列表">
              {activeReadingItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveId(item.id)
                    setShowListOnMobile(false)
                  }}
                  aria-pressed={activeItem?.id === item.id}
                >
                  <span className="reading-list-meta">
                    <span>{dateText(item)}</span>
                    <span>{sourceText(item)}</span>
                    <span>待读</span>
                  </span>
                  <strong>{item.title}</strong>
                  {item.summary ? <small>{item.summary}</small> : null}
                  {tagsFor(item).length ? (
                    <span className="reading-tags">
                      {tagsFor(item).map((tag) => (
                        <em key={tag}>{tag}</em>
                      ))}
                    </span>
                  ) : null}
                </button>
              ))}
            </aside>

            {activeItem ? (
              <article className="reading-panel">
                <button className="reading-back" type="button" onClick={() => setShowListOnMobile(true)}>
                  返回列表
                </button>
                <div className="reading-panel-head">
                  <div>
                    <span className="eyebrow">{[dateText(activeItem), sourceText(activeItem), '待读'].join(' · ')}</span>
                    <h2>{activeItem.title}</h2>
                  </div>
                  <button type="button" onClick={() => markDone(activeItem)} disabled={isSaving}>
                    读完
                  </button>
                </div>

                {activeItem.summary ? <p className="reading-summary">{activeItem.summary}</p> : null}

                {tagsFor(activeItem).length ? (
                  <div className="reading-detail-tags">
                    {tagsFor(activeItem).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}

                {activeItem.links?.length ? (
                  <div className="reading-links">
                    {activeItem.links.map((link) => (
                      <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                        {link.title || link.url}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="reading-no-link">没有原文链接</p>
                )}

                <label className="reading-note">
                  <span>摘录与想法</span>
                  <textarea
                    value={drafts[activeItem.id] ?? activeItem.note ?? ''}
                    onChange={(event) => setDrafts((current) => ({ ...current, [activeItem.id]: event.target.value }))}
                    placeholder="可以粘贴原文片段，也可以写几句自己的判断。"
                  />
                </label>

                <div className="reading-actions">
                  <button type="button" onClick={() => saveNote(activeItem)} disabled={isSaving || !isUuid(activeItem.id)}>
                    {isUuid(activeItem.id) ? '存为笔记草稿' : '草稿后续接入'}
                  </button>
                  <button type="button" onClick={() => copyMarkdown(activeItem)}>
                    复制 Markdown
                  </button>
                  {status ? <span>{status}</span> : null}
                </div>
              </article>
            ) : null}
          </>
        ) : (
          <div className="reading-empty">还没有待读内容</div>
        )}
      </div>

      {readItems.length ? (
        <section className="history-section reading-history">
          <button
            className="history-toggle"
            type="button"
            aria-expanded={showReadItems}
            onClick={() => setShowReadItems((value) => !value)}
          >
            <span>已读 {readItems.length}</span>
            <b>{showReadItems ? '收起' : '展开'}</b>
          </button>
          {showReadItems ? (
            <div className="reading-history-list">
              {readItems.map((item) => (
                <article className="reading-history-item" key={item.id}>
                  <div>
                    <span className="reading-list-meta">
                      <span>{dateText(item)}</span>
                      <span>{sourceText(item)}</span>
                    </span>
                    <strong>{item.title}</strong>
                    {tagsFor(item).length ? (
                      <span className="reading-tags">
                        {tagsFor(item).map((tag) => (
                          <em key={tag}>{tag}</em>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => markDone(item)} disabled={isSaving}>
                    移回待读
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
