'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { selectRelevantItems } from '@/lib/domain/schedule-context'

const storageKey = 'law-tech.schedule.v2'
const exampleCommand = '今天要整理完商法的笔记、学工有一个PPT要做、有几篇微信的文章要读、晚上7点记得和师兄吃饭'

const viewTabs = [
  { key: 'today', label: '今天' },
  { key: 'upcoming', label: '接下来' },
  { key: 'all', label: '全部' },
  { key: 'reading', label: '阅读' },
  { key: 'matrix', label: '四象限' }
]

const toneClasses = ['today-leaf', 'today-blue', 'today-honey', 'today-rose', 'today-lilac']
const timeZone = 'Asia/Shanghai'

function makeId() {
  return crypto.randomUUID()
}

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00+08:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function isIsoDate(value = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function dateKind(date, referenceDate = todayIso()) {
  if (date === 'reading') return 'reading'
  if (date === 'none' || !date) return 'none'
  if (date === 'overdue') return 'overdue'
  if (date === 'today') return 'today'
  if (date === 'tomorrow') return 'upcoming'
  if (date === 'upcoming' || date === 'later') return 'upcoming'
  if (isIsoDate(date)) {
    if (date < referenceDate) return 'overdue'
    if (date === referenceDate) return 'today'
    return 'upcoming'
  }
  return 'none'
}

function hashText(text = '') {
  return [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function toneFor(sectionKey = 'other') {
  return toneClasses[hashText(sectionKey) % toneClasses.length]
}

function sectionKeyFrom(section = '其他') {
  return section
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u4e00-\u9fa5a-z0-9-]/g, '')
}

function splitInput(text) {
  return text
    .split(/[、，,；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function urlsFrom(text) {
  return [...text.matchAll(/https?:\/\/[^\s，。；、]+/g)].map((match) => ({ title: '链接', url: match[0] }))
}

function fallbackSection(text) {
  if (/笔记|课程|商法|刑诉|民法|复习|课/.test(text)) return '学习'
  if (/学工|PPT|汇报|会议|班委|学生|社团/.test(text)) return '学工'
  if (/微信|文章|阅读|读|书|https?:\/\//.test(text)) return '阅读'
  if (/论文|写作|草稿|选题|投稿/.test(text)) return '写作'
  if (/吃饭|师兄|晚上|早上|中午|见|约/.test(text)) return '日常'
  return '其他'
}

function fallbackDate(text) {
  if (/昨天|前天|上周/.test(text)) return 'overdue'
  if (/明天/.test(text)) return 'tomorrow'
  if (/后天|下周|周[一二三四五六日天]|星期[一二三四五六日天]/.test(text)) return 'upcoming'
  if (/今天|今晚|上午|中午|下午|晚上|早上/.test(text)) return 'today'
  return /微信|文章|阅读|读|书|https?:\/\//.test(text) && !/提醒|记得|要|需要|截止|举办|会议|论坛|活动|PPT|学工/.test(text) ? 'reading' : 'today'
}

function fallbackTime(text) {
  const exact = text.match(/(上午|中午|下午|晚上|早上)?\s*([0-9]{1,2})[点:：]([0-9]{1,2})?/)
  if (!exact) return ''
  const prefix = exact[1] || ''
  const hour = exact[2]
  const minute = exact[3] ? `:${exact[3].padStart(2, '0')}` : ':00'
  return `${prefix}${hour}${minute}`
}

function cleanTitle(text) {
  return text
    .replace(/^今天要?/, '')
    .replace(/^明天要?/, '')
    .replace(/^后天要?/, '')
    .replace(/^今晚/, '')
    .replace(/^记得/, '')
    .replace(/有几篇/, '')
    .replace(/要做$/, '')
    .trim()
}

function fallbackParse(text) {
  return splitInput(text).map((chunk) => {
    const section = fallbackSection(chunk)
    const sectionKey = sectionKeyFrom(section)
    const links = urlsFrom(chunk)
    return {
      id: makeId(sectionKey),
      title: cleanTitle(chunk) || '未命名事项',
      section,
      sectionKey,
      contentType: section === '阅读' ? 'reading' : 'action',
      tone: toneFor(sectionKey),
      date: fallbackDate(chunk),
      time: fallbackTime(chunk),
      place: '',
      priority: /重要|必须|截止|ddl|尽快|今天.*完|记得/.test(chunk) ? 'high' : 'normal',
      importance: /重要|必须|优先/.test(chunk) ? 'important' : 'normal',
      urgency: /今天|今晚|明天|截止|ddl|记得/.test(chunk) ? 'urgent' : 'not_urgent',
      isPinned: false,
      prioritySource: 'rule',
      importanceSource: 'rule',
      urgencySource: 'rule',
      status: 'active',
      links,
      children: [],
      summary: links.length || chunk.length > 80 ? chunk.slice(0, 68) : '',
      note: ''
    }
  })
}

function inferContentType(item, section, sectionKey) {
  if (item.contentType === 'reading' || item.content_type === 'reading' || item.aiTrace?.contentType === 'reading') return 'reading'
  if (item.contentType === 'action' || item.content_type === 'action' || item.aiTrace?.contentType === 'action') return 'action'
  if (sectionKey === 'reading' || section === '阅读' || item.date === 'reading') return 'reading'
  return 'action'
}

function isReadingItem(item) {
  return item.contentType === 'reading'
}

function normalizeItem(item) {
  const section = item.section || item.kind || '其他'
  const sectionKey = item.sectionKey || sectionKeyFrom(section)
  const contentType = inferContentType(item, section, sectionKey)
  return {
    id: item.id || makeId(sectionKey),
    title: item.title || '未命名事项',
    section,
    sectionKey,
    contentType,
    tone: item.tone || toneFor(sectionKey),
    date: item.date || 'today',
    time: item.time || '',
    place: item.place || '',
    priority: item.priority || 'normal',
    importance: item.importance || item.aiTrace?.importance || (item.priority === 'high' ? 'important' : 'normal'),
    urgency: item.urgency || item.aiTrace?.urgency || (dateKind(item.date) === 'today' || dateKind(item.date) === 'overdue' ? 'urgent' : 'not_urgent'),
    isPinned: Boolean(item.isPinned || item.aiTrace?.isPinned),
    prioritySource: item.prioritySource || item.aiTrace?.prioritySource || 'ai',
    importanceSource: item.importanceSource || item.aiTrace?.importanceSource || 'ai',
    urgencySource: item.urgencySource || item.aiTrace?.urgencySource || 'ai',
    status: item.status || (item.done ? 'done' : 'active'),
    links: Array.isArray(item.links) ? item.links : [],
    children: Array.isArray(item.children)
      ? item.children.map((child) => ({ id: child.id || makeId('child'), title: child.title || '', done: Boolean(child.done) }))
      : [],
    summary: item.summary || '',
    note: item.note || ''
  }
}

function normalizeItems(items = []) {
  return items.map(normalizeItem)
}

function sortItems(items) {
  const dateScore = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3, later: 4, reading: 5, none: 6 }
  const priorityScore = { high: 0, normal: 1, low: 2 }
  const referenceDate = todayIso()
  return [...items].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (a.status !== 'done' && b.status === 'done') return -1
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    if (a.importance === 'important' && b.importance !== 'important') return -1
    if (a.importance !== 'important' && b.importance === 'important') return 1
    if (a.urgency === 'urgent' && b.urgency !== 'urgent') return -1
    if (a.urgency !== 'urgent' && b.urgency === 'urgent') return 1
    const aKind = dateKind(a.date, referenceDate)
    const bKind = dateKind(b.date, referenceDate)
    if ((dateScore[aKind] ?? 9) !== (dateScore[bKind] ?? 9)) return (dateScore[aKind] ?? 9) - (dateScore[bKind] ?? 9)
    if (isIsoDate(a.date) && isIsoDate(b.date) && a.date !== b.date) return a.date.localeCompare(b.date)
    if ((priorityScore[a.priority] ?? 9) !== (priorityScore[b.priority] ?? 9)) return (priorityScore[a.priority] ?? 9) - (priorityScore[b.priority] ?? 9)
    if (a.time && !b.time) return -1
    if (!a.time && b.time) return 1
    return 0
  })
}

async function requestScheduleCommand({ command, items }) {
  const contextItems = selectRelevantItems(command, items)
  const response = await fetch('/api/schedule/parse', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command, items: contextItems })
  })

  if (!response.ok) throw new Error('schedule command failed')
  const data = await response.json()
  return {
    mode: data.mode === 'replace' ? 'replace' : 'append',
    items: normalizeItems(data.items || []),
    contextIds: contextItems.map((item) => item.id)
  }
}

function dateLabel(date) {
  if (date === 'overdue') return '留到今天'
  if (date === 'today') return '今天'
  if (date === 'tomorrow') return '明天'
  if (date === 'reading') return '待读'
  if (date === 'later') return '以后'
  if (date === 'none') return '未定'
  if (isIsoDate(date)) {
    const today = todayIso()
    if (date < today) return '留到今天'
    if (date === today) return '今天'
    if (date === addDays(today, 1)) return '明天'
    if (date === addDays(today, 2)) return '后天'
    return date
  }
  return '接下来'
}

export function TodayBoard() {
  const [command, setCommand] = useState(exampleCommand)
  const [view, setView] = useState('today')
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [cloudEnabled, setCloudEnabled] = useState(false)
  const deletedIdsRef = useRef([])

  useEffect(() => {
    let cancelled = false
    async function loadItems() {
      try {
        const response = await fetch('/api/schedule/items')
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) {
            const loaded = normalizeItems(data.items || [])
            setItems(loaded.length ? sortItems(loaded) : sortItems(fallbackParse(exampleCommand)))
            setCloudEnabled(true)
            setIsReady(true)
          }
          return
        }
      } catch {}

      const saved = window.localStorage.getItem(storageKey)
      if (!cancelled) {
        setItems(saved ? sortItems(normalizeItems(JSON.parse(saved))) : sortItems(fallbackParse(exampleCommand)))
        setIsReady(true)
      }
    }
    loadItems()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isReady) return
    window.localStorage.setItem(storageKey, JSON.stringify(items))
    if (!cloudEnabled) return

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/schedule/items', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items, deletedIds: deletedIdsRef.current })
        })
        if (response.ok) deletedIdsRef.current = []
      } catch {}
    }, 450)

    return () => window.clearTimeout(timer)
  }, [items, isReady, cloudEnabled])

  const overdueItems = useMemo(() => items.filter((item) => item.status === 'active' && dateKind(item.date) === 'overdue'), [items])
  const upcomingStrip = useMemo(
    () => sortItems(items).filter((item) => item.status === 'active' && dateKind(item.date) === 'upcoming').slice(0, 6),
    [items]
  )
  const focusItems = useMemo(() => {
    return sortItems(items)
      .filter((item) => {
        if (item.status !== 'active') return false
        if (item.isPinned) return true
        if (item.importance === 'important' && item.urgency === 'urgent') return true
        if (['today', 'overdue'].includes(dateKind(item.date)) && item.time) return true
        return item.priority === 'high' && !isReadingItem(item)
      })
      .filter((item) => {
        if (!isReadingItem(item)) return true
        return item.isPinned || ['today', 'overdue'].includes(dateKind(item.date)) || (item.importance === 'important' && item.urgency === 'urgent')
      })
      .slice(0, 2)
  }, [items])

  const visibleItems = useMemo(() => {
    const sorted = sortItems(items)
    if (view === 'all') return sorted
    if (view === 'upcoming') return sorted.filter((item) => item.status === 'active' && dateKind(item.date) === 'upcoming')
    if (view === 'reading') return sorted.filter(isReadingItem)
    if (view === 'matrix') return sorted.filter((item) => item.status === 'active')
    return sorted.filter((item) => item.status === 'active' && ['today', 'overdue'].includes(dateKind(item.date)))
  }, [items, view])

  const grouped = useMemo(() => {
    return visibleItems.reduce((acc, item) => {
      const key = item.sectionKey || 'other'
      acc[key] ||= { label: item.section || '其他', items: [] }
      acc[key].items.push(item)
      return acc
    }, {})
  }, [visibleItems])

  const matrixGroups = useMemo(() => ({
    importantUrgent: visibleItems.filter((item) => item.importance === 'important' && item.urgency === 'urgent'),
    importantNotUrgent: visibleItems.filter((item) => item.importance === 'important' && item.urgency !== 'urgent'),
    urgentNotImportant: visibleItems.filter((item) => item.importance !== 'important' && item.urgency === 'urgent'),
    normal: visibleItems.filter((item) => item.importance !== 'important' && item.urgency !== 'urgent')
  }), [visibleItems])

  async function runCommand() {
    if (!command.trim()) return
    setIsLoading(true)
    try {
      const result = await requestScheduleCommand({ command, items })
      if (result.mode === 'replace') {
        const returnedIds = result.items.map((item) => item.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id || ''))
        const context = new Set(returnedIds.length ? returnedIds : result.contextIds)
        setItems(sortItems([...items.filter((item) => !context.has(item.id)), ...result.items]))
      } else {
        if (!result.items.length) return
        setItems(sortItems([...items, ...result.items]))
      }
      setCommand('')
    } catch {
      setItems(sortItems([...items, ...fallbackParse(command)]))
      setCommand('')
    } finally {
      setIsLoading(false)
    }
  }

  function updateItem(id, patch) {
    setItems((current) => sortItems(current.map((item) => (item.id === id ? normalizeItem({ ...item, ...patch }) : item))))
  }

  function removeItem(id) {
    if (/^[0-9a-f-]{36}$/i.test(id)) deletedIdsRef.current = [...new Set([...deletedIdsRef.current, id])]
    setItems((current) => current.filter((item) => item.id !== id))
  }

  function toggleChild(itemId, childId) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              children: item.children.map((child) => (child.id === childId ? { ...child, done: !child.done } : child))
            }
          : item
      )
    )
  }

  return (
    <div className="today-board">
      <section className="command-bar">
        <textarea value={command} onChange={(event) => setCommand(event.target.value)} />
        <button type="button" onClick={runCommand} disabled={isLoading}>
          {isLoading ? '处理中' : '执行'}
        </button>
      </section>

      <nav className="view-tabs" aria-label="日程视图">
        {viewTabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setView(tab.key)} aria-pressed={view === tab.key}>
            {tab.label}
          </button>
        ))}
      </nav>

      {view === 'today' && focusItems.length ? (
        <section className={`focus-strip focus-count-${focusItems.length}`}>
          {focusItems.map((item) => (
            <article className={`today-card focus-card ${item.tone || toneFor(item.sectionKey)}`} key={`focus-${item.id}`}>
              <div className="today-card-body">
                <div className="today-card-head">
                  <button className="card-title-button" type="button" onClick={() => setExpandedId(expandedId === item.id ? '' : item.id)}>
                    {item.title}
                  </button>
                  <div className="card-actions">
                    {item.isPinned ? <b>置顶</b> : null}
                    {item.importance === 'important' ? <b>重要</b> : null}
                    {item.urgency === 'urgent' ? <b>紧急</b> : null}
                  </div>
                </div>
                <div className="today-meta">
                  <span>{dateLabel(item.date)}</span>
                  {item.time ? <span>{item.time}</span> : null}
                  {item.place ? <span>{item.place}</span> : null}
                  <span>{item.section}</span>
                </div>
                {item.summary ? <p className="card-summary">{item.summary}</p> : null}
                {item.children.length && expandedId === item.id ? (
                  <div className="mini-list">
                    {item.children.map((child) => (
                      <label key={child.id}>
                        <input type="checkbox" checked={child.done} onChange={() => toggleChild(item.id, child.id)} />
                        <span>{child.title}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
                {item.links.length ? (
                  <div className="link-chips">
                    {item.links.slice(0, 3).map((link) => (
                      <a key={`focus-${item.id}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                        {link.title || link.url}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {view === 'today' && overdueItems.length ? (
        <section className="carry-strip">
          {overdueItems.map((item) => (
            <button key={item.id} type="button" onClick={() => setExpandedId(expandedId === item.id ? '' : item.id)}>
              {item.title}
            </button>
          ))}
        </section>
      ) : null}

      {view === 'matrix' ? (
        <section className="matrix-board">
          {[
            ['importantUrgent', '重要且紧急'],
            ['importantNotUrgent', '重要不紧急'],
            ['urgentNotImportant', '紧急不重要'],
            ['normal', '不重要不紧急']
          ].map(([key, label]) => (
            <div className="matrix-lane" key={key}>
              <div className="today-lane-title">
                <span>{label}</span>
                <small>{matrixGroups[key].length}</small>
              </div>
              {matrixGroups[key].map((item) => (
                <article className={`today-card compact-card ${item.tone || toneFor(item.sectionKey)} ${item.status === 'done' ? 'is-done' : ''}`} key={`matrix-${item.id}`}>
                  <div className="today-card-body">
                    <div className="today-card-head">
                      <button className="card-title-button" type="button" onClick={() => setEditingId(editingId === item.id ? '' : item.id)}>
                        {item.title}
                      </button>
                    </div>
                    <div className="today-meta">
                      <span>{dateLabel(item.date)}</span>
                      {item.time ? <span>{item.time}</span> : null}
                      <span>{item.section}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </section>
      ) : (
      <section className="today-lanes">
        {Object.entries(grouped).map(([sectionKey, group]) => (
          <div className="today-lane" key={sectionKey}>
            <div className="today-lane-title">
              <span>{group.label}</span>
              <small>{group.items.length}</small>
            </div>
            {group.items.map((item) => (
              <article className={`today-card ${item.tone || toneFor(item.sectionKey)} ${item.status === 'done' ? 'is-done' : ''}`} key={item.id}>
                <label className="today-check">
                  <input
                    type="checkbox"
                    checked={item.status === 'done'}
                    onChange={() => updateItem(item.id, { status: item.status === 'done' ? 'active' : 'done' })}
                  />
                  <span />
                </label>
                <div className="today-card-body">
                  <div className="today-card-head">
                    <button className="card-title-button" type="button" onClick={() => setExpandedId(expandedId === item.id ? '' : item.id)}>
                      {item.title}
                    </button>
                    <div className="card-actions">
                      {item.isPinned ? <b>置顶</b> : null}
                      {item.importance === 'important' ? <b>重要</b> : null}
                      {item.urgency === 'urgent' ? <b>紧急</b> : null}
                      <button type="button" onClick={() => setEditingId(editingId === item.id ? '' : item.id)}>
                        编辑
                      </button>
                    </div>
                  </div>
                  <div className="today-meta">
                    <span>{dateLabel(item.date)}</span>
                    {item.time ? <span>{item.time}</span> : null}
                    {item.place ? <span>{item.place}</span> : null}
                    <span>{item.section}</span>
                  </div>
                  {item.summary ? <p className="card-summary">{item.summary}</p> : null}
                  {(expandedId === item.id || editingId === item.id) && item.children.length ? (
                    <div className="mini-list">
                      {item.children.map((child) => (
                        <label key={child.id}>
                          <input type="checkbox" checked={child.done} onChange={() => toggleChild(item.id, child.id)} />
                          <span>{child.title}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {item.links.length ? (
                    <div className="link-chips">
                      {item.links.map((link) => (
                        <a key={`${item.id}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                          {link.title || link.url}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {editingId === item.id ? (
                    <div className="item-editor">
                      <input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} />
                      <div className="editor-grid">
                        <input value={item.section} onChange={(event) => updateItem(item.id, { section: event.target.value })} placeholder="类别" />
                        <input value={item.date} onChange={(event) => updateItem(item.id, { date: event.target.value })} placeholder="YYYY-MM-DD / reading / none" />
                        <input value={item.time} onChange={(event) => updateItem(item.id, { time: event.target.value })} placeholder="时间" />
                        <input value={item.place} onChange={(event) => updateItem(item.id, { place: event.target.value })} placeholder="地点" />
                        <select value={item.contentType} onChange={(event) => updateItem(item.id, { contentType: event.target.value })}>
                          <option value="action">事项</option>
                          <option value="reading">阅读</option>
                        </select>
                        <select value={item.priority} onChange={(event) => updateItem(item.id, { priority: event.target.value })}>
                          <option value="high">重要</option>
                          <option value="normal">普通</option>
                          <option value="low">轻量</option>
                        </select>
                        <select value={item.importance} onChange={(event) => updateItem(item.id, { importance: event.target.value, importanceSource: 'user' })}>
                          <option value="important">重要</option>
                          <option value="normal">普通</option>
                        </select>
                        <select value={item.urgency} onChange={(event) => updateItem(item.id, { urgency: event.target.value, urgencySource: 'user' })}>
                          <option value="urgent">紧急</option>
                          <option value="not_urgent">不紧急</option>
                        </select>
                        <select value={item.isPinned ? 'yes' : 'no'} onChange={(event) => updateItem(item.id, { isPinned: event.target.value === 'yes' })}>
                          <option value="no">不置顶</option>
                          <option value="yes">置顶</option>
                        </select>
                        <select value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value })}>
                          <option value="active">进行中</option>
                          <option value="done">完成</option>
                          <option value="cancelled">取消</option>
                        </select>
                      </div>
                      <textarea value={item.summary} onChange={(event) => updateItem(item.id, { summary: event.target.value })} placeholder="摘要" />
                      <textarea value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} placeholder="备注" />
                      <button type="button" onClick={() => removeItem(item.id)}>
                        删除
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ))}
      </section>
      )}

      {view === 'today' && upcomingStrip.length ? (
        <section className="upcoming-strip">
          {upcomingStrip.map((item) => (
            <button key={item.id} type="button" onClick={() => setExpandedId(expandedId === item.id ? '' : item.id)}>
              <span>{dateLabel(item.date)}</span>
              {item.time ? <span>{item.time}</span> : null}
              <strong>{item.title}</strong>
            </button>
          ))}
        </section>
      ) : null}
    </div>
  )
}
