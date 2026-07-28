'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { selectRelevantItems } from '@/lib/domain/schedule-context'
import { cleanDisplayText, tagsFromItem } from '@/lib/domain/metadata'
import { calendarDateInTimeZone, calendarDateLabel, isCalendarDate } from '@/lib/domain/calendarDate'
import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'
import { KnowledgeCaptureLink } from '@/components/knowledge/KnowledgeCaptureLink'
import {
  fetchScheduleItems,
  readScheduleItemsCache,
  writeScheduleItemsCache
} from '@/lib/client/scheduleItemsCache'
const commandPlaceholder = '写下今天要处理的事、阅读材料或提醒。'

const viewTabs = [
  { key: 'today', label: '今天' },
  { key: 'upcoming', label: '接下来' },
  { key: 'all', label: '全部' },
  { key: 'matrix', label: '四象限' }
]

const toneClasses = ['today-leaf', 'today-blue', 'today-honey', 'today-rose', 'today-lilac']
const timeZone = 'Asia/Shanghai'

function normalizedReminder(reminder = {}) {
  if (!reminder || typeof reminder !== 'object') return null
  return {
    enabled: reminder.enabled !== false,
    mode: reminder.mode || (Number(reminder.leadMinutes || 0) > 0 ? 'before' : 'at'),
    channel: reminder.channel || 'wechat',
    remindAt: reminder.remindAt || '',
    leadMinutes: Number.isFinite(Number(reminder.leadMinutes))
      ? Number(reminder.leadMinutes)
      : 0,
    explicitlyRequested: reminder.explicitlyRequested === true
  }
}

function remindersFromItem(item = {}) {
  const trace = item.aiTrace || item.ai_trace || {}
  const raw = Array.isArray(item.reminders) && item.reminders.length
    ? item.reminders
    : Array.isArray(trace.reminders) && trace.reminders.length
      ? trace.reminders
      : item.reminder || trace.reminder
        ? [item.reminder || trace.reminder]
        : []
  return raw.map(normalizedReminder).filter(Boolean)
}

function eventInstant(item = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.date || ''))) return null
  if (!/^\d{2}:\d{2}$/.test(String(item.time || ''))) return null
  const value = new Date(`${item.date}T${item.time}:00+08:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

function reminderInputValue(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value])
  )
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

function inputToReminderIso(value) {
  if (!value) return ''
  const date = new Date(`${value}:00+08:00`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function recalculateReminder(reminder, item) {
  const event = eventInstant(item)
  if (!event || reminder.mode === 'absolute') return reminder
  const lead = reminder.mode === 'before'
    ? Math.max(0, Number(reminder.leadMinutes || 0))
    : 0
  return {
    ...reminder,
    leadMinutes: lead,
    remindAt: new Date(event.getTime() - lead * 60_000).toISOString()
  }
}

function reminderDisplayLabel(reminder = {}) {
  const when = reminderInputValue(reminder.remindAt).replace('T', ' ')
  if (!when) return '提醒时间待设置'
  const lead = Number(reminder.leadMinutes || 0)
  if (reminder.mode === 'before' && lead > 0) {
    const leadText = lead % 1440 === 0
      ? `${lead / 1440}天`
      : lead % 60 === 0
        ? `${lead / 60}小时`
        : `${lead}分钟`
    return `${when} · 提前${leadText}`
  }
  return `${when} · ${reminder.mode === 'absolute' ? '指定时刻' : '到时'}`
}

function makeId() {
  return crypto.randomUUID()
}

function todayIso() {
  return calendarDateInTimeZone(new Date(), timeZone)
}

function isIsoDate(value = '') {
  return isCalendarDate(value)
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
  const section = cleanDisplayText(item.section || item.kind) || '其他'
  const sectionKey = item.sectionKey || sectionKeyFrom(section)
  const contentType = inferContentType(item, section, sectionKey)
  const aiTrace = item.aiTrace || item.ai_trace || {}
  const normalizedReminders = remindersFromItem(item)
  return {
    id: item.id || makeId(sectionKey),
    title: item.title || '未命名事项',
    section,
    sectionKey,
    contentType,
    tone: item.tone || toneFor(sectionKey),
    date: item.date || 'today',
    time: cleanDisplayText(item.time),
    place: cleanDisplayText(item.place),
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
    summary: cleanDisplayText(item.summary),
    note: item.note || '',
    tags: tagsFromItem(item, { limit: 3 }),
    reminder: normalizedReminders[0] || null,
    reminders: normalizedReminders,
    temporal: item.temporal || aiTrace.temporal || null,
    recurrence: item.recurrence || aiTrace.recurrence || null,
    aiTrace
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
    status: data.status || 'ok',
    reason: data.reason || '',
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
  if (isIsoDate(date)) return calendarDateLabel(date, todayIso())
  return '接下来'
}

function groupItems(items = []) {
  return items.reduce((acc, item) => {
    const key = item.sectionKey || 'other'
    acc[key] ||= { label: item.section || '其他', items: [] }
    acc[key].items.push(item)
    return acc
  }, {})
}

function itemHasFixedTime(item) {
  return Boolean(cleanDisplayText(item.time)) || ['today', 'overdue', 'upcoming'].includes(dateKind(item.date))
}

function ItemCard({
  item,
  variant = 'standard',
  expandedId,
  editingId,
  setExpandedId,
  setEditingId,
  updateItem,
  removeItem,
  toggleChild
}) {
  const isExpanded = expandedId === item.id
  const isEditing = editingId === item.id
  const showDetails = isExpanded || isEditing || variant === 'focus'
  const isCompact = variant === 'compact'
  const canComplete = variant !== 'compact'
  const isHistory = variant === 'compact' && item.status === 'done'
  const meta = [
    dateLabel(item.date),
    cleanDisplayText(item.time),
    cleanDisplayText(item.place),
    cleanDisplayText(item.section)
  ].filter(Boolean)
  const tags = tagsFromItem(item, { limit: 3 })
  const reminderLabels = (item.reminders || [])
    .filter(reminder => reminder.enabled !== false)
    .map(reminderDisplayLabel)
  const badges = [
    item.isPinned ? '置顶' : '',
    item.importance === 'important' ? '重要' : '',
    item.urgency === 'urgent' ? '紧急' : ''
  ].filter(Boolean)
  const actionButton = isHistory
      ? {
          label: '恢复',
          onClick: () => updateItem(item.id, { status: 'active' })
        }
      : {
          label: '编辑',
          onClick: () => setEditingId(editingId === item.id ? '' : item.id)
        }
  const hasActions = badges.length > 0 || Boolean(actionButton)

  function commitReminders(nextReminders) {
    const normalized = nextReminders.map(normalizedReminder).filter(Boolean)
    updateItem(item.id, {
      reminders: normalized,
      reminder: normalized[0] || null
    })
  }

  function updateEventField(field, value) {
    const nextItem = { ...item, [field]: value }
    const nextReminders = (item.reminders || []).map(reminder =>
      recalculateReminder(reminder, nextItem)
    )
    const localInstant = /^\d{4}-\d{2}-\d{2}$/.test(String(nextItem.date || '')) &&
      /^\d{2}:\d{2}$/.test(String(nextItem.time || ''))
      ? `${nextItem.date}T${nextItem.time}:00+08:00`
      : ''
    const deadlineOnly = Boolean(item.temporal?.dueAt && !item.temporal?.startsAt)
    const temporal = localInstant
      ? {
          ...(item.temporal || {}),
          ...(deadlineOnly
            ? { dueAt: localInstant }
            : { startsAt: localInstant })
        }
      : null
    updateItem(item.id, {
      [field]: value,
      temporal,
      reminders: nextReminders,
      reminder: nextReminders[0] || null
    })
  }

  function addReminder() {
    const event = eventInstant(item)
    commitReminders([
      ...(item.reminders || []),
      {
        enabled: true,
        mode: 'at',
        channel: 'wechat',
        leadMinutes: 0,
        remindAt: event?.toISOString() || '',
        explicitlyRequested: true
      }
    ])
  }

  function updateReminderAt(index, patch) {
    const next = (item.reminders || []).map((reminder, reminderIndex) => {
      if (reminderIndex !== index) return reminder
      const merged = { ...reminder, ...patch }
      return ['at', 'before'].includes(merged.mode)
        ? recalculateReminder(merged, item)
        : merged
    })
    commitReminders(next)
  }

  function removeReminderAt(index) {
    commitReminders((item.reminders || []).filter((_, reminderIndex) => reminderIndex !== index))
  }

  return (
    <article
      className={`today-card ${variant}-card ${canComplete ? 'has-check' : 'no-check'} ${item.tone || toneFor(item.sectionKey)} ${item.status === 'done' ? 'is-done' : ''}`}
      data-variant={variant}
      data-testid={`today-card-${variant}`}
    >
      {canComplete ? (
        <label className="today-check" aria-label={item.status === 'done' ? '标记为未完成' : '标记为完成'}>
          <input
            type="checkbox"
            checked={item.status === 'done'}
            onChange={() => updateItem(item.id, { status: item.status === 'done' ? 'active' : 'done' })}
          />
          <span />
        </label>
      ) : null}
      <div className="today-card-body" data-testid="today-card-body">
        <div className="today-card-layout" data-testid="today-card-layout">
          <div className="today-card-content" data-testid="today-card-content">
            <div className="today-card-head">
              <button
                className="card-title-button"
                data-testid="today-card-title"
                type="button"
                onClick={() => setExpandedId(expandedId === item.id ? '' : item.id)}
              >
                {item.title}
              </button>
            </div>
            {meta.length || tags.length || reminderLabels.length ? (
              <div className="today-meta" data-testid="today-card-meta">
                {meta.map((value) => (
                  <span key={`${item.id}-${value}`}>{value}</span>
                ))}
                {reminderLabels.map((value, index) => (
                  <span className="today-reminder-meta" key={`${item.id}-reminder-${index}`}>提醒 {value}</span>
                ))}
                {tags.map((tag) => (
                  <span key={`${item.id}-tag-${tag}`}>{tag}</span>
                ))}
              </div>
            ) : null}
            {item.summary && !isCompact ? <p className="card-summary">{item.summary}</p> : null}
            {showDetails && item.children.length ? (
              <div className="mini-list">
                {item.children.map((child) => (
                  <label key={child.id}>
                    <input type="checkbox" checked={child.done} onChange={() => toggleChild(item.id, child.id)} />
                    <span>{child.title}</span>
                  </label>
                ))}
              </div>
            ) : null}
            {item.links.length && !isCompact ? (
              <div className="link-chips">
                {item.links.slice(0, variant === 'focus' ? 3 : item.links.length).map((link) => (
                  <a key={`${variant}-${item.id}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                    {link.title || link.url}
                  </a>
                ))}
              </div>
            ) : null}
            {isEditing ? (
              <div className="item-editor">
                <input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} />
                <div className="editor-grid">
                  <input value={item.section} onChange={(event) => updateItem(item.id, { section: event.target.value })} placeholder="类别" />
                  <input value={item.date} onChange={(event) => updateEventField('date', event.target.value)} placeholder="YYYY-MM-DD / none" />
                  <input value={item.time} onChange={(event) => updateEventField('time', event.target.value)} placeholder="时间" />
                  <input value={item.place} onChange={(event) => updateItem(item.id, { place: event.target.value })} placeholder="地点" />
                  <input value="事项" readOnly aria-label="内容类型" />
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
                <section className="reminder-editor" aria-label="提醒设置">
                  <header>
                    <strong>微信提醒</strong>
                    <button type="button" onClick={addReminder}>添加提醒</button>
                  </header>
                  {(item.reminders || []).length ? (item.reminders || []).map((reminder, index) => (
                    <div className="reminder-row" key={`${item.id}-edit-reminder-${index}`}>
                      <input
                        aria-label={`提醒时间 ${index + 1}`}
                        type="datetime-local"
                        value={reminderInputValue(reminder.remindAt)}
                        onChange={(event) => updateReminderAt(index, {
                          remindAt: inputToReminderIso(event.target.value),
                          mode: 'absolute',
                          leadMinutes: 0
                        })}
                      />
                      <select
                        aria-label={`提醒方式 ${index + 1}`}
                        value={reminder.mode || 'at'}
                        onChange={(event) => {
                          const mode = event.target.value
                          updateReminderAt(index, {
                            mode,
                            leadMinutes: mode === 'before'
                              ? Math.max(1, Number(reminder.leadMinutes || 30))
                              : 0
                          })
                        }}
                      >
                        <option value="at">事项发生时</option>
                        <option value="before">提前提醒</option>
                        <option value="absolute">指定时刻</option>
                      </select>
                      {reminder.mode === 'before' ? (
                        <input
                          aria-label={`提前分钟 ${index + 1}`}
                          min="1"
                          step="5"
                          type="number"
                          value={Number(reminder.leadMinutes || 30)}
                          onChange={(event) => updateReminderAt(index, {
                            leadMinutes: Math.max(1, Number(event.target.value || 1))
                          })}
                        />
                      ) : null}
                      <button type="button" onClick={() => removeReminderAt(index)}>删除提醒</button>
                    </div>
                  )) : <p>尚未设置提醒。</p>}
                </section>
                <textarea value={item.summary} onChange={(event) => updateItem(item.id, { summary: event.target.value })} placeholder="摘要" />
                <textarea value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} placeholder="备注" />
                <button type="button" onClick={() => removeItem(item.id)}>
                  删除
                </button>
              </div>
            ) : null}
          </div>
          {hasActions ? (
            <div className="card-actions" data-testid="today-card-actions">
              {badges.map((badge) => (
                <b key={`${item.id}-${badge}`}>{badge}</b>
              ))}
              {actionButton ? (
                <button type="button" onClick={actionButton.onClick}>
                  {actionButton.label}
                </button>
              ) : null}
              <KnowledgeCaptureLink
                sourceType='today'
                sourceId={item.id}
                sourceTitle={item.title}
                seed={item.summary || item.note || item.title}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function TodayBoard({ initialView = 'today' }) {
  const { loading: sessionLoading, session } = useWorkspaceSession()
  const profileId = session?.profile?.id || session?.actor?.id || ''
  const [command, setCommand] = useState('')
  const [view, setView] = useState(initialView)
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [cloudEnabled, setCloudEnabled] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notice, setNotice] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const deletedIdsRef = useRef([])
  const loadedProfileRef = useRef('')

  useEffect(() => {
    if (sessionLoading || !profileId) return undefined
    let cancelled = false
    loadedProfileRef.current = ''
    setCloudEnabled(false)
    deletedIdsRef.current = []

    const cached = readScheduleItemsCache(profileId)
    if (cached !== null) {
      loadedProfileRef.current = profileId
      setItems(sortItems(normalizeItems(cached)))
      setIsReady(true)
    } else {
      setItems([])
      setIsReady(false)
    }

    setIsRefreshing(true)
    async function loadItems() {
      try {
        const loaded = await fetchScheduleItems(profileId, { force: true })
        if (cancelled) return
        loadedProfileRef.current = profileId
        setItems(sortItems(normalizeItems(loaded)))
        setCloudEnabled(true)
        setNotice('')
        setIsReady(true)
      } catch {
        if (cancelled) return
        loadedProfileRef.current = profileId
        setNotice('云端暂时不可用')
        setIsReady(true)
      } finally {
        if (!cancelled) setIsRefreshing(false)
      }
    }

    loadItems()
    return () => {
      cancelled = true
    }
  }, [profileId, sessionLoading])

  useEffect(() => {
    if (!isReady || !profileId || loadedProfileRef.current !== profileId) return
    writeScheduleItemsCache(profileId, items)
    if (!cloudEnabled) return

    const timer = window.setTimeout(() => {
      void (async () => {
      try {
        const response = await fetch('/api/schedule/items', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items, deletedIds: deletedIdsRef.current })
        })
        if (response.ok) deletedIdsRef.current = []
      } catch {}
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [items, isReady, cloudEnabled, profileId])

  const scheduleItems = useMemo(() => items.filter((item) => !isReadingItem(item)), [items])
  const upcomingStrip = useMemo(
    () => sortItems(scheduleItems).filter((item) => item.status === 'active' && dateKind(item.date) === 'upcoming').slice(0, 3),
    [scheduleItems]
  )
  const focusItems = useMemo(() => {
    return sortItems(scheduleItems)
      .filter((item) => {
        if (item.status !== 'active') return false
        const kind = dateKind(item.date)
        if (!['today', 'overdue'].includes(kind)) return false
        if (item.isPinned) return true
        if (item.importance === 'important' && item.urgency === 'urgent') return true
        if (item.time) return true
        return item.priority === 'high'
      })
      .slice(0, 2)
  }, [scheduleItems])

  const visibleItems = useMemo(() => {
    const sorted = sortItems(scheduleItems)
    if (view === 'all') return sorted
    if (view === 'upcoming') return sorted.filter((item) => item.status === 'active' && dateKind(item.date) === 'upcoming')
    if (view === 'matrix') return sorted.filter((item) => item.status === 'active')
    return sorted.filter(
      (item) => item.status === 'active' && ['today', 'overdue'].includes(dateKind(item.date))
    )
  }, [scheduleItems, view])

  const completedItems = useMemo(() => {
    const sorted = sortItems(scheduleItems).filter((item) => item.status === 'done')
    if (view === 'matrix') return []
    if (view === 'upcoming') return sorted.filter((item) => dateKind(item.date) === 'upcoming')
    if (view === 'all') return sorted
    return sorted.filter((item) => ['today', 'overdue'].includes(dateKind(item.date)))
  }, [scheduleItems, view])

  const focusIds = useMemo(() => new Set(focusItems.map((item) => item.id)), [focusItems])
  const columnGroups = useMemo(() => {
    const withoutFocus = view === 'today' ? visibleItems.filter((item) => !focusIds.has(item.id)) : visibleItems
    const activeItems = withoutFocus.filter((item) => item.status !== 'done')
    const mainItems = activeItems.filter(itemHasFixedTime)
    const sideItems = activeItems.filter((item) => !mainItems.some((mainItem) => mainItem.id === item.id))
    return { main: groupItems(mainItems), side: groupItems(sideItems) }
  }, [focusIds, visibleItems, view])

  const hasMainColumn = Object.keys(columnGroups.main).length > 0
  const hasSideColumn = Object.keys(columnGroups.side).length > 0
  const useSplitColumns = hasMainColumn && hasSideColumn && ['today', 'upcoming', 'all'].includes(view)

  const matrixGroups = useMemo(() => ({
    importantUrgent: visibleItems.filter((item) => item.importance === 'important' && item.urgency === 'urgent'),
    importantNotUrgent: visibleItems.filter((item) => item.importance === 'important' && item.urgency !== 'urgent'),
    urgentNotImportant: visibleItems.filter((item) => item.importance !== 'important' && item.urgency === 'urgent'),
    normal: visibleItems.filter((item) => item.importance !== 'important' && item.urgency !== 'urgent')
  }), [visibleItems])

  async function runCommand() {
    if (isRefreshing) {
      setNotice('正在同步最新数据')
      return
    }
    if (!command.trim()) return
    setIsLoading(true)
    setNotice('')
    try {
      const result = await requestScheduleCommand({ command, items })
      if (result.status === 'ignored' || !result.items.length) {
        setNotice('没有保存')
        return
      }
      if (result.mode === 'replace') {
        const returnedIds = result.items.map((item) => item.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id || ''))
        const context = new Set(returnedIds.length ? returnedIds : result.contextIds)
        setItems(sortItems([...items.filter((item) => !context.has(item.id)), ...result.items]))
      } else {
        setItems(sortItems([...items, ...result.items]))
      }
      setCommand('')
    } catch {
      setNotice('保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  function updateItem(id, patch) {
    if (isRefreshing) {
      setNotice('正在同步最新数据')
      return
    }
    setItems((current) => sortItems(current.map((item) => (item.id === id ? normalizeItem({ ...item, ...patch }) : item))))
  }

  function removeItem(id) {
    if (isRefreshing) {
      setNotice('正在同步最新数据')
      return
    }
    if (/^[0-9a-f-]{36}$/i.test(id)) deletedIdsRef.current = [...new Set([...deletedIdsRef.current, id])]
    setItems((current) => current.filter((item) => item.id !== id))
  }

  function toggleChild(itemId, childId) {
    if (isRefreshing) {
      setNotice('正在同步最新数据')
      return
    }
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

  if (sessionLoading || !profileId || !isReady) {
    return (
      <div className="desk-loading-state" aria-live="polite">
        <i />
        <span>正在读取…</span>
      </div>
    )
  }

  return (
    <div className="today-board">
      <section className="command-bar">
        <textarea value={command} onChange={(event) => setCommand(event.target.value)} placeholder={commandPlaceholder} />
        <button type="button" onClick={() => void runCommand()} disabled={isLoading}>
          {isLoading ? '处理中' : '执行'}
        </button>
      </section>
      {notice ? <div className="today-notice">{notice}</div> : null}

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
            <ItemCard
              key={`focus-${item.id}`}
              item={item}
              variant="focus"
              expandedId={expandedId}
              editingId={editingId}
              setExpandedId={setExpandedId}
              setEditingId={setEditingId}
              updateItem={updateItem}
              removeItem={removeItem}
              toggleChild={toggleChild}
            />
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
                <ItemCard
                  key={`matrix-${item.id}`}
                  item={item}
                  variant="compact"
                  expandedId={expandedId}
                  editingId={editingId}
                  setExpandedId={setExpandedId}
                  setEditingId={setEditingId}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  toggleChild={toggleChild}
                />
              ))}
              {!matrixGroups[key].length ? <p className="lane-empty">暂无</p> : null}
            </div>
          ))}
        </section>
      ) : (
        <section className={`today-lanes ${useSplitColumns ? '' : 'is-single'}`}>
          <div className="today-stack today-stack-main">
            {hasMainColumn ? (
              Object.entries(columnGroups.main).map(([sectionKey, group]) => (
                <div className="today-lane" key={sectionKey}>
                  <div className="today-lane-title">
                    <span>{group.label}</span>
                    <small>{group.items.length}</small>
                  </div>
                  {group.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      variant={item.status === 'done' ? 'completed' : 'standard'}
                      expandedId={expandedId}
                      editingId={editingId}
                      setExpandedId={setExpandedId}
                      setEditingId={setEditingId}
                      updateItem={updateItem}
                      removeItem={removeItem}
                      toggleChild={toggleChild}
                    />
                  ))}
                </div>
              ))
            ) : (
              <div className="lane-empty">没有固定时间事项</div>
            )}
          </div>
          {hasSideColumn ? (
          <div className="today-stack today-stack-side">
            {hasSideColumn ? (
              Object.entries(columnGroups.side).map(([sectionKey, group]) => (
                <div className="today-lane" key={sectionKey}>
                  <div className="today-lane-title">
                    <span>{group.label}</span>
                    <small>{group.items.length}</small>
                  </div>
                  {group.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      variant={item.status === 'done' ? 'completed' : 'standard'}
                      expandedId={expandedId}
                      editingId={editingId}
                      setExpandedId={setExpandedId}
                      setEditingId={setEditingId}
                      updateItem={updateItem}
                      removeItem={removeItem}
                      toggleChild={toggleChild}
                    />
                  ))}
                </div>
              ))
            ) : null}
          </div>
          ) : null}
        </section>
      )}

      {view === 'today' && upcomingStrip.length ? (
        <section className="today-later-list" aria-label="稍后">
          <header>
            <span>稍后</span>
            <button type="button" onClick={() => setView('upcoming')}>查看接下来 →</button>
          </header>
          <div>
            {upcomingStrip.map((item) => (
              <button key={item.id} type="button" onClick={() => { setExpandedId(item.id); setView('upcoming') }}>
                <span>{dateLabel(item.date)}{item.time ? ` · ${item.time}` : ''}</span>
                <strong>{item.title}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {view !== 'matrix' && completedItems.length ? (
        <section className="history-section">
          <button
            className="history-toggle"
            type="button"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted((value) => !value)}
          >
            <span>已完成 {completedItems.length}</span>
            <b>{showCompleted ? '收起' : '展开'}</b>
          </button>
          {showCompleted ? (
            <div className="history-list">
              {completedItems.map((item) => (
                <ItemCard
                  key={`completed-${item.id}`}
                  item={item}
                  variant="compact"
                  expandedId={expandedId}
                  editingId={editingId}
                  setExpandedId={setExpandedId}
                  setEditingId={setEditingId}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  toggleChild={toggleChild}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
