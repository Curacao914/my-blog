import { useEffect, useMemo, useRef, useState } from 'react'

import { MarkdownDocument } from '@/components/content/MarkdownDocument'
import { LawTechIcon } from '@/components/LawTechIcons'
import { WritingPublishDialog } from '@/components/WritingPublishDialog'

function noteBody(note = {}) {
  return note.body_markdown || note.bodyMarkdown || ''
}

function noteTitle(note = {}) {
  return note.title || '未命名草稿'
}

function noteKind(note = {}) {
  if (note.note_type === 'reading') return '阅读'
  if (note.note_type === 'writing' || note.metadata?.originType === 'writing') return '写作'
  return '随手记'
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

function excerpt(value = '', limit = 72) {
  return String(value)
    .replace(/[#>*_`\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function wordStats(value = '') {
  const text = String(value || '').trim()
  if (!text) return { characters: 0, words: 0 }
  const chinese = (text.match(/[\u3400-\u9fff]/g) || []).length
  const latin = text
    .replace(/[\u3400-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  return { characters: text.length, words: chinese + latin }
}

export function WritingDesk() {
  const [state, setState] = useState('loading')
  const [notes, setNotes] = useState([])
  const [activeId, setActiveId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('write')
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState('idle')
  const [message, setMessage] = useState('')
  const [publishNote, setPublishNote] = useState(null)
  const saveLock = useRef(false)

  const activeNote = useMemo(
    () => notes.find(note => note.id === activeId) || null,
    [activeId, notes]
  )
  const stats = useMemo(() => wordStats(body), [body])
  const filteredNotes = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    if (!keyword) return notes
    return notes.filter(note => [noteTitle(note), noteBody(note), noteKind(note)]
      .join(' ')
      .toLocaleLowerCase('zh-CN')
      .includes(keyword))
  }, [notes, query])

  useEffect(() => {
    let cancelled = false
    fetch('/api/notes?scope=writing', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || '草稿读取失败')
        return data
      })
      .then(data => {
        if (cancelled) return
        const loaded = data.notes || []
        setNotes(loaded)
        if (loaded[0]) {
          setActiveId(loaded[0].id)
          setTitle(loaded[0].title || '')
          setBody(noteBody(loaded[0]))
        } else {
          setActiveId('new')
        }
        setState('ready')
      })
      .catch(error => {
        if (cancelled) return
        setMessage(error instanceof Error ? error.message : '草稿读取失败')
        setState('error')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!dirty || activeId === 'new' || !body.trim() || saveLock.current) return undefined
    const timer = window.setTimeout(() => {
      void saveDraft({ quiet: true })
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [dirty, title, body, activeId])

  useEffect(() => {
    const onKey = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveDraft()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId, title, body])

  function selectNote(note) {
    setActiveId(note.id)
    setTitle(note.title || '')
    setBody(noteBody(note))
    setDirty(false)
    setSaveState('idle')
    setMessage('')
  }

  function newDraft() {
    setActiveId('new')
    setTitle('')
    setBody('')
    setDirty(false)
    setSaveState('idle')
    setMessage('')
    setMode('write')
  }

  async function saveDraft({ quiet = false } = {}) {
    if (saveLock.current) return
    if (!body.trim()) {
      if (!quiet) setMessage('正文还是空的。')
      return
    }

    saveLock.current = true
    setSaveState('saving')
    if (!quiet) setMessage('')

    try {
      const isNew = activeId === 'new'
      const response = await fetch('/api/notes', {
        method: isNew ? 'POST' : 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: isNew ? undefined : activeId,
          title,
          bodyMarkdown: body,
          originType: 'writing',
          scope: 'writing'
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存失败')

      const saved = data.note
      setNotes(current => [saved, ...current.filter(note => note.id !== saved.id)])
      setActiveId(saved.id)
      setTitle(saved.title || title)
      setDirty(false)
      setSaveState('saved')
      if (!quiet) setMessage('已保存')
      window.setTimeout(() => {
        setSaveState('idle')
        setMessage(current => current === '已保存' ? '' : current)
      }, 1800)
      return saved
    } catch (error) {
      setSaveState('error')
      setMessage(error instanceof Error ? error.message : '保存失败')
      return null
    } finally {
      saveLock.current = false
    }
  }

  async function archiveDraft() {
    if (!activeNote || activeId === 'new') return
    if (!window.confirm('归档这篇草稿？')) return
    setSaveState('saving')
    try {
      const response = await fetch('/api/notes', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: activeId, status: 'archived', scope: 'writing' })
      })
      if (!response.ok) throw new Error('归档失败')
      const remaining = notes.filter(note => note.id !== activeId)
      setNotes(remaining)
      if (remaining[0]) selectNote(remaining[0])
      else newDraft()
      setMessage('已归档')
    } catch (error) {
      setSaveState('error')
      setMessage(error instanceof Error ? error.message : '归档失败')
    }
  }

  function updateTitle(value) {
    setTitle(value)
    setDirty(true)
    setSaveState('idle')
  }

  function updateBody(value) {
    setBody(value)
    setDirty(true)
    setSaveState('idle')
  }

  async function openPublishSettings() {
    let note = activeNote
    if (activeId === 'new' || dirty) note = await saveDraft()
    if (!note) return
    setPublishNote({ ...note, body_markdown: note.body_markdown || body, title: note.title || title })
  }

  if (state === 'loading') {
    return <div className='desk-loading-state'><i /><span>正在读取草稿…</span></div>
  }
  if (state === 'error') {
    return <div className='course-empty-state'><strong>草稿没有载入</strong><p>{message}</p><button type='button' onClick={() => window.location.reload()}>重新加载</button></div>
  }

  return <>
    <div className='writing-studio'>
      <header className='writing-studio-head'>
        <div><span>Writing Studio</span><h2>写作</h2></div>
        <div className='writing-studio-actions'>
          <button type='button' onClick={newDraft}><LawTechIcon name='writing' size={14} />新建</button>
          <button className='is-primary' disabled={saveState === 'saving' || (!dirty && activeId !== 'new')} type='button' onClick={() => saveDraft()}>
            {saveState === 'saving' ? '保存中' : '保存'}
          </button>
          <button type='button' disabled={!body.trim() || saveState === 'saving'} onClick={openPublishSettings}>发布设置</button>
        </div>
      </header>

      <div className='writing-studio-layout'>
        <aside className='writing-studio-library'>
          <label>
            <LawTechIcon name='search' size={14} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder='搜索草稿' />
          </label>
          <div className='writing-studio-list'>
            {filteredNotes.map(note => (
              <button key={note.id} type='button' aria-pressed={activeId === note.id} onClick={() => selectNote(note)}>
                <span><b>{noteKind(note)}</b><time>{formatTime(note.updated_at)}</time></span>
                <strong>{noteTitle(note)}</strong>
                <small>{excerpt(note.metadata?.excerpt || noteBody(note)) || '空白草稿'}</small>
              </button>
            ))}
            {!filteredNotes.length ? <p>没有匹配的草稿。</p> : null}
          </div>
        </aside>

        <section className='writing-studio-editor'>
          <div className='writing-studio-toolbar'>
            <div role='tablist' aria-label='写作视图'>
              <button aria-selected={mode === 'write'} type='button' onClick={() => setMode('write')}>编辑</button>
              <button aria-selected={mode === 'preview'} type='button' onClick={() => setMode('preview')}>预览</button>
            </div>
            <span>{stats.words} 字 · {stats.characters} 字符</span>
          </div>

          <input className='writing-studio-title' value={title} onChange={event => updateTitle(event.target.value)} placeholder='标题' />
          {mode === 'write' ? (
            <textarea
              className='writing-studio-body'
              value={body}
              onChange={event => updateBody(event.target.value)}
              placeholder='开始写作…'
              spellCheck='false'
            />
          ) : (
            <MarkdownDocument className='writing-studio-preview' markdown={body} title={title} emptyText='暂无正文。' />
          )}

          <footer>
            <span className={`save-state is-${saveState}`}>{message || (dirty ? '尚未保存' : formatTime(activeNote?.updated_at))}</span>
            {activeId !== 'new' ? <button type='button' onClick={archiveDraft}>归档</button> : null}
          </footer>
        </section>
      </div>
    </div>

    {publishNote ? <WritingPublishDialog note={publishNote} onClose={() => setPublishNote(null)} /> : null}

    <style jsx>{`
      .writing-studio { display:grid; gap:14px; min-height:calc(100dvh - 150px); }
      .writing-studio-head { display:flex; align-items:end; justify-content:space-between; gap:18px; border-bottom:1px solid rgba(17,63,49,.08); padding:2px 2px 14px; }
      .writing-studio-head span { color:var(--quiet); font-size:9px; font-weight:720; letter-spacing:.11em; text-transform:uppercase; }
      .writing-studio-head h2 { margin:4px 0 0; font-family:var(--display-serif); font-size:30px; font-weight:600; }
      .writing-studio-actions { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }
      .writing-studio-actions button,.writing-studio-actions a { display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(17,63,49,.09); border-radius:11px; padding:8px 11px; color:var(--leaf); background:rgba(255,255,255,.55); cursor:pointer; font-size:11px; }
      .writing-studio-actions button.is-primary { color:#fffaf0; background:var(--leaf); }
      .writing-studio-actions button:disabled { cursor:wait; opacity:.65; }
      .writing-studio-layout { display:grid; grid-template-columns:230px minmax(0,1fr); gap:12px; min-height:0; }
      .writing-studio-library,.writing-studio-editor { min-height:0; border:1px solid rgba(17,63,49,.08); border-radius:20px; background:rgba(255,255,255,.48); }
      .writing-studio-library { display:grid; grid-template-rows:auto minmax(0,1fr); padding:10px; }
      .writing-studio-library > label { display:flex; align-items:center; gap:7px; border:1px solid rgba(17,63,49,.08); border-radius:12px; padding:0 9px; background:rgba(255,255,255,.62); }
      .writing-studio-library input { width:100%; min-width:0; border:0; padding:9px 0; color:var(--ink); background:transparent; outline:none; font-size:11px; }
      .writing-studio-list { display:grid; align-content:start; gap:6px; min-height:0; margin-top:9px; overflow:auto; }
      .writing-studio-list > button { display:grid; gap:5px; width:100%; border:1px solid transparent; border-radius:13px; padding:10px; color:var(--ink); background:transparent; text-align:left; cursor:pointer; }
      .writing-studio-list > button:hover { background:rgba(255,255,255,.56); }
      .writing-studio-list > button[aria-pressed='true'] { border-color:rgba(17,63,49,.08); background:rgba(220,233,223,.62); }
      .writing-studio-list button > span { display:flex; justify-content:space-between; gap:8px; color:var(--quiet); font-size:8px; }
      .writing-studio-list button b { color:var(--blue); font-weight:650; }
      .writing-studio-list button strong { overflow:hidden; font-family:var(--display-serif); font-size:14px; font-weight:600; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
      .writing-studio-list button small { display:-webkit-box; overflow:hidden; color:var(--muted); font-size:9px; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
      .writing-studio-list > p { margin:0; padding:24px 8px; color:var(--quiet); font-size:10px; text-align:center; }
      .writing-studio-editor { display:grid; grid-template-rows:auto auto minmax(0,1fr) auto; padding:14px; }
      .writing-studio-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:10px; }
      .writing-studio-toolbar > div { display:inline-flex; gap:3px; border-radius:10px; padding:3px; background:rgba(220,233,223,.45); }
      .writing-studio-toolbar button { border:0; border-radius:8px; padding:6px 10px; color:var(--muted); background:transparent; cursor:pointer; font-size:10px; }
      .writing-studio-toolbar button[aria-selected='true'] { color:var(--leaf); background:rgba(255,255,255,.78); }
      .writing-studio-toolbar > span { color:var(--quiet); font-size:9px; }
      .writing-studio-title { width:100%; border:0; border-bottom:1px solid rgba(17,63,49,.08); padding:10px 3px 13px; color:var(--ink); background:transparent; font-family:var(--display-serif); font-size:clamp(25px,3vw,36px); font-weight:600; outline:none; }
      .writing-studio-body { width:100%; min-height:480px; resize:none; border:0; padding:18px 3px; color:var(--ink); background:transparent; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:13px; line-height:1.8; outline:none; }
      .writing-studio-editor :global(.writing-studio-preview) { min-height:480px; padding:20px 4px; font-family:var(--display-serif); font-size:15px; line-height:1.9; }
      .writing-studio-editor footer { display:flex; align-items:center; justify-content:space-between; gap:12px; border-top:1px solid rgba(17,63,49,.07); padding-top:10px; }
      .writing-studio-editor footer span { color:var(--quiet); font-size:9px; }
      .writing-studio-editor footer span.is-error { color:#8a4b35; }
      .writing-studio-editor footer button { border:0; padding:5px 0; color:#86503d; background:transparent; cursor:pointer; font-size:10px; }
      @media (max-width:820px) {
        .writing-studio-head { align-items:flex-start; flex-direction:column; }
        .writing-studio-layout { grid-template-columns:1fr; }
        .writing-studio-library { max-height:260px; }
      }
      @media (max-width:560px) {
        .writing-studio-actions { width:100%; }
        .writing-studio-actions button,.writing-studio-actions a { flex:1; justify-content:center; }
        .writing-studio-editor { padding:10px; }
        .writing-studio-body,.writing-studio-editor :global(.writing-studio-preview) { min-height:56vh; }
      }
    `}</style>
  </>
}
