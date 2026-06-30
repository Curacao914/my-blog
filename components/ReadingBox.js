'use client'

import { useEffect, useMemo, useState } from 'react'

import { MarkdownDocument } from '@/components/content/MarkdownDocument'
import {
  READING_ARCHIVE_VIEW,
  buildDefaultFolderDrafts,
  descendantFolderIds,
  effectiveFolderId,
  folderBreadcrumbs,
  folderDraft,
  folderIcon,
  folderName,
  folderParentId,
  folderSystemKey,
  isReadingFolder,
  isReadingItem,
  patchReadingTrace,
  readingBody,
  readingItemTitle,
  readingTrace,
  sortReadingFolders
} from '@/lib/reading/library'
import {
  cleanDisplayText,
  readableSource,
  tagsFromItem
} from '@/lib/domain/metadata'

function dateText(item) {
  if (item.date === 'reading' || item.date === 'none') return ''
  return [cleanDisplayText(item.date), cleanDisplayText(item.time)]
    .filter(Boolean)
    .join(' ')
}

function sourceText(item) {
  const trace = readingTrace(item)
  if (trace.readingKind === 'course-brief') return '课程简报'
  return (
    readableSource(item.source || trace.source || trace.channel) ||
    '手动收录'
  )
}

function tagsFor(item) {
  const trace = readingTrace(item)
  const courseTags = trace.courseName
    ? [trace.courseName, '课程简报']
    : []
  return tagsFromItem(
    {
      ...item,
      tags: [...courseTags, ...(item.tags || [])]
    },
    { limit: 4, omitGenericReading: true }
  )
}

function listMeta(item, statusText) {
  return [dateText(item), sourceText(item), statusText].filter(Boolean)
}

function isUuid(value = '') {
  return /^[0-9a-f-]{36}$/i.test(value)
}

function makeMarkdown(item) {
  const linkLines = (item.links || [])
    .map(link => `- [${link.title || link.url}](${link.url})`)
    .join('\n')
  return [
    `# ${readingItemTitle(item)}`,
    '',
    readingBody(item),
    linkLines ? `\n## 链接\n${linkLines}` : '',
    item.note ? `\n## 摘录与想法\n${item.note}` : '\n## 摘录与想法\n',
    ''
  ]
    .filter(Boolean)
    .join('\n')
}

function browserKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ReadingBox() {
  const [items, setItems] = useState([])
  const [activeFolderId, setActiveFolderId] = useState('')
  const [activeId, setActiveId] = useState('')
  const [drafts, setDrafts] = useState({})
  const [status, setStatus] = useState('')
  const [noteLinks, setNoteLinks] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [showListOnMobile, setShowListOnMobile] = useState(true)
  const [scheduleDate, setScheduleDate] = useState('today')
  const [scheduleTime, setScheduleTime] = useState('')
  const [folderMoveTarget, setFolderMoveTarget] = useState('')
  const [itemMoveTarget, setItemMoveTarget] = useState('')

  async function requestSave(nextItems, deletedIds = []) {
    const response = await fetch('/api/schedule/items', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: nextItems, deletedIds })
    })
    if (!response.ok) throw new Error('save failed')
    const data = await response.json()
    return data.items || nextItems
  }

  function adopt(nextItems) {
    setItems(nextItems)
    setDrafts(current => ({
      ...current,
      ...Object.fromEntries(
        nextItems
          .filter(isReadingItem)
          .map(item => [item.id, current[item.id] ?? item.note ?? ''])
      )
    }))
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const response = await fetch('/api/schedule/items')
      if (!response.ok) return
      const data = await response.json()
      if (cancelled) return
      let loaded = data.items || []
      const defaults = buildDefaultFolderDrafts(loaded)
      if (defaults.length) {
        try {
          loaded = await requestSave([...loaded, ...defaults])
        } catch {}
      }
      if (cancelled) return
      adopt(loaded)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const folders = useMemo(
    () => sortReadingFolders(items.filter(isReadingFolder)),
    [items]
  )
  const readingItems = useMemo(
    () => items.filter(isReadingItem),
    [items]
  )
  const archivedMode = activeFolderId === READING_ARCHIVE_VIEW
  const activeFolder = folders.find(folder => folder.id === activeFolderId) || null
  const breadcrumbs = useMemo(
    () => folderBreadcrumbs(folders, activeFolderId),
    [folders, activeFolderId]
  )

  const visibleFolders = useMemo(() => {
    if (archivedMode) {
      return sortReadingFolders(
        folders.filter(folder => folder.status === 'archived')
      )
    }
    return sortReadingFolders(
      folders.filter(
        folder =>
          folder.status !== 'archived' &&
          folderParentId(folder) === activeFolderId
      )
    )
  }, [folders, activeFolderId, archivedMode])

  const visibleItems = useMemo(() => {
    const filtered = readingItems.filter(item => {
      if (archivedMode) return item.status === 'archived'
      if (item.status === 'archived') return false
      return effectiveFolderId(item, folders) === activeFolderId
    })
    return filtered.sort((left, right) => {
      if (left.status === 'done' && right.status !== 'done') return 1
      if (left.status !== 'done' && right.status === 'done') return -1
      return String(right.updatedAt || right.createdAt || '').localeCompare(
        String(left.updatedAt || left.createdAt || '')
      )
    })
  }, [readingItems, folders, activeFolderId, archivedMode])

  const activeItem =
    visibleItems.find(item => item.id === activeId) ||
    visibleItems[0] ||
    null

  const movableFolders = useMemo(() => {
    if (!activeFolder) return folders.filter(folder => folder.status !== 'archived')
    const descendants = descendantFolderIds(folders, activeFolder.id)
    return folders.filter(
      folder =>
        folder.status !== 'archived' &&
        folder.id !== activeFolder.id &&
        !descendants.has(folder.id)
    )
  }, [folders, activeFolder])

  function countFolderItems(folderId) {
    const ids = descendantFolderIds(folders, folderId)
    ids.add(folderId)
    return readingItems.filter(
      item =>
        item.status !== 'archived' &&
        ids.has(effectiveFolderId(item, folders))
    ).length
  }

  async function persist(
    nextItems,
    deletedIds = [],
    nextStatus = '已保存'
  ) {
    setIsSaving(true)
    setStatus('')
    try {
      const saved = await requestSave(nextItems, deletedIds)
      adopt(saved)
      setStatus(nextStatus)
      return saved
    } catch {
      setStatus('保存失败')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  function patchItem(id, patch) {
    return items.map(item =>
      item.id === id ? { ...item, ...patch } : item
    )
  }

  function patchTrace(id, patch) {
    return items.map(item =>
      item.id === id ? patchReadingTrace(item, patch) : item
    )
  }

  function openFolder(folderId) {
    setActiveFolderId(folderId)
    setActiveId('')
    setShowListOnMobile(true)
    setFolderMoveTarget('')
    setItemMoveTarget('')
  }

  async function createFolder() {
    const value = window.prompt(
      activeFolder ? `在“${folderName(activeFolder)}”中新建文件夹` : '新建阅读文件夹',
      ''
    )
    const title = String(value || '').trim()
    if (!title) return
    await persist(
      [...items, folderDraft(title, activeFolder?.id || '')],
      [],
      '文件夹已创建'
    )
  }

  async function renameFolder(folder) {
    const value = window.prompt('重命名文件夹', folderName(folder))
    const title = String(value || '').trim()
    if (!title || title === folderName(folder)) return
    const next = items.map(item =>
      item.id === folder.id
        ? patchReadingTrace(
            { ...item, title },
            { folderName: title }
          )
        : item
    )
    await persist(next, [], '文件夹已重命名')
  }

  async function moveActiveFolder() {
    if (!activeFolder || !folderMoveTarget) return
    const next = patchTrace(activeFolder.id, {
      parentFolderId:
        folderMoveTarget === '__root__' ? '' : folderMoveTarget
    })
    const saved = await persist(next, [], '文件夹已移动')
    if (saved) openFolder(folderMoveTarget === '__root__' ? '' : folderMoveTarget)
  }

  async function copyFolder(folder) {
    const batchKey = browserKey()
    const descendants = descendantFolderIds(folders, folder.id)
    const sourceIds = new Set([folder.id, ...descendants])
    const sourceFolders = folders.filter(item => sourceIds.has(item.id))
    const copiedFolders = sourceFolders.map(source => ({
      ...folderDraft(
        source.id === folder.id
          ? `${folderName(source)}（副本）`
          : folderName(source),
        ''
      ),
      summary: source.summary || '',
      aiTrace: {
        ...readingTrace(source),
        entityType: 'reading-folder',
        folderName:
          source.id === folder.id
            ? `${folderName(source)}（副本）`
            : folderName(source),
        parentFolderId: '',
        systemKey: '',
        protected: false,
        createdBy: 'copy',
        copyBatchKey: batchKey,
        copiedFromFolderId: source.id,
        sourceParentFolderId: folderParentId(source)
      }
    }))
    const copiedItems = readingItems
      .filter(item => sourceIds.has(effectiveFolderId(item, folders)))
      .map(item => ({
        ...item,
        id: undefined,
        title: `${readingItemTitle(item)}（副本）`,
        status: item.status === 'done' ? 'done' : 'active',
        source: 'reading-library-copy',
        aiTrace: {
          ...readingTrace(item),
          folderId: '',
          copyBatchKey: batchKey,
          copiedFromItemId: item.id,
          sourceFolderId: effectiveFolderId(item, folders)
        }
      }))

    const firstSaved = await persist(
      [...items, ...copiedFolders, ...copiedItems],
      [],
      '正在整理副本'
    )
    if (!firstSaved) return

    const createdFolders = firstSaved.filter(
      item =>
        isReadingFolder(item) &&
        readingTrace(item).copyBatchKey === batchKey
    )
    const folderMap = new Map(
      createdFolders.map(item => [
        readingTrace(item).copiedFromFolderId,
        item.id
      ])
    )
    const second = firstSaved.map(item => {
      const trace = readingTrace(item)
      if (trace.copyBatchKey !== batchKey) return item
      if (isReadingFolder(item)) {
        const sourceParent = trace.sourceParentFolderId
        const parentFolderId = folderMap.get(sourceParent) || (
          trace.copiedFromFolderId === folder.id
            ? folderParentId(folder)
            : ''
        )
        return patchReadingTrace(item, {
          parentFolderId,
          copyBatchKey: undefined,
          sourceParentFolderId: undefined
        })
      }
      return patchReadingTrace(item, {
        folderId: folderMap.get(trace.sourceFolderId) || '',
        copyBatchKey: undefined,
        sourceFolderId: undefined
      })
    })
    await persist(second, [], '文件夹副本已创建')
  }

  async function deleteFolder(folder) {
    const descendants = descendantFolderIds(folders, folder.id)
    const removedIds = new Set([folder.id, ...descendants])
    const parentId = folderParentId(folder)
    const next = items
      .filter(item => !removedIds.has(item.id))
      .map(item => {
        if (!isReadingItem(item)) return item
        const itemFolderId = effectiveFolderId(item, folders)
        if (!removedIds.has(itemFolderId)) return item
        return patchReadingTrace(item, { folderId: parentId })
      })
    const confirmed = window.confirm(
      `删除“${folderName(folder)}”及其子文件夹？其中的文章会移到上一级，不会被删除。`
    )
    if (!confirmed) return
    const saved = await persist(
      next,
      [...removedIds],
      '文件夹已删除，内容已移到上一级'
    )
    if (saved) openFolder(parentId)
  }

  async function archiveFolder(folder, restore = false) {
    const descendants = descendantFolderIds(folders, folder.id)
    const affected = new Set([folder.id, ...descendants])
    const nextStatus = restore ? 'active' : 'archived'
    const next = items.map(item => {
      if (affected.has(item.id)) return { ...item, status: nextStatus }
      if (
        isReadingItem(item) &&
        affected.has(effectiveFolderId(item, folders))
      ) {
        return { ...item, status: nextStatus }
      }
      return item
    })
    const saved = await persist(
      next,
      [],
      restore ? '文件夹已恢复' : '文件夹已归档'
    )
    if (saved) openFolder(restore ? folderParentId(folder) : '')
  }

  async function saveNote(item) {
    const nextItems = patchItem(item.id, {
      note: drafts[item.id] || ''
    })
    const saved = await persist(nextItems)
    if (!saved) return
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scheduleItemId: item.id,
          note: drafts[item.id] || ''
        })
      })
      if (!response.ok) throw new Error('note draft failed')
      const data = await response.json()
      if (data.note?.id) {
        setNoteLinks(current => ({
          ...current,
          [item.id]: data.note.id
        }))
        setStatus(data.existing ? '已存在笔记草稿' : '已生成笔记')
      } else {
        setStatus('笔记草稿已保存')
      }
    } catch {
      setStatus('笔记草稿保存失败')
    }
  }

  async function markDone(item) {
    const nextStatus = item.status === 'done' ? 'active' : 'done'
    await persist(
      patchItem(item.id, { status: nextStatus }),
      [],
      nextStatus === 'done' ? '已标记读完' : '已移回待读'
    )
  }

  async function archiveItem(item, restore = false) {
    await persist(
      patchItem(item.id, { status: restore ? 'active' : 'archived' }),
      [],
      restore ? '已恢复到阅读箱' : '已归档'
    )
  }

  async function moveActiveItem() {
    if (!activeItem || !itemMoveTarget) return
    const saved = await persist(
      patchTrace(activeItem.id, { folderId: itemMoveTarget }),
      [],
      '内容已移动'
    )
    if (saved) setActiveId('')
  }

  async function copyItem(item) {
    const copy = {
      ...item,
      id: undefined,
      title: `${readingItemTitle(item)}（副本）`,
      source: 'reading-library-copy',
      aiTrace: {
        ...readingTrace(item),
        copiedFromItemId: item.id,
        copiedAt: new Date().toISOString()
      }
    }
    await persist([...items, copy], [], '副本已创建')
  }

  async function deleteItem(item) {
    if (!window.confirm(`删除“${readingItemTitle(item)}”？`)) return
    await persist(
      items.filter(current => current.id !== item.id),
      [item.id],
      '阅读内容已删除'
    )
    setActiveId('')
  }

  async function copyMarkdown(item) {
    const markdown = makeMarkdown({
      ...item,
      note: drafts[item.id] || item.note || ''
    })
    await navigator.clipboard.writeText(markdown)
    setStatus('Markdown 已复制')
  }

  async function scheduleReading(item) {
    const action = {
      title: `阅读：${readingItemTitle(item)}`,
      section: '阅读安排',
      sectionKey: 'reading-plan',
      contentType: 'action',
      date: scheduleDate || 'today',
      time: scheduleTime || '',
      status: 'active',
      priority: 'normal',
      importance: 'normal',
      urgency: scheduleDate === 'today' ? 'urgent' : 'not_urgent',
      links: item.links || [],
      summary: item.summary || '',
      source: 'reading-box',
      aiTrace: {
        contentType: 'action',
        linkedReadingId: item.id,
        linkedReadingTitle: readingItemTitle(item),
        source: 'reading-box'
      }
    }
    const saved = await persist([...items, action], [], '已加入日程')
    if (saved) {
      setScheduleDate('today')
      setScheduleTime('')
    }
  }

  const rootTitle = archivedMode
    ? '归档'
    : activeFolder
      ? folderName(activeFolder)
      : '阅读资料库'

  return (
    <div className={`reading-library ${showListOnMobile ? '' : 'show-detail'}`}>
      <header className='reading-library-head'>
        <div>
          <span className='eyebrow'>Reading Library</span>
          <h2>{rootTitle}</h2>
          <p>
            {archivedMode
              ? '归档内容仍可恢复，不占用日常阅读视线。'
              : activeFolder?.summary ||
                '先进入文件夹，再决定今天要读什么。'}
          </p>
        </div>
        <div className='reading-library-head-actions'>
          {!archivedMode ? (
            <button type='button' onClick={createFolder} disabled={isSaving}>
              新建文件夹
            </button>
          ) : null}
          <button
            type='button'
            onClick={() => openFolder(archivedMode ? '' : READING_ARCHIVE_VIEW)}
          >
            {archivedMode ? '返回资料库' : '查看归档'}
          </button>
        </div>
      </header>

      {!archivedMode && breadcrumbs.length ? (
        <nav className='reading-breadcrumbs' aria-label='阅读文件夹路径'>
          <button type='button' onClick={() => openFolder('')}>阅读资料库</button>
          {breadcrumbs.map(folder => (
            <button
              type='button'
              key={folder.id}
              onClick={() => openFolder(folder.id)}
            >
              {folderName(folder)}
            </button>
          ))}
        </nav>
      ) : null}

      {activeFolder && !archivedMode ? (
        <div className='reading-folder-toolbar'>
          <button type='button' onClick={() => renameFolder(activeFolder)}>
            重命名
          </button>
          <button type='button' onClick={() => copyFolder(activeFolder)}>
            复制文件夹
          </button>
          <label>
            <span>移动到</span>
            <select
              value={folderMoveTarget}
              onChange={event => setFolderMoveTarget(event.target.value)}
            >
              <option value=''>选择位置</option>
              <option value='__root__'>阅读资料库</option>
              {movableFolders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folderBreadcrumbs(folders, folder.id)
                    .map(folderName)
                    .join(' / ')}
                </option>
              ))}
            </select>
          </label>
          <button
            type='button'
            disabled={!folderMoveTarget}
            onClick={moveActiveFolder}
          >
            移动
          </button>
          <button type='button' onClick={() => archiveFolder(activeFolder)}>
            归档
          </button>
          {!folderSystemKey(activeFolder) ? (
            <button
              className='is-danger'
              type='button'
              onClick={() => deleteFolder(activeFolder)}
            >
              删除
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleFolders.length ? (
        <section className='reading-folder-strip' aria-label='阅读文件夹'>
          {visibleFolders.map(folder => (
            <article className='reading-folder-card' key={folder.id}>
              <button
                type='button'
                onClick={() => {
                  if (archivedMode) {
                    archiveFolder(folder, true)
                  } else {
                    openFolder(folder.id)
                  }
                }}
              >
                <span className='reading-folder-icon'>
                  {folderIcon(folder)}
                </span>
                <strong>{folderName(folder)}</strong>
                <small>
                  {archivedMode
                    ? '点击恢复'
                    : `${countFolderItems(folder.id)} 篇内容`}
                </small>
                {folder.summary ? <p>{folder.summary}</p> : null}
              </button>
            </article>
          ))}
        </section>
      ) : null}

      {!visibleItems.length && !visibleFolders.length ? (
        <div className='reading-empty'>
          {archivedMode
            ? '归档里还没有内容'
            : activeFolderId
              ? '这个文件夹还是空的'
              : '还没有阅读内容'}
        </div>
      ) : null}

      {visibleItems.length ? (
        <div className='reading-workspace'>
          <aside className='reading-list' aria-label='阅读列表'>
            {visibleItems.map(item => (
              <button
                key={item.id}
                type='button'
                onClick={() => {
                  setActiveId(item.id)
                  setShowListOnMobile(false)
                  setItemMoveTarget(
                    effectiveFolderId(item, folders)
                  )
                }}
                aria-pressed={activeItem?.id === item.id}
              >
                <span className='reading-list-meta'>
                  {listMeta(
                    item,
                    item.status === 'done'
                      ? '已读'
                      : item.status === 'archived'
                        ? '已归档'
                        : '待读'
                  ).map(value => (
                    <span key={`${item.id}-${value}`}>{value}</span>
                  ))}
                </span>
                <strong>{readingItemTitle(item)}</strong>
                {item.summary ? <small>{item.summary}</small> : null}
                {tagsFor(item).length ? (
                  <span className='reading-tags'>
                    {tagsFor(item).map(tag => (
                      <em key={tag}>{tag}</em>
                    ))}
                  </span>
                ) : null}
              </button>
            ))}
          </aside>

          {activeItem ? (
            <article className='reading-panel'>
              <button
                className='reading-back'
                type='button'
                onClick={() => setShowListOnMobile(true)}
              >
                返回列表
              </button>

              <div className='reading-panel-head'>
                <div>
                  <span className='eyebrow'>
                    {listMeta(
                      activeItem,
                      activeItem.status === 'done'
                        ? '已读'
                        : activeItem.status === 'archived'
                          ? '已归档'
                          : '待读'
                    ).join(' · ')}
                  </span>
                  <h2>{readingItemTitle(activeItem)}</h2>
                </div>
                {activeItem.status !== 'archived' ? (
                  <button
                    type='button'
                    onClick={() => markDone(activeItem)}
                    disabled={isSaving}
                  >
                    {activeItem.status === 'done' ? '重新待读' : '读完'}
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => archiveItem(activeItem, true)}
                    disabled={isSaving}
                  >
                    恢复
                  </button>
                )}
              </div>

              {tagsFor(activeItem).length ? (
                <div className='reading-detail-tags'>
                  {tagsFor(activeItem).map(tag => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}

              <MarkdownDocument
                className='reading-markdown'
                markdown={readingBody(activeItem)}
                title={readingItemTitle(activeItem)}
                emptyText='这条阅读内容暂时只有链接和摘要。'
              />

              {activeItem.links?.length ? (
                <div className='reading-links'>
                  {activeItem.links.map(link => (
                    <a
                      key={link.url}
                      href={link.url}
                      target={
                        /^https?:\/\//i.test(link.url || '')
                          ? '_blank'
                          : undefined
                      }
                      rel='noreferrer'
                    >
                      {link.title || link.url}
                    </a>
                  ))}
                </div>
              ) : null}

              <div className='reading-item-manage'>
                <label>
                  <span>所在文件夹</span>
                  <select
                    value={
                      itemMoveTarget ||
                      effectiveFolderId(activeItem, folders)
                    }
                    onChange={event =>
                      setItemMoveTarget(event.target.value)
                    }
                  >
                    {folders
                      .filter(folder => folder.status !== 'archived')
                      .map(folder => (
                        <option key={folder.id} value={folder.id}>
                          {folderBreadcrumbs(folders, folder.id)
                            .map(folderName)
                            .join(' / ')}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type='button'
                  onClick={moveActiveItem}
                  disabled={
                    !itemMoveTarget ||
                    itemMoveTarget ===
                      effectiveFolderId(activeItem, folders)
                  }
                >
                  移动
                </button>
                <button type='button' onClick={() => copyItem(activeItem)}>
                  复制
                </button>
                {activeItem.status !== 'archived' ? (
                  <button
                    type='button'
                    onClick={() => archiveItem(activeItem)}
                  >
                    归档
                  </button>
                ) : null}
                <button
                  className='is-danger'
                  type='button'
                  onClick={() => deleteItem(activeItem)}
                >
                  删除
                </button>
              </div>

              <label className='reading-note'>
                <span>摘录与想法</span>
                <textarea
                  value={
                    drafts[activeItem.id] ??
                    activeItem.note ??
                    ''
                  }
                  onChange={event =>
                    setDrafts(current => ({
                      ...current,
                      [activeItem.id]: event.target.value
                    }))
                  }
                  placeholder='可以粘贴原文片段，也可以写几句自己的判断。'
                />
              </label>

              <div className='reading-schedule-box'>
                <div>
                  <strong>安排阅读</strong>
                  <span>
                    阅读材料仍留在资料库，只在日程中创建一项关联任务。
                  </span>
                </div>
                <label>
                  日期
                  <select
                    value={scheduleDate}
                    onChange={event => setScheduleDate(event.target.value)}
                  >
                    <option value='today'>今天</option>
                    <option value='tomorrow'>明天</option>
                    <option value='none'>暂不定日期</option>
                  </select>
                </label>
                <label>
                  时间
                  <input
                    value={scheduleTime}
                    onChange={event => setScheduleTime(event.target.value)}
                    placeholder='例如 20:00'
                  />
                </label>
                <button
                  type='button'
                  onClick={() => scheduleReading(activeItem)}
                  disabled={isSaving}
                >
                  加入日程
                </button>
              </div>

              <div className='reading-actions'>
                <button
                  type='button'
                  onClick={() => saveNote(activeItem)}
                  disabled={isSaving || !isUuid(activeItem.id)}
                >
                  {isUuid(activeItem.id)
                    ? '存为笔记草稿'
                    : '需要真实来源'}
                </button>
                <button
                  type='button'
                  onClick={() => copyMarkdown(activeItem)}
                >
                  复制 Markdown
                </button>
                {noteLinks[activeItem.id] ? (
                  <a
                    className='reading-note-link'
                    href={`/desk/inbox?noteId=${noteLinks[activeItem.id]}`}
                  >
                    打开笔记
                  </a>
                ) : null}
                {status ? <span>{status}</span> : null}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
