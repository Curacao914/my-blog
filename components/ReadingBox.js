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

  const activeItem = readingItems.find((item) => item.id === activeId) || readingItems[0]

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

  if (!readingItems.length) {
    return <div className="reading-empty">还没有待读内容。</div>
  }

  return (
    <div className="reading-box">
      <aside className="reading-list" aria-label="阅读列表">
        {readingItems.map((item) => (
          <button key={item.id} type="button" onClick={() => setActiveId(item.id)} aria-pressed={activeItem?.id === item.id}>
            <span>{dateText(item)}</span>
            <strong>{item.title}</strong>
            {item.summary ? <small>{item.summary}</small> : null}
          </button>
        ))}
      </aside>

      {activeItem ? (
        <article className={`reading-panel ${activeItem.status === 'done' ? 'is-done' : ''}`}>
          <div className="reading-panel-head">
            <div>
              <span className="eyebrow">{dateText(activeItem)}</span>
              <h2>{activeItem.title}</h2>
            </div>
            <button type="button" onClick={() => markDone(activeItem)} disabled={isSaving}>
              {activeItem.status === 'done' ? '移回待读' : '读完'}
            </button>
          </div>

          {activeItem.summary ? <p className="reading-summary">{activeItem.summary}</p> : null}

          {activeItem.links?.length ? (
            <div className="reading-links">
              {activeItem.links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                  {link.title || link.url}
                </a>
              ))}
            </div>
          ) : null}

          <label className="reading-note">
            <span>摘录与想法</span>
            <textarea
              value={drafts[activeItem.id] ?? activeItem.note ?? ''}
              onChange={(event) => setDrafts((current) => ({ ...current, [activeItem.id]: event.target.value }))}
              placeholder="可以粘贴原文片段，也可以写几句自己的判断。"
            />
          </label>

          <div className="reading-actions">
            <button type="button" onClick={() => saveNote(activeItem)} disabled={isSaving}>
              存为笔记草稿
            </button>
            <button type="button" onClick={() => copyMarkdown(activeItem)}>
              复制 Markdown
            </button>
            {status ? <span>{status}</span> : null}
          </div>
        </article>
      ) : null}
    </div>
  )
}
