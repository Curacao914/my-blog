import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo, useState, useEffect } from 'react'

import { MarkdownDocument } from '@/components/content/MarkdownDocument'
import { formatCourseApiError, requestCourseJson } from '@/lib/course/clientApi'
import { isCourseContentSource } from '@/lib/contentPublishingModel'

const emptyForm = {
  title: '',
  summary: '',
  cover: '',
  slug: '',
  category: '遇事不决',
  collection: '',
  tags: [],
  accessMode: 'private',
  password: '',
  expiresAt: '',
  allowIndexing: true,
  allowRss: true,
  allowSitemap: true,
  showInRecent: true,
  pinned: false
}

const emptyTaxonomy = { categories: [], collections: [], collectionsByCategory: {}, tags: [] }

function unique(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
}

function sourceLink(item) {
  if (!isCourseContentSource(item.source) || !item.sourceId) return ''
  const [jobId, lessonKey] = String(item.sourceId).split(':')
  if (!jobId || !lessonKey || /^\d+$/.test(lessonKey)) return ''
  return `/desk/publish?job=${encodeURIComponent(jobId)}&lesson=${encodeURIComponent(lessonKey)}`
}

function EditableChoice({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const keyword = String(value || '').trim().toLocaleLowerCase('zh-CN')
  const visible = unique(options).filter(option => !keyword || option.toLocaleLowerCase('zh-CN').includes(keyword))

  return <label className='publishing-choice'>
    <span>{label}</span>
    <div className={`publishing-choice-control ${open ? 'is-open' : ''}`} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <input
        value={value}
        onChange={event => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      <button type='button' aria-label={`展开${label}选项`} aria-expanded={open} onClick={() => setOpen(current => !current)}>⌄</button>
      {open ? <div className='publishing-choice-menu' role='listbox'>
        {visible.map(option => <button
          type='button'
          role='option'
          aria-selected={option === value}
          className={option === value ? 'active' : ''}
          key={option}
          onClick={() => {
            onChange(option)
            setOpen(false)
          }}
        >{option}</button>)}
        {!visible.length ? <p>{value.trim() ? `将新建“${value.trim()}”` : '暂无已有选项，可直接输入新名称。'}</p> : null}
      </div> : null}
    </div>
  </label>
}

function TagEditor({ tags = [], suggestions = [], onChange }) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const selected = unique(tags)
  const keyword = draft.trim().toLocaleLowerCase('zh-CN')
  const available = unique(suggestions)
    .filter(tag => !selected.includes(tag))
    .filter(tag => !keyword || tag.toLocaleLowerCase('zh-CN').includes(keyword))

  function add(values) {
    const next = unique([...selected, ...values.flatMap(value => String(value || '').split(/[，,]/))])
    onChange(next)
    setDraft('')
    setOpen(true)
  }

  function remove(tag) {
    onChange(selected.filter(item => item !== tag))
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
      event.preventDefault()
      if (draft.trim()) add([draft])
    }
    if (event.key === 'Backspace' && !draft && selected.length) remove(selected[selected.length - 1])
    if (event.key === 'Escape') setOpen(false)
  }

  return <div className='publishing-tag-editor wide'>
    <span className='publishing-field-label'>标签</span>
    <div className='publishing-tag-shell' onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        if (draft.trim()) add([draft])
        setOpen(false)
      }
    }}>
      <div className='publishing-tag-input'>
        {selected.map(tag => <button type='button' className='selected' key={tag} onClick={() => remove(tag)} title='移除标签'>
          {tag}<i>×</i>
        </button>)}
        <input
          value={draft}
          onChange={event => {
            setDraft(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length ? '添加' : '输入或选择标签'}
        />
      </div>
      {open ? <div className='publishing-tag-menu' aria-label='已有标签'>
        {available.slice(0, 30).map(tag => <button type='button' key={tag} onMouseDown={event => event.preventDefault()} onClick={() => add([tag])}>{tag}</button>)}
        {!available.length ? <p>{draft.trim() ? `按回车新建“${draft.trim()}”` : '没有更多已有标签。'}</p> : null}
      </div> : null}
    </div>
  </div>
}

export function ContentPublishingDesk() {
  const router = useRouter()
  const jobId = String(router.query?.job || '')
  const lessonKey = String(router.query?.lesson || '')
  const [source, setSource] = useState(null)
  const [publication, setPublication] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [items, setItems] = useState([])
  const [courses, setCourses] = useState([])
  const [taxonomy, setTaxonomy] = useState(emptyTaxonomy)
  const [mode, setMode] = useState('settings')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [summaryBusy, setSummaryBusy] = useState(false)
  const [canPublish, setCanPublish] = useState(false)

  async function loadIndex() {
    const [contentData, courseData] = await Promise.all([
      requestCourseJson('/api/content/manage', {}, '发布内容读取失败'),
      requestCourseJson('/api/courses/notes', {}, '课程笔记读取失败')
    ])
    setItems(contentData.items || [])
    setCanPublish(Boolean(contentData.canPublish))
    setTaxonomy({ ...emptyTaxonomy, ...(contentData.taxonomy || {}) })
    setCourses(courseData.courses || [])
  }

  async function loadSource() {
    if (!jobId || !lessonKey) {
      setSource(null)
      setPublication(null)
      setForm(emptyForm)
      return
    }
    const data = await requestCourseJson(
      `/api/courses/jobs/${encodeURIComponent(jobId)}/publication?lesson=${encodeURIComponent(lessonKey)}`,
      {},
      '课程笔记发布信息读取失败'
    )
    setSource(data.source)
    if (typeof data.canPublish === 'boolean') setCanPublish(data.canPublish)
    setPublication(data.publication)
    setForm({ ...emptyForm, ...(data.settings || {}), tags: unique(data.settings?.tags || []) })
  }

  useEffect(() => {
    if (!router.isReady) return
    Promise.all([loadIndex(), loadSource()]).catch(error => {
      setMessage(formatCourseApiError(error, '发布台读取失败'))
    })
  }, [router.isReady, jobId, lessonKey])

  const availableNotes = useMemo(() => courses.flatMap(course =>
    (course.lessons || [])
      .filter(lesson => lesson.hasNote && !lesson.trashed)
      .map(lesson => ({ course, lesson }))
  ), [courses])

  const categoryOptions = useMemo(
    () => unique([form.category, ...taxonomy.categories]),
    [form.category, taxonomy.categories]
  )
  const collectionOptions = useMemo(() => {
    const scoped = taxonomy.collectionsByCategory?.[form.category] || []
    return unique([form.collection, ...scoped, ...(!scoped.length ? taxonomy.collections : [])])
  }, [form.category, form.collection, taxonomy.collections, taxonomy.collectionsByCategory])
  const tagOptions = useMemo(
    () => unique([...(form.tags || []), ...taxonomy.tags]),
    [form.tags, taxonomy.tags]
  )

  function update(name, value) {
    setForm(current => ({ ...current, [name]: value }))
  }

  function rememberCurrentTaxonomy() {
    setTaxonomy(current => {
      const category = String(form.category || '').trim()
      const collection = String(form.collection || '').trim()
      const collectionsByCategory = { ...(current.collectionsByCategory || {}) }
      if (category && collection) {
        collectionsByCategory[category] = unique([...(collectionsByCategory[category] || []), collection])
      }
      return {
        categories: unique([...current.categories, category]),
        collections: unique([...current.collections, collection]),
        collectionsByCategory,
        tags: unique([...current.tags, ...(form.tags || [])])
      }
    })
  }

  async function generateSummary() {
    if (!source?.bodyMarkdown) return
    setSummaryBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/content/summary', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: form.title || source.lessonTitle, markdown: source.bodyMarkdown })
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

  async function save(action) {
    if (!source) return
    setBusy(true)
    setMessage('')
    try {
      const data = await requestCourseJson(
        `/api/courses/jobs/${encodeURIComponent(jobId)}/publication`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ lessonKey, action, settings: form })
        },
        action === 'publish' ? '发布失败' : action === 'withdraw' ? '撤回失败' : '草稿保存失败'
      )
      setPublication(data.publication)
      setForm(current => ({ ...current, ...(data.publication?.settings || {}), tags: unique(data.publication?.settings?.tags || current.tags) }))
      setItems(current => [data.publication, ...current.filter(item => item.id !== data.publication?.id)].filter(Boolean))
      rememberCurrentTaxonomy()
      setMessage(action === 'publish' ? '已经发布。' : action === 'withdraw' ? '已经撤回为草稿。' : '草稿已保存。')
      void loadIndex().catch(error => console.warn('[publishing desk] background refresh failed', error))
    } catch (error) {
      setMessage(formatCourseApiError(error, '发布操作失败'))
    } finally {
      setBusy(false)
    }
  }

  return <section className='publishing-desk'>
    <header className='publishing-head'>
      <div>
        <span>Publishing Desk</span>
        <h2>内容发布</h2>
        <p>设置内容归档、访问方式和公开信息。</p>
      </div>
      <div className='publishing-head-actions'>
        <Link className='soft-button' href='/content'>查看公开内容</Link>
        <Link className='soft-button' href='/desk/materials'>回到笔记库</Link>
      </div>
    </header>

    {message ? <p className={`status-line ${/失败|错误/.test(message) ? 'error' : ''}`}>{message}</p> : null}

    {source ? <div className='publishing-workspace'>
      <aside className='publishing-source'>
        <span>当前来源</span>
        <h3>{source.courseName}</h3>
        <p>{source.lessonTitle}</p>
        <small>{source.teacher || '未填写教师'} · 第 {source.lessonOrder || '—'} 课</small>
        {publication ? <div className='publishing-state'>
          <strong>{publication.status === 'published' ? '已发布' : '草稿'}</strong>
          <span>版本 {publication.version || 1}</span>
          {publication.slug ? <Link href={`/content/${publication.slug}`}>打开页面 ↗</Link> : null}
        </div> : <div className='publishing-state'><strong>尚未建立发布草稿</strong></div>}
      </aside>

      <section className='publishing-editor'>
        <div className='publishing-tabs'>
          <button type='button' className={mode === 'settings' ? 'active' : ''} onClick={() => setMode('settings')}>设置</button>
          <button type='button' className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>预览</button>
        </div>

        {mode === 'settings' ? <div className='publishing-form'>
          <label>标题<input value={form.title} onChange={event => update('title', event.target.value)} /></label>
          <div className='publishing-summary-field wide'>
            <div><span>摘要</span><button disabled={busy || summaryBusy} type='button' onClick={generateSummary}>{summaryBusy ? '生成中…' : 'AI 生成'}</button></div>
            <textarea rows={3} value={form.summary} onChange={event => update('summary', event.target.value)} />
          </div>
          <label className='wide'>封面图片<input value={form.cover || ''} onChange={event => update('cover', event.target.value)} placeholder='粘贴图片 URL；留空则使用自动生成封面' /></label>
          <EditableChoice label='栏目' value={form.category} onChange={value => update('category', value)} options={categoryOptions} placeholder='选择或新建栏目' />
          <EditableChoice label='合集' value={form.collection} onChange={value => update('collection', value)} options={collectionOptions} placeholder='选择或新建合集' />
          <TagEditor tags={form.tags} suggestions={tagOptions} onChange={tags => update('tags', tags)} />
          <label className='wide'>链接路径<input value={form.slug} onChange={event => update('slug', event.target.value)} placeholder='notes/course/lesson-1' /></label>
          <label>访问方式<select value={form.accessMode} onChange={event => update('accessMode', event.target.value)}>
            <option value='private'>私密</option>
            {canPublish ? <option value='public'>公开</option> : null}
            {canPublish ? <option value='password'>密码</option> : null}
          </select>{!canPublish ? <small>当前身份只能保存私人草稿。</small> : null}</label>
          {form.accessMode === 'password' ? <label>访问密码<input type='password' value={form.password || ''} onChange={event => update('password', event.target.value)} placeholder={publication ? '留空则沿用原密码' : '设置密码'} /></label> : null}
          {form.accessMode === 'password' ? <label>有效期<input type='datetime-local' value={form.expiresAt || ''} onChange={event => update('expiresAt', event.target.value)} /></label> : null}
          <div className='publishing-checks wide'>
            <label><input type='checkbox' checked={form.showInRecent !== false} onChange={event => update('showInRecent', event.target.checked)} />显示在最近内容</label>
            <label><input type='checkbox' checked={Boolean(form.pinned)} onChange={event => update('pinned', event.target.checked)} />置顶</label>
            {form.accessMode === 'public' ? <>
              <label><input type='checkbox' checked={form.allowIndexing !== false} onChange={event => update('allowIndexing', event.target.checked)} />允许搜索引擎</label>
              <label><input type='checkbox' checked={form.allowRss !== false} onChange={event => update('allowRss', event.target.checked)} />进入 RSS</label>
              <label><input type='checkbox' checked={form.allowSitemap !== false} onChange={event => update('allowSitemap', event.target.checked)} />进入 Sitemap</label>
            </> : null}
          </div>
        </div> : <article className='publishing-preview'>
          <div className={`publishing-preview-cover ${form.cover ? 'has-image' : ''}`} style={form.cover ? { backgroundImage: `url("${form.cover}")` } : undefined}>
            {!form.cover ? <><span>{form.category || '内容'}</span><strong>{form.collection || source.courseName}</strong></> : null}
          </div>
          <div className='publishing-preview-meta'>
            <span>{form.category}</span>
            <span>{form.collection}</span>
            <span>{form.accessMode === 'public' ? '公开' : form.accessMode === 'password' ? '密码' : '私密'}</span>
          </div>
          <h1>{form.title || source.lessonTitle}</h1>
          <p>{form.summary}</p>
          <div className='publishing-preview-tags'>{(form.tags || []).map(tag => <span key={tag}>{tag}</span>)}</div>
          <MarkdownDocument markdown={source.bodyMarkdown || ''} title={form.title || source.lessonTitle} />
        </article>}

        <div className='publishing-actions'>
          <button className='soft-button' type='button' disabled={busy} onClick={() => void save('draft')}>保存草稿</button>
          {canPublish ? <button className='soft-button primary' type='button' disabled={busy} onClick={() => void save('publish')}>{publication?.status === 'published' ? '更新发布版本' : '发布'}</button> : null}
          {canPublish && publication?.status === 'published' ? <button className='soft-button danger' type='button' disabled={busy} onClick={() => void save('withdraw')}>撤回</button> : null}
        </div>
      </section>
    </div> : <div className='publishing-picker'>
      <div>
        <span>从课程笔记开始</span>
        <h3>选择一份已经完成的课次笔记</h3>
        <p>课程笔记默认按栏目、课程合集和课次内容归档。</p>
      </div>
      <div className='publishing-note-list'>
        {availableNotes.map(({ course, lesson }) => <Link
          className='publishing-note-row'
          href={`/desk/publish?job=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(lesson.key)}`}
          key={`${course.id}:${lesson.key}`}>
          <div><strong>{lesson.title}</strong><span>{course.courseName} · 约 {Number(lesson.charCount || 0).toLocaleString('zh-CN')} 字</span></div>
          <span>设置发布 →</span>
        </Link>)}
        {!availableNotes.length ? <p className='empty-copy'>笔记库里还没有可发布的最终笔记。</p> : null}
      </div>
    </div>}

    <section className='publishing-index'>
      <header><div><span>内容记录</span><h3>草稿与已发布内容</h3></div><small>{items.length} 条</small></header>
      <div className='publishing-index-list'>
        {items.map(item => {
          const editLink = sourceLink(item)
          const folder = item.settings?.folderPath || []
          return <article key={item.id}>
            <div>
              <span>{item.status === 'published' ? '已发布' : '草稿'}</span>
              <h4>{item.title}</h4>
              <p>{folder.join(' / ') || '未归档'} · v{item.version || 1}</p>
            </div>
            <div className='course-row-actions'>
              {editLink ? <Link className='soft-button' href={editLink}>设置</Link> : null}
              {item.status === 'published' ? <Link className='soft-button primary' href={`/content/${item.slug}`}>查看</Link> : null}
            </div>
          </article>
        })}
      </div>
    </section>
    <style jsx>{`
      .publishing-summary-field { display:grid; gap:6px; }
      .publishing-summary-field > div { display:flex; align-items:center; justify-content:space-between; gap:12px; color:var(--muted); font-size:10px; }
      .publishing-summary-field textarea { width:100%; border:1px solid rgba(17,63,49,.1); border-radius:12px; padding:10px 11px; color:var(--ink); background:rgba(255,255,255,.58); outline:none; resize:vertical; line-height:1.65; }
      .publishing-summary-field button { border:0; border-radius:999px; padding:5px 9px; color:var(--leaf); background:rgba(220,233,223,.66); cursor:pointer; font-size:10px; }
    `}</style>
  </section>
}
