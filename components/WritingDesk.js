import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

function formatDate(value) {
  if (!value) return '尚未更新'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚未更新'
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function excerpt(note = {}) {
  return note.metadata?.excerpt || String(note.body_markdown || '').replace(/[#>*_`\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110) || '还没有摘要。'
}

export function WritingDesk() {
  const [state, setState] = useState('loading')
  const [notes, setNotes] = useState([])
  const [content, setContent] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      fetch('/api/notes?includeArchived=true').then(response => response.ok ? response.json() : Promise.reject(new Error('notes'))),
      fetch('/api/content/manage').then(response => response.ok ? response.json() : Promise.reject(new Error('content')))
    ]).then(([noteResult, contentResult]) => {
      if (cancelled) return
      if (noteResult.status === 'fulfilled') setNotes(noteResult.value.notes || [])
      if (contentResult.status === 'fulfilled') setContent(contentResult.value.items || [])
      if (noteResult.status === 'rejected' && contentResult.status === 'rejected') {
        setState('error')
        setMessage('写作资料读取失败，请稍后重试。')
        return
      }
      setMessage(noteResult.status === 'rejected' ? '随手记暂时没有加载。' : contentResult.status === 'rejected' ? '发布记录暂时没有加载。' : '')
      setState('ready')
    })
    return () => { cancelled = true }
  }, [])

  const activeNotes = useMemo(() => notes.filter(note => note.status !== 'archived'), [notes])
  const drafts = useMemo(() => content.filter(item => item.status !== 'published'), [content])
  const published = useMemo(() => content.filter(item => item.status === 'published'), [content])
  const recentNotes = useMemo(() => activeNotes.slice(0, 8), [activeNotes])
  const recentContent = useMemo(() => [...drafts, ...published].slice(0, 8), [drafts, published])

  if (state === 'loading') return <div className='desk-loading-state'><i /><span>正在整理写作材料…</span></div>
  if (state === 'error') return <div className='course-empty-state'><strong>写作房间暂时没有打开</strong><p>{message}</p><button type='button' onClick={() => window.location.reload()}>重新加载</button></div>

  return <div className='writing-desk'>
    <section className='writing-desk-hero'>
      <div><span>Writing room</span><h2>从已有材料继续写。</h2><p>随手记负责保存碎片，发布台负责公开设置；这里把两端放在同一张桌面上。</p></div>
      <div className='writing-desk-actions'><Link className='soft-button primary' href='/desk/inbox?noteId=new'>新建随手记</Link><Link className='soft-button' href='/desk/publish'>打开发布台</Link></div>
    </section>

    {message ? <p className='status-line'>{message}</p> : null}

    <section className='writing-desk-stats'>
      <div><span>进行中的笔记</span><strong>{activeNotes.length}</strong></div>
      <div><span>发布草稿</span><strong>{drafts.length}</strong></div>
      <div><span>已发布内容</span><strong>{published.length}</strong></div>
    </section>

    <section className='writing-desk-grid'>
      <div className='writing-desk-panel'>
        <header><div><span>Notes</span><h3>最近笔记</h3></div><Link href='/desk/inbox'>查看全部</Link></header>
        <div className='writing-desk-list'>
          {recentNotes.length ? recentNotes.map(note => <Link href={`/desk/inbox?noteId=${encodeURIComponent(note.id)}`} key={note.id}>
            <div><strong>{note.title || '未命名随手记'}</strong><p>{excerpt(note)}</p></div><small>{formatDate(note.updated_at)}</small>
          </Link>) : <p className='writing-desk-empty'>随手记还是空的。</p>}
        </div>
      </div>

      <div className='writing-desk-panel'>
        <header><div><span>Publishing</span><h3>内容进度</h3></div><Link href='/desk/publish'>管理内容</Link></header>
        <div className='writing-desk-list'>
          {recentContent.map(item => <Link href={item.status === 'published' ? `/content/${item.slug}` : '/desk/publish'} key={item.id}>
            <div><strong>{item.title || '未命名内容'}</strong><p>{item.summary || (item.status === 'published' ? '已经公开。' : '等待继续设置与发布。')}</p></div><small>{item.status === 'published' ? '已发布' : '草稿'}</small>
          </Link>)}
          {!drafts.length && !published.length ? <p className='writing-desk-empty'>发布台里还没有内容。</p> : null}
        </div>
      </div>
    </section>
  </div>
}
