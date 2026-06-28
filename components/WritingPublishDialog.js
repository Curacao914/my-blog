import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const empty = {
  title: '', summary: '', type: 'article', slug: '', cover: '', category: '遇事不决', collection: '写作', tags: [],
  accessMode: 'private', password: '', expiresAt: '', allowIndexing: true, allowRss: true, allowSitemap: true,
  showInRecent: true, pinned: false
}

function uniqueTags(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[，,]/)
  return [...new Set(list.map(item => String(item || '').trim()).filter(Boolean))]
}

export function WritingPublishDialog({ note, onClose }) {
  const [form, setForm] = useState(empty)
  const [publication, setPublication] = useState(null)
  const [canPublish, setCanPublish] = useState(false)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [summaryBusy, setSummaryBusy] = useState(false)
  const tagText = useMemo(() => (form.tags || []).join('，'), [form.tags])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/writing/publication?noteId=${encodeURIComponent(note.id)}`, { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || '发布设置读取失败')
        return data
      })
      .then(data => {
        if (cancelled) return
        setForm({ ...empty, ...(data.settings || {}), tags: uniqueTags(data.settings?.tags) })
        setPublication(data.publication || null)
        setCanPublish(Boolean(data.canPublish))
        setState('ready')
      })
      .catch(error => {
        if (cancelled) return
        setMessage(error instanceof Error ? error.message : '发布设置读取失败')
        setState('error')
      })
    return () => { cancelled = true }
  }, [note.id])

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
    setMessage('')
  }

  async function generateSummary() {
    setSummaryBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/content/summary', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: form.title || note.title, markdown: note.body_markdown })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '摘要生成失败')
      update('summary', data.summary)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '摘要生成失败')
    } finally {
      setSummaryBusy(false)
    }
  }

  async function submit(action) {
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/writing/publication', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ noteId: note.id, action, settings: form })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '发布操作失败')
      setPublication(data.publication)
      setForm(current => ({ ...current, ...(data.publication?.settings || {}), tags: uniqueTags(data.publication?.settings?.tags || current.tags) }))
      setMessage(action === 'publish' ? '已经发布。' : action === 'withdraw' ? '已经撤回。' : '发布草稿已保存。')
      setState('ready')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发布操作失败')
      setState('error')
    }
  }

  const busy = state === 'loading' || state === 'saving'

  return <div className='writing-publish-backdrop' role='presentation' onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className='writing-publish-dialog' role='dialog' aria-modal='true' aria-label='发布设置'>
      <header>
        <div><span>Publishing</span><h3>发布设置</h3></div>
        <button type='button' onClick={onClose} aria-label='关闭'>×</button>
      </header>

      {state === 'loading' ? <p className='writing-publish-loading'>正在读取…</p> : <>
        <div className='writing-publish-form'>
          <label><span>标题</span><input disabled={busy} value={form.title} onChange={event => update('title', event.target.value)} /></label>
          <label><span>内容类型</span><select disabled={busy} value={form.type} onChange={event => update('type', event.target.value)}><option value='article'>文章</option><option value='reading-note'>读书记录</option><option value='project'>项目</option><option value='page'>页面</option></select></label>
          <label className='wide writing-summary-field'><span>摘要 <button disabled={busy || summaryBusy} type='button' onClick={generateSummary}>{summaryBusy ? '生成中…' : 'AI 生成'}</button></span><textarea disabled={busy} rows={4} value={form.summary} onChange={event => update('summary', event.target.value)} /></label>
          <label className='wide'><span>封面图片 URL</span><input disabled={busy} value={form.cover} onChange={event => update('cover', event.target.value)} placeholder='https://assets.law-tech.dev/manual/…' /></label>
          <label><span>栏目</span><input disabled={busy} value={form.category} onChange={event => update('category', event.target.value)} /></label>
          <label><span>合集</span><input disabled={busy} value={form.collection} onChange={event => update('collection', event.target.value)} /></label>
          <label className='wide'><span>标签</span><input disabled={busy} value={tagText} onChange={event => update('tags', uniqueTags(event.target.value))} placeholder='民法，课程笔记' /></label>
          <label className='wide'><span>链接路径</span><input disabled={busy} value={form.slug} onChange={event => update('slug', event.target.value)} /></label>
          <label><span>访问方式</span><select disabled={busy} value={form.accessMode} onChange={event => update('accessMode', event.target.value)}><option value='private'>私密</option>{canPublish ? <option value='public'>公开</option> : null}{canPublish ? <option value='password'>密码</option> : null}</select></label>
          {form.accessMode === 'password' ? <label><span>访问密码</span><input disabled={busy} type='password' value={form.password} onChange={event => update('password', event.target.value)} placeholder={publication ? '留空沿用原密码' : ''} /></label> : null}
          <div className='wide writing-publish-checks'>
            <label><input disabled={busy} type='checkbox' checked={form.showInRecent !== false} onChange={event => update('showInRecent', event.target.checked)} />最近内容</label>
            <label><input disabled={busy} type='checkbox' checked={Boolean(form.pinned)} onChange={event => update('pinned', event.target.checked)} />置顶</label>
            {form.accessMode === 'public' ? <><label><input disabled={busy} type='checkbox' checked={form.allowIndexing !== false} onChange={event => update('allowIndexing', event.target.checked)} />搜索引擎</label><label><input disabled={busy} type='checkbox' checked={form.allowRss !== false} onChange={event => update('allowRss', event.target.checked)} />RSS</label><label><input disabled={busy} type='checkbox' checked={form.allowSitemap !== false} onChange={event => update('allowSitemap', event.target.checked)} />Sitemap</label></> : null}
          </div>
        </div>

        {message ? <p className={`writing-publish-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}

        <footer>
          <div>{publication?.status === 'published' && publication.slug ? <Link href={`/content/${publication.slug}`}>查看页面 ↗</Link> : null}</div>
          <div><button disabled={busy} type='button' onClick={() => submit('draft')}>保存发布草稿</button>{canPublish ? <button className='is-primary' disabled={busy} type='button' onClick={() => submit('publish')}>{publication?.status === 'published' ? '更新发布' : '发布'}</button> : null}{canPublish && publication?.status === 'published' ? <button className='is-danger' disabled={busy} type='button' onClick={() => submit('withdraw')}>撤回</button> : null}</div>
        </footer>
      </>}
    </section>

    <style jsx>{`
      .writing-publish-backdrop { position:fixed; inset:0; z-index:240; display:grid; place-items:center; padding:20px; background:rgba(12,31,25,.38); backdrop-filter:blur(10px); }
      .writing-publish-dialog { width:min(780px,100%); max-height:min(88dvh,880px); overflow:auto; border:1px solid rgba(255,255,255,.82); border-radius:24px; padding:18px; background:rgba(248,250,246,.97); box-shadow:0 34px 110px rgba(10,34,26,.28); }
      .writing-publish-dialog > header { display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid rgba(17,63,49,.08); padding:2px 2px 14px; }
      .writing-publish-dialog > header span { color:var(--quiet); font-size:9px; letter-spacing:.11em; text-transform:uppercase; }
      .writing-publish-dialog > header h3 { margin:4px 0 0; font-family:var(--display-serif); font-size:27px; font-weight:600; }
      .writing-publish-dialog > header button { border:0; border-radius:999px; width:34px; height:34px; color:var(--muted); background:rgba(220,233,223,.55); cursor:pointer; font-size:20px; }
      .writing-publish-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding-top:16px; }
      .writing-publish-form label { display:grid; gap:6px; color:var(--muted); font-size:10px; }
      .writing-publish-form label.wide,.writing-publish-checks.wide { grid-column:1 / -1; }
      .writing-publish-form input,.writing-publish-form select,.writing-publish-form textarea { width:100%; border:1px solid rgba(17,63,49,.1); border-radius:12px; padding:10px 11px; color:var(--ink); background:rgba(255,255,255,.68); outline:none; }
      .writing-publish-form textarea { resize:vertical; line-height:1.65; }
      .writing-summary-field > span { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .writing-summary-field button { border:0; border-radius:999px; padding:5px 9px; color:var(--leaf); background:rgba(220,233,223,.66); cursor:pointer; font-size:10px; }
      .writing-publish-checks { display:flex; flex-wrap:wrap; gap:7px; }
      .writing-publish-checks label { display:flex; align-items:center; gap:6px; border-radius:999px; padding:7px 9px; background:rgba(255,255,255,.48); }
      .writing-publish-checks input { width:auto; }
      .writing-publish-message { margin:12px 0 0; border-radius:12px; padding:9px 11px; color:var(--leaf); background:rgba(220,233,223,.55); font-size:10px; }
      .writing-publish-message.is-error { color:#8a4b35; background:rgba(239,220,208,.62); }
      .writing-publish-loading { padding:50px 10px; color:var(--quiet); text-align:center; }
      .writing-publish-dialog > footer { display:flex; align-items:center; justify-content:space-between; gap:14px; border-top:1px solid rgba(17,63,49,.08); margin-top:16px; padding-top:14px; }
      .writing-publish-dialog > footer > div { display:flex; flex-wrap:wrap; gap:7px; }
      .writing-publish-dialog > footer button,.writing-publish-dialog > footer a { border:1px solid rgba(17,63,49,.09); border-radius:11px; padding:8px 11px; color:var(--leaf); background:rgba(255,255,255,.62); cursor:pointer; font-size:11px; }
      .writing-publish-dialog > footer button.is-primary { color:#fffaf0; background:var(--leaf); }
      .writing-publish-dialog > footer button.is-danger { color:#8a4b35; background:rgba(239,220,208,.55); }
      @media (max-width:620px) { .writing-publish-backdrop { padding:7px; } .writing-publish-form { grid-template-columns:1fr; } .writing-publish-form label.wide,.writing-publish-checks.wide { grid-column:auto; } .writing-publish-dialog > footer { align-items:stretch; flex-direction:column; } }
    `}</style>
  </div>
}
