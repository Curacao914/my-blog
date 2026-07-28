'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { excerptText } from '@/lib/domain/metadata'
import { WritingPublishDialog } from '@/components/WritingPublishDialog'
import { KnowledgeCaptureLink } from '@/components/knowledge/KnowledgeCaptureLink'

function noteTitle(note) {
  return note?.title || '未命名随手记'
}

function noteBody(note) {
  return note?.body_markdown || note?.bodyMarkdown || ''
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function isNewId(id) {
  return id === 'new'
}

export function NotesDesk() {
  const router = useRouter()
  const [notes, setNotes] = useState([])
  const [activeId, setActiveId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [isSaving, setIsSaving] = useState(false)
  const [showListOnMobile, setShowListOnMobile] = useState(true)
  const [publishNote, setPublishNote] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('')
      setLoadState('loading')
      try {
        const response = await fetch('/api/notes', {
          credentials: 'same-origin',
          cache: 'no-store'
        })
        if (!response.ok) throw new Error('load failed')
        const data = await response.json()
        if (cancelled) return
        const loaded = data.notes || []
        setNotes(loaded)
        const requested = typeof router.query.noteId === 'string' ? router.query.noteId : ''
        const selected = loaded.find(note => note.id === requested) || loaded[0]
        if (selected) setActiveId(selected.id)
        setLoadState('ready')
      } catch {
        if (!cancelled) {
          setStatus('笔记加载失败')
          setLoadState('error')
        }
      }
    }
    if (router.isReady) load()
    return () => {
      cancelled = true
    }
  }, [router.isReady, router.query.noteId])

  const activeNote = useMemo(
    () => notes.find(note => note.id === activeId) || null,
    [activeId, notes]
  )

  useEffect(() => {
    if (isNewId(activeId)) {
      setTitle('')
      setBody('')
      return
    }
    if (!activeNote) return
    setTitle(activeNote.title || '')
    setBody(noteBody(activeNote))
  }, [activeId, activeNote])

  function selectNote(id) {
    setActiveId(id)
    setShowListOnMobile(false)
    setStatus('')
  }

  function newNote() {
    setActiveId('new')
    setShowListOnMobile(false)
    setStatus('')
  }

  async function saveNote() {
    if (!body.trim()) {
      setStatus('先写一点内容')
      return null
    }
    setIsSaving(true)
    setStatus('')
    try {
      const method = isNewId(activeId) ? 'POST' : 'PATCH'
      const response = await fetch('/api/notes', {
        method,
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: isNewId(activeId) ? undefined : activeId,
          title,
          bodyMarkdown: body,
          originType: activeNote?.metadata?.originType ||
            activeNote?.metadata?.origin_type ||
            activeNote?.note_type ||
            'quick_note'
        })
      })
      if (!response.ok) throw new Error('save failed')
      const data = await response.json()
      const saved = data.note
      setNotes(current => {
        const others = current.filter(note => note.id !== saved.id)
        return [saved, ...others]
      })
      setActiveId(saved.id)
      setStatus('已保存')
      return saved
    } catch {
      setStatus('保存失败')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function openPublishSettings() {
    const saved = await saveNote()
    if (saved) setPublishNote(saved)
  }

  async function archiveNote() {
    if (!activeNote || isNewId(activeId)) return
    setIsSaving(true)
    setStatus('')
    try {
      const response = await fetch('/api/notes', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: activeId, status: 'archived' })
      })
      if (!response.ok) throw new Error('archive failed')
      setNotes(current => current.filter(note => note.id !== activeId))
      setActiveId(notes.find(note => note.id !== activeId)?.id || '')
      setStatus('已归档')
    } catch {
      setStatus('归档失败')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCurrentNote() {
    if (!activeNote || isNewId(activeId)) return
    setIsSaving(true)
    setStatus('')
    try {
      const response = await fetch(
        `/api/notes?id=${encodeURIComponent(activeId)}`,
        { method: 'DELETE', credentials: 'same-origin' }
      )
      if (!response.ok) throw new Error('delete failed')
      setNotes(current => current.filter(note => note.id !== activeId))
      setActiveId(notes.find(note => note.id !== activeId)?.id || '')
      setStatus('已删除')
    } catch {
      setStatus('删除失败')
    } finally {
      setIsSaving(false)
    }
  }

  const hasEditor = isNewId(activeId) || activeNote

  return (
    <>
      <div className={`notes-desk ${showListOnMobile ? '' : 'show-editor'}`}>
        <aside className='notes-list' aria-label='随手记列表'>
          <div className='notes-list-head'>
            <div>
              <span className='eyebrow'>Drafts</span>
              <h2>随手记</h2>
            </div>
            <button type='button' onClick={newNote}>
              新建
            </button>
          </div>
          {loadState === 'loading' ? (
            <p className='notes-empty'>正在读取…</p>
          ) : notes.length ? (
            notes.map(note => (
              <button
                key={note.id}
                type='button'
                aria-pressed={activeId === note.id}
                onClick={() => selectNote(note.id)}
              >
                <strong>{noteTitle(note)}</strong>
                <small>{excerptText(note.metadata?.excerpt || noteBody(note), 82)}</small>
                <span>
                  {[
                    note.note_type === 'reading' ? '阅读草稿' : '随手记',
                    formatTime(note.updated_at)
                  ].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))
          ) : (
            <p className='notes-empty'>
              {loadState === 'error' ? '载入失败，请刷新重试' : '还没有草稿'}
            </p>
          )}
        </aside>

        <section className='notes-editor' aria-label='随手记编辑'>
          <button
            className='notes-back'
            type='button'
            onClick={() => setShowListOnMobile(true)}
          >
            返回列表
          </button>
          {hasEditor ? (
            <>
              <input
                className='notes-title-input'
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder='标题可选'
              />
              <textarea
                className='notes-body-input'
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder='写下一句话想法、课堂片段、写作灵感或阅读草稿。'
              />
              <div className='notes-actions'>
                <button type='button' onClick={saveNote} disabled={isSaving}>
                  {isSaving ? '保存中' : '保存'}
                </button>
                <button
                  type='button'
                  onClick={openPublishSettings}
                  disabled={isSaving || !body.trim()}
                >
                  发布设置
                </button>
                {!isNewId(activeId) && activeNote ? (
                  <>
                    <KnowledgeCaptureLink
                      sourceType='note'
                      sourceId={activeNote.id}
                      sourceTitle={title || noteTitle(activeNote)}
                      seed={excerptText(body, 180)}
                    />
                    <button type='button' onClick={archiveNote} disabled={isSaving}>
                      归档
                    </button>
                    <button type='button' onClick={deleteCurrentNote} disabled={isSaving}>
                      删除
                    </button>
                  </>
                ) : null}
                {status ? <span>{status}</span> : null}
              </div>
            </>
          ) : (
            <div className='notes-editor-empty'>
              <button type='button' onClick={newNote}>
                新建随手记
              </button>
            </div>
          )}
        </section>
      </div>

      {publishNote ? (
        <WritingPublishDialog
          note={publishNote}
          onClose={() => setPublishNote(null)}
        />
      ) : null}
    </>
  )
}
