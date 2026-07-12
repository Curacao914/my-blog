'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { MarkdownDocument } from '@/components/content/MarkdownDocument'
import { ReadingLibraryDialog } from '@/components/ReadingLibraryDialog'
import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'
// LAWTECH_READING_BOX_PATCH_20260712
import {
  clearScheduleItemsCache,
  writeScheduleItemsCache
} from '@/lib/client/scheduleItemsCache'
import {
  fetchReadingItems,
  readReadingItemsCache,
  writeReadingItemsCache
} from '@/lib/client/readingItemsCache'
import {
  createReadingEntityId,
  prepareReadingLibraryItems
} from '@/lib/reading/prepare'
import { buildReadingMutation } from '@/lib/reading/mutations'
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
  migrateLegacyReadingItems,
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

function isUuid(value = '') {
  return /^[0-9a-f-]{36}$/i.test(value)
}

function dateText(item) {
  if (item.date === 'reading' || item.date === 'none') return ''
  return [cleanDisplayText(item.date), cleanDisplayText(item.time)]
    .filter(Boolean)
    .join(' ')
}

function sourceText(item) {
  const trace = readingTrace(item)
  if (trace.readingKind === 'course-brief') return '课程简报'
  return readableSource(item.source || trace.source || trace.channel) || '手动收录'
}

function tagsFor(item) {
  const trace = readingTrace(item)
  return tagsFromItem({
    ...item,
    tags: [
      ...(trace.courseName ? [trace.courseName, '课程简报'] : []),
      ...(item.tags || [])
    ]
  }, { limit: 4, omitGenericReading: true })
}

function itemMeta(item) {
  return [
    dateText(item),
    sourceText(item),
    item.status === 'done' ? '已读' : '待读'
  ].filter(Boolean)
}

function makeMarkdown(item, note = '') {
  const links = (item.links || [])
    .map(link => `- [${link.title || link.url}](${link.url})`)
    .join('\n')
  return [
    `# ${readingItemTitle(item)}`,
    '',
    readingBody(item),
    links ? `\n## 链接\n${links}` : '',
    `\n## 摘录与想法\n${note || item.note || ''}`
  ].filter(Boolean).join('\n')
}

function ActionMenu({ open, onToggle, children, label = '更多操作' }) {
  return (
    <div className='reading-action-menu'>
      <button
        className='reading-more-button'
        type='button'
        aria-label={label}
        aria-expanded={open}
        onClick={event => {
          event.stopPropagation()
          onToggle()
        }}
      >
        <span aria-hidden='true'>•••</span>
      </button>
      {open ? (
        <div className='reading-action-popover' onClick={event => event.stopPropagation()}>
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function ReadingBox() {
  const [items, setItems] = useState([])
  const [activeFolderId, setActiveFolderId] = useState('')
  const [activeId, setActiveId] = useState('')
  const [drafts, setDrafts] = useState({})
  const [status, setStatus] = useState('')
  const [noteLinks, setNoteLinks] = useState({})
  const [busy, setBusy] = useState(false)
  const [menuKey, setMenuKey] = useState('')
  const [dialog, setDialog] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [scheduleDate, setScheduleDate] = useState('today')
  const [scheduleTime, setScheduleTime] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [loadMessage, setLoadMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const rootRef = useRef(null)
  const mutationVersionRef = useRef(0)
  const { loading: sessionLoading, session } = useWorkspaceSession()
  const profileId = session?.profile?.id || session?.actor?.id || ''

  async function requestMutation({ upserts = [], deletedIds = [] } = {}) {
    const response = await fetch('/api/reading/items', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ upserts, deletedIds })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '保存失败')
    if (!Array.isArray(payload.items)) throw new Error('阅读资料响应格式异常')
    const saved = payload.items
    if (profileId) {
      writeReadingItemsCache(profileId, saved)
      clearScheduleItemsCache(profileId)
    }
    return saved
  }

  function adopt(nextItems) {
    const normalized = Array.isArray(nextItems) ? nextItems : []
    setItems(normalized)
    if (profileId) writeReadingItemsCache(profileId, normalized)
    setDrafts(current => ({
      ...current,
      ...Object.fromEntries(
        normalized.filter(isReadingItem).map(item => [
          item.id,
          current[item.id] ?? item.note ?? ''
        ])
      )
    }))
  }

  useEffect(() => {
    if (sessionLoading || !profileId) return undefined
    let cancelled = false
    const cached = readReadingItemsCache(profileId)

    if (cached !== null) {
      const prepared = prepareReadingLibraryItems(cached)
      adopt(prepared.items)
      setLoadState('ready')
    } else {
      setLoadState('loading')
    }
    setLoadMessage('')

    setIsRefreshing(true)
    async function load() {
      try {
        const loadVersion = mutationVersionRef.current
        const cloudItems = await fetchReadingItems(profileId, { force: true })
        if (cancelled || mutationVersionRef.current !== loadVersion) return

        const prepared = prepareReadingLibraryItems(cloudItems)
        adopt(prepared.items)
        setLoadState('ready')

        if (prepared.changed) {
          try {
            const mutation = buildReadingMutation(cloudItems, prepared.items)
            const saved = await requestMutation(mutation)
            if (!cancelled && mutationVersionRef.current === loadVersion) adopt(saved)
          } catch {
            if (!cancelled) setStatus('整理状态将在下次保存时同步')
          }
        }
      } catch (error) {
        if (cancelled) return
        if (cached !== null) {
          setStatus('云端暂时不可用，显示最近内容')
          return
        }
        setLoadMessage(error instanceof Error ? error.message : '阅读资料读取失败')
        setLoadState('error')
      } finally {
        if (!cancelled) setIsRefreshing(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [profileId, sessionLoading])

  useEffect(() => {
    function closeMenu(event) {
      if (!rootRef.current?.contains(event.target)) return
      if (!event.target.closest('.reading-action-menu')) setMenuKey('')
    }
    function escape(event) {
      if (event.key === 'Escape') setMenuKey('')
    }
    document.addEventListener('click', closeMenu)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('click', closeMenu)
      document.removeEventListener('keydown', escape)
    }
  }, [])

  const folders = useMemo(
    () => sortReadingFolders(items.filter(isReadingFolder)),
    [items]
  )
  const readingItems = useMemo(() => items.filter(isReadingItem), [items])
  const archivedMode = activeFolderId === READING_ARCHIVE_VIEW
  const activeFolder = folders.find(folder => folder.id === activeFolderId) || null
  const activeItem = readingItems.find(item => item.id === activeId) || null
  const breadcrumbs = useMemo(
    () => folderBreadcrumbs(folders, activeFolderId),
    [folders, activeFolderId]
  )

  const visibleFolders = useMemo(() => {
    if (archivedMode) {
      return sortReadingFolders(folders.filter(folder => folder.status === 'archived'))
    }
    return sortReadingFolders(folders.filter(folder =>
      folder.status !== 'archived' &&
      folderParentId(folder) === activeFolderId
    ))
  }, [folders, activeFolderId, archivedMode])

  const visibleItems = useMemo(() => {
    if (!archivedMode && !activeFolderId) return []
    return readingItems
      .filter(item => {
        if (archivedMode) return item.status === 'archived'
        if (item.status === 'archived') return false
        return effectiveFolderId(item, folders) === activeFolderId
      })
      .sort((left, right) => {
        if (left.status === 'done' && right.status !== 'done') return 1
        if (left.status !== 'done' && right.status === 'done') return -1
        return String(right.updatedAt || right.createdAt || '').localeCompare(
          String(left.updatedAt || left.createdAt || '')
        )
      })
  }, [readingItems, folders, activeFolderId, archivedMode])

  const selectedItems = useMemo(() => {
    const selected = new Set(selectedIds)
    return readingItems.filter(item => selected.has(item.id))
  }, [readingItems, selectedIds])

  useEffect(() => {
    const available = new Set(readingItems.map(item => item.id))
    setSelectedIds(current => current.filter(id => available.has(id)))
  }, [readingItems])

  const folderDestinations = useMemo(() => {
    const targetFolder = dialog?.target && isReadingFolder(dialog.target)
      ? dialog.target
      : null
    const excluded = targetFolder
      ? new Set([targetFolder.id, ...descendantFolderIds(folders, targetFolder.id)])
      : new Set()
    return [
      { value: '__root__', label: '阅读资料库' },
      ...folders
        .filter(folder => folder.status !== 'archived' && !excluded.has(folder.id))
        .map(folder => ({
          value: folder.id,
          label: folderBreadcrumbs(folders, folder.id).map(folderName).join(' / ')
        }))
    ]
  }, [folders, dialog])

  async function persist(nextItems, deletedIds = [], message = '已保存') {
    const previousItems = items
    const mutation = buildReadingMutation(previousItems, nextItems, deletedIds)
    mutationVersionRef.current += 1
    setBusy(true)
    setStatus('')
    adopt(nextItems)

    try {
      if (!mutation.upserts.length && !mutation.deletedIds.length) {
        setStatus(message)
        return nextItems
      }
      const saved = await requestMutation(mutation)
      adopt(saved)
      setStatus(message)
      return saved
    } catch (error) {
      adopt(previousItems)
      setStatus(error instanceof Error ? error.message : '保存失败，已恢复原状态')
      return null
    } finally {
      setBusy(false)
    }
  }

  function patchItem(id, patch) {
    return items.map(item => item.id === id ? { ...item, ...patch } : item)
  }

  function patchTrace(id, patch) {
    return items.map(item =>
      item.id === id ? patchReadingTrace(item, patch) : item
    )
  }

  function toggleSelected(id) {
    setSelectedIds(current =>
      current.includes(id)
        ? current.filter(itemId => itemId !== id)
        : [...current, id]
    )
  }

  function selectAllVisible() {
    const ids = visibleItems.map(item => item.id)
    setSelectedIds(current =>
      ids.every(id => current.includes(id))
        ? current.filter(id => !ids.includes(id))
        : [...new Set([...current, ...ids])]
    )
  }

  function clearSelection() {
    setSelectedIds([])
  }

  function askMoveSelected() {
    if (!selectedItems.length) return
    setDialog({
      type: 'move-items',
      title: `移动 ${selectedItems.length} 篇阅读内容`,
      description: '所选内容会一起移动；完成后仍停留在当前文件夹。',
      targets: selectedItems,
      destination: activeFolderId || '__root__'
    })
  }

  function askDeleteSelected() {
    if (!selectedItems.length) return
    setDialog({
      type: 'delete-items',
      title: `删除 ${selectedItems.length} 篇阅读内容`,
      description: '这会删除所选阅读条目；已经另存为笔记的内容不会被删除。',
      targets: selectedItems,
      danger: true
    })
  }

  async function markSelectedDone() {
    if (!selectedItems.length) return
    const restore = selectedItems.every(item => item.status === 'done')
    const selected = new Set(selectedItems.map(item => item.id))
    const saved = await persist(
      items.map(item =>
        selected.has(item.id)
          ? { ...item, status: restore ? 'active' : 'done' }
          : item
      ),
      [],
      restore ? '所选内容已恢复待读' : '所选内容已标记读完'
    )
    if (saved) clearSelection()
  }

  async function archiveSelected(restore = false) {
    if (!selectedItems.length) return
    const selected = new Set(selectedItems.map(item => item.id))
    const saved = await persist(
      items.map(item =>
        selected.has(item.id)
          ? { ...item, status: restore ? 'active' : 'archived' }
          : item
      ),
      [],
      restore ? '所选内容已恢复到资料库' : '所选内容已移出日常阅读'
    )
    if (saved) clearSelection()
  }

  function openFolder(folderId) {
    setActiveFolderId(folderId)
    setActiveId('')
    setSelectedIds([])
    setMenuKey('')
    setStatus('')
  }

  function openItem(item) {
    setActiveId(item.id)
    setMenuKey('')
    setStatus('')
  }

  function closeDialog() {
    if (!busy) setDialog(null)
  }

  function askCreateFolder() {
    setDialog({
      type: 'create-folder',
      title: activeFolder ? `在“${folderName(activeFolder)}”中新建文件夹` : '新建阅读文件夹',
      description: '新建一个阅读文件夹。',
      value: '',
      destination: activeFolder?.id || '__root__'
    })
  }

  function askRename(folder) {
    setDialog({
      type: 'rename-folder',
      title: '重命名文件夹',
      description: '修改文件夹名称。',
      target: folder,
      value: folderName(folder)
    })
  }

  function askMove(target) {
    setDialog({
      type: isReadingFolder(target) ? 'move-folder' : 'move-item',
      title: isReadingFolder(target) ? '移动文件夹' : '移动阅读内容',
      description: '选择目标文件夹。',
      target,
      destination: isReadingFolder(target)
        ? (folderParentId(target) || '__root__')
        : effectiveFolderId(target, folders)
    })
  }

  function askDelete(target) {
    const folder = isReadingFolder(target)
    setDialog({
      type: folder ? 'delete-folder' : 'delete-item',
      title: folder ? `删除“${folderName(target)}”` : `删除“${readingItemTitle(target)}”`,
      description: folder
        ? '子文件夹也会删除，但其中的文章会移到上一级，不会一起消失。'
        : '这会删除阅读条目；已经另存为笔记的内容不会被删除。',
      target,
      danger: true
    })
  }

  async function handleDialogConfirm() {
    if (!dialog) return
    const value = String(dialog.value || '').trim()
    let saved = null

    if (dialog.type === 'create-folder') {
      const parent = dialog.destination === '__root__' ? '' : dialog.destination
      saved = await persist(
        [...items, { ...folderDraft(value, parent), id: createReadingEntityId() }],
        [],
        '文件夹已创建'
      )
    }

    if (dialog.type === 'rename-folder') {
      saved = await persist(items.map(item =>
        item.id === dialog.target.id
          ? patchReadingTrace({ ...item, title: value }, { folderName: value })
          : item
      ), [], '文件夹已重命名')
    }

    if (dialog.type === 'move-folder') {
      const parent = dialog.destination === '__root__' ? '' : dialog.destination
      saved = await persist(
        patchTrace(dialog.target.id, { parentFolderId: parent }),
        [],
        '文件夹已移动'
      )
    }

    if (dialog.type === 'move-item') {
      const folderId = dialog.destination === '__root__' ? '' : dialog.destination
      saved = await persist(
        patchTrace(dialog.target.id, { folderId }),
        [],
        '阅读内容已移动'
      )
      if (saved) setActiveId('')
    }

    if (dialog.type === 'move-items') {
      const folderId = dialog.destination === '__root__' ? '' : dialog.destination
      const targetIds = new Set((dialog.targets || []).map(item => item.id))
      saved = await persist(
        items.map(item =>
          targetIds.has(item.id)
            ? patchReadingTrace(item, { folderId })
            : item
        ),
        [],
        `${targetIds.size} 篇阅读内容已移动`
      )
      if (saved) {
        setActiveId('')
        clearSelection()
      }
    }

    if (dialog.type === 'delete-item') {
      saved = await persist(
        items.filter(item => item.id !== dialog.target.id),
        [dialog.target.id],
        '阅读内容已删除'
      )
      if (saved) setActiveId('')
    }

    if (dialog.type === 'delete-items') {
      const targetIds = new Set((dialog.targets || []).map(item => item.id))
      saved = await persist(
        items.filter(item => !targetIds.has(item.id)),
        [...targetIds],
        `${targetIds.size} 篇阅读内容已删除`
      )
      if (saved) {
        setActiveId('')
        clearSelection()
      }
    }

    if (dialog.type === 'delete-folder') {
      const folder = dialog.target
      const descendants = descendantFolderIds(folders, folder.id)
      const removed = new Set([folder.id, ...descendants])
      const parentId = folderParentId(folder)
      const next = items
        .filter(item => !removed.has(item.id))
        .map(item => {
          if (!isReadingItem(item)) return item
          if (!removed.has(effectiveFolderId(item, folders))) return item
          return patchReadingTrace(item, { folderId: parentId })
        })
      saved = await persist(next, [...removed], '文件夹已删除，文章已移到上一级')
    }

    if (saved) setDialog(null)
  }

  async function copyItem(item) {
    const copy = {
      ...item,
      id: createReadingEntityId(),
      title: `${readingItemTitle(item)}（副本）`,
      source: 'reading-library-copy',
      aiTrace: {
        ...readingTrace(item),
        copiedFromItemId: item.id,
        copiedAt: new Date().toISOString()
      }
    }
    await persist([...items, copy], [], '副本已创建')
    setMenuKey('')
  }

  async function copyFolder(folder) {
    const descendantIds = descendantFolderIds(folders, folder.id)
    const sourceIds = new Set([folder.id, ...descendantIds])
    const sourceFolders = folders.filter(item => sourceIds.has(item.id))
    const folderMap = new Map(
      sourceFolders.map(source => [source.id, createReadingEntityId()])
    )

    const folderDrafts = sourceFolders.map(source => {
      const sourceParent = folderParentId(source)
      const parentFolderId = source.id === folder.id
        ? folderParentId(folder)
        : (folderMap.get(sourceParent) || sourceParent)
      const title = source.id === folder.id
        ? `${folderName(source)}（副本）`
        : folderName(source)

      return {
        ...folderDraft(title, parentFolderId),
        id: folderMap.get(source.id),
        summary: source.summary || '',
        aiTrace: {
          ...readingTrace(source),
          entityType: 'reading-folder',
          folderName: title,
          parentFolderId,
          systemKey: '',
          protected: false,
          copiedFromFolderId: source.id,
          copiedAt: new Date().toISOString()
        }
      }
    })

    const itemDrafts = readingItems
      .filter(item => sourceIds.has(effectiveFolderId(item, folders)))
      .map(item => ({
        ...item,
        id: createReadingEntityId(),
        title: `${readingItemTitle(item)}（副本）`,
        source: 'reading-library-copy',
        aiTrace: {
          ...readingTrace(item),
          folderId: folderMap.get(effectiveFolderId(item, folders)) || '',
          copiedFromItemId: item.id,
          copiedAt: new Date().toISOString()
        }
      }))

    await persist(
      [...items, ...folderDrafts, ...itemDrafts],
      [],
      '文件夹副本已创建'
    )
    setMenuKey('')
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
      restore ? '已恢复到阅读资料库' : '已移出日常阅读'
    )
    setActiveId('')
    setMenuKey('')
  }

  async function archiveFolder(folder, restore = false) {
    const descendants = descendantFolderIds(folders, folder.id)
    const affected = new Set([folder.id, ...descendants])
    const nextStatus = restore ? 'active' : 'archived'
    const next = items.map(item => {
      if (affected.has(item.id)) return { ...item, status: nextStatus }
      if (isReadingItem(item) && affected.has(effectiveFolderId(item, folders))) {
        return { ...item, status: nextStatus }
      }
      return item
    })
    const saved = await persist(
      next,
      [],
      restore ? '文件夹已恢复' : '文件夹已移出日常阅读'
    )
    if (saved) clearSelection()
  }

  async function saveNote(item) {
    const note = drafts[item.id] || ''
    const saved = await persist(patchItem(item.id, { note }), [], '摘录已保存')
    if (!saved) return
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scheduleItemId: item.id, note })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '笔记保存失败')
      if (data.note?.id) {
        setNoteLinks(current => ({ ...current, [item.id]: data.note.id }))
      }
      setStatus(data.existing ? '已打开原有笔记草稿' : '已生成笔记草稿')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '笔记保存失败')
    }
  }

  async function copyMarkdown(item) {
    await navigator.clipboard.writeText(
      makeMarkdown(item, drafts[item.id] || '')
    )
    setStatus('Markdown 已复制')
    setMenuKey('')
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
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/schedule/items', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [action], deletedIds: [] })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '加入日程失败')
      if (!Array.isArray(payload.items)) throw new Error('日程响应格式异常')
      if (profileId) writeScheduleItemsCache(profileId, payload.items)
      setStatus('已加入日程')
      setScheduleDate('today')
      setScheduleTime('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '加入日程失败')
    } finally {
      setBusy(false)
    }
  }

  function countFolderItems(folderId) {
    const ids = descendantFolderIds(folders, folderId)
    ids.add(folderId)
    return readingItems.filter(item =>
      item.status !== 'archived' &&
      ids.has(effectiveFolderId(item, folders))
    ).length
  }

  const title = archivedMode
    ? '资料归档'
    : activeFolder
      ? folderName(activeFolder)
      : '阅读资料库'

  if (sessionLoading || !profileId || loadState === 'loading') {
    return (
      <div className='desk-loading-state' aria-live='polite'>
        <i />
        <span>正在读取…</span>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className='course-empty-state'>
        <strong>阅读资料没有载入</strong>
        <p>{loadMessage}</p>
        <button type='button' onClick={() => window.location.reload()}>重新加载</button>
      </div>
    )
  }

  if (activeItem) {
    return (
      <div className='reading-library reading-document-view' ref={rootRef}>
        <header className='reading-document-topbar'>
          <button type='button' onClick={() => setActiveId('')}>
            ← 返回{archivedMode ? '资料归档' : `“${activeFolder ? folderName(activeFolder) : '阅读资料库'}”`}
          </button>
          <ActionMenu
            open={menuKey === `item:${activeItem.id}`}
            onToggle={() => setMenuKey(current =>
              current === `item:${activeItem.id}` ? '' : `item:${activeItem.id}`
            )}
          >
            {activeItem.status !== 'archived' ? (
              <>
                <button type='button' onClick={() => askMove(activeItem)}>移动到…</button>
                <button type='button' onClick={() => copyItem(activeItem)}>创建副本</button>
                <button type='button' onClick={() => copyMarkdown(activeItem)}>复制 Markdown</button>
                <button type='button' onClick={() => archiveItem(activeItem)}>
                  移出日常阅读
                </button>
              </>
            ) : (
              <button type='button' onClick={() => archiveItem(activeItem, true)}>
                恢复到阅读资料库
              </button>
            )}
            <button className='is-danger' type='button' onClick={() => askDelete(activeItem)}>
              删除
            </button>
          </ActionMenu>
        </header>

        <article className='reading-panel'>
          <div className='reading-panel-head'>
            <div>
              <span className='eyebrow'>{itemMeta(activeItem).join(' · ')}</span>
              <h2>{readingItemTitle(activeItem)}</h2>
            </div>
            {activeItem.status !== 'archived' ? (
              <button type='button' onClick={() => markDone(activeItem)} disabled={busy}>
                {activeItem.status === 'done' ? '重新待读' : '读完'}
              </button>
            ) : null}
          </div>

          {tagsFor(activeItem).length ? (
            <div className='reading-detail-tags'>
              {tagsFor(activeItem).map(tag => <span key={tag}>{tag}</span>)}
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
                  target={/^https?:\/\//i.test(link.url || '') ? '_blank' : undefined}
                  rel='noreferrer'
                >
                  {link.title || link.url}
                </a>
              ))}
            </div>
          ) : null}

          <label className='reading-note'>
            <span>摘录与想法</span>
            <textarea
              value={drafts[activeItem.id] ?? activeItem.note ?? ''}
              onChange={event => setDrafts(current => ({
                ...current,
                [activeItem.id]: event.target.value
              }))}
              placeholder='可以粘贴原文片段，也可以写几句自己的判断。'
            />
          </label>

          <div className='reading-schedule-box'>
            <div>
              <strong>安排阅读</strong>
              <span>为这篇内容安排阅读时间。</span>
            </div>
            <label>
              日期
              <select value={scheduleDate} onChange={event => setScheduleDate(event.target.value)}>
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
            <button type='button' onClick={() => scheduleReading(activeItem)} disabled={busy}>
              加入日程
            </button>
          </div>

          <div className='reading-actions'>
            <button
              type='button'
              onClick={() => saveNote(activeItem)}
              disabled={busy || !isUuid(activeItem.id)}
            >
              {isUuid(activeItem.id) ? '存为笔记草稿' : '暂不可存为笔记'}
            </button>
            {noteLinks[activeItem.id] ? (
              <a className='reading-note-link' href={`/desk/inbox?noteId=${noteLinks[activeItem.id]}`}>
                打开笔记
              </a>
            ) : null}
            {status ? <span>{status}</span> : null}
          </div>
        </article>

        <ReadingLibraryDialog
          open={Boolean(dialog)}
          title={dialog?.title || ''}
          description={dialog?.description || ''}
          confirmLabel={dialog?.danger ? '确认删除' : '确定'}
          danger={Boolean(dialog?.danger)}
          busy={busy}
          value={dialog?.value || ''}
          onValueChange={dialog?.value !== undefined
            ? value => setDialog(current => ({ ...current, value }))
            : undefined}
          destination={dialog?.destination || ''}
          onDestinationChange={destination => setDialog(current => ({ ...current, destination }))}
          destinations={dialog?.type?.startsWith('move-') ? folderDestinations : []}
          onConfirm={handleDialogConfirm}
          onClose={closeDialog}
        />
      </div>
    )
  }

  return (
    <div className='reading-library' ref={rootRef}>
      <header className='reading-library-head'>
        <div>
          <span className='eyebrow'>Reading Library</span>
          <h2>{title}</h2>
          <p>
            {archivedMode
              ? '这里保存已经退出日常阅读视线的资料。内容、标注和笔记都还在，随时可以恢复。'
              : activeFolder?.summary || '按文件夹整理阅读资料。'}
          </p>
        </div>
        <div className='reading-library-head-actions'>
          {!archivedMode ? (
            <button type='button' onClick={askCreateFolder} disabled={busy}>
              新建文件夹
            </button>
          ) : null}
          <button
            type='button'
            onClick={() => openFolder(archivedMode ? '' : READING_ARCHIVE_VIEW)}
          >
            {archivedMode ? '返回资料库' : '资料归档'}
          </button>
        </div>
      </header>

      {!archivedMode && breadcrumbs.length ? (
        <nav className='reading-breadcrumbs' aria-label='阅读文件夹路径'>
          <button type='button' onClick={() => openFolder('')}>阅读资料库</button>
          {breadcrumbs.map(folder => (
            <button type='button' key={folder.id} onClick={() => openFolder(folder.id)}>
              {folderName(folder)}
            </button>
          ))}
        </nav>
      ) : null}

      {visibleFolders.length ? (
        <section className='reading-folder-strip' aria-label='阅读文件夹'>
          {visibleFolders.map(folder => (
            <article className='reading-folder-card' key={folder.id}>
              <button
                className='reading-folder-open'
                type='button'
                onClick={() => archivedMode ? null : openFolder(folder.id)}
              >
                <span className='reading-folder-icon'>{folderIcon(folder)}</span>
                <span>
                  <strong>{folderName(folder)}</strong>
                  <small>
                    {archivedMode ? '已移出日常阅读' : `${countFolderItems(folder.id)} 篇内容`}
                  </small>
                  {folder.summary ? <p>{folder.summary}</p> : null}
                </span>
              </button>
              <ActionMenu
                open={menuKey === `folder:${folder.id}`}
                onToggle={() => setMenuKey(current =>
                  current === `folder:${folder.id}` ? '' : `folder:${folder.id}`
                )}
              >
                {archivedMode ? (
                  <button type='button' onClick={() => archiveFolder(folder, true)}>
                    恢复到资料库
                  </button>
                ) : (
                  <>
                    <button type='button' onClick={() => openFolder(folder.id)}>打开</button>
                    <button type='button' onClick={() => askRename(folder)}>重命名</button>
                    <button type='button' onClick={() => askMove(folder)}>移动到…</button>
                    <button type='button' onClick={() => copyFolder(folder)}>创建副本</button>
                    <button type='button' onClick={() => archiveFolder(folder)}>
                      移出日常阅读
                    </button>
                    {!folderSystemKey(folder) ? (
                      <button className='is-danger' type='button' onClick={() => askDelete(folder)}>
                        删除
                      </button>
                    ) : null}
                  </>
                )}
              </ActionMenu>
            </article>
          ))}
        </section>
      ) : null}

      {visibleItems.length ? (
        <section className='reading-file-list' aria-label='阅读内容'>
          <header className='reading-file-list-head'>
            <div>
              <label className='reading-select-all'>
                <input
                  type='checkbox'
                  checked={visibleItems.every(item => selectedIds.includes(item.id))}
                  onChange={selectAllVisible}
                  disabled={busy}
                />
                <span>{selectedItems.length ? `已选 ${selectedItems.length} 篇` : archivedMode ? '已归档内容' : '当前文件夹'}</span>
              </label>
              <strong>{visibleItems.length} 篇</strong>
            </div>
            {selectedItems.length ? (
              <div className='reading-bulk-actions'>
                {archivedMode ? (
                  <button type='button' onClick={() => archiveSelected(true)} disabled={busy}>
                    恢复
                  </button>
                ) : (
                  <>
                    <button type='button' onClick={askMoveSelected} disabled={busy}>移动到…</button>
                    <button type='button' onClick={markSelectedDone} disabled={busy}>
                      {selectedItems.every(item => item.status === 'done') ? '恢复待读' : '标为已读'}
                    </button>
                    <button type='button' onClick={() => archiveSelected(false)} disabled={busy}>归档</button>
                  </>
                )}
                <button className='is-danger' type='button' onClick={askDeleteSelected} disabled={busy}>
                  删除
                </button>
                <button type='button' onClick={clearSelection} disabled={busy}>取消选择</button>
              </div>
            ) : null}
          </header>
          {visibleItems.map(item => (
            <article className={selectedIds.includes(item.id) ? 'is-selected' : ''} key={item.id}>
              <label className='reading-select-control'>
                <input
                  type='checkbox'
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelected(item.id)}
                  disabled={busy}
                />
                <span>选择“{readingItemTitle(item)}”</span>
              </label>
              <button className='reading-file-open' type='button' onClick={() => openItem(item)}>
                <span className='reading-file-kind'>{readingTrace(item).readingKind === 'course-brief' ? '课' : '文'}</span>
                <span>
                  <strong>{readingItemTitle(item)}</strong>
                  <small>{itemMeta(item).join(' · ')}</small>
                  {item.summary ? <p>{item.summary}</p> : null}
                </span>
              </button>
              <ActionMenu
                open={menuKey === `item:${item.id}`}
                onToggle={() => setMenuKey(current =>
                  current === `item:${item.id}` ? '' : `item:${item.id}`
                )}
              >
                <button type='button' onClick={() => openItem(item)}>打开</button>
                {archivedMode ? (
                  <button type='button' onClick={() => archiveItem(item, true)}>
                    恢复到资料库
                  </button>
                ) : (
                  <>
                    <button type='button' onClick={() => askMove(item)}>移动到…</button>
                    <button type='button' onClick={() => copyItem(item)}>创建副本</button>
                    <button type='button' onClick={() => archiveItem(item)}>
                      移出日常阅读
                    </button>
                  </>
                )}
                <button className='is-danger' type='button' onClick={() => askDelete(item)}>
                  删除
                </button>
              </ActionMenu>
            </article>
          ))}
        </section>
      ) : null}

      {!visibleFolders.length && !visibleItems.length ? (
        <div className='reading-empty'>
          {archivedMode
            ? '资料归档还是空的'
            : activeFolder
              ? '这个文件夹还是空的'
              : '阅读资料库正在等待第一批内容'}
        </div>
      ) : null}

      {status ? <p className='reading-library-status' role='status'>{status}</p> : null}

      <ReadingLibraryDialog
        open={Boolean(dialog)}
        title={dialog?.title || ''}
        description={dialog?.description || ''}
        confirmLabel={dialog?.danger ? '确认删除' : '确定'}
        danger={Boolean(dialog?.danger)}
        busy={busy}
        value={dialog?.value || ''}
        onValueChange={dialog?.value !== undefined
          ? value => setDialog(current => ({ ...current, value }))
          : undefined}
        placeholder='输入文件夹名称'
        destination={dialog?.destination || ''}
        onDestinationChange={destination => setDialog(current => ({ ...current, destination }))}
        destinations={
          dialog?.type === 'create-folder' || dialog?.type?.startsWith('move-')
            ? folderDestinations
            : []
        }
        onConfirm={handleDialogConfirm}
        onClose={closeDialog}
      />
    </div>
  )
}
