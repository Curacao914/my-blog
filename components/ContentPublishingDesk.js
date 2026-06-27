import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'

import { MarkdownDocument } from '@/components/content/MarkdownDocument'
import { formatCourseApiError, requestCourseJson } from '@/lib/course/clientApi'
import { isCourseContentSource } from '@/lib/contentPublishingModel'

const emptyForm = {
  title: '',
  summary: '',
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

const emptyTaxonomy = { categories: [], collections: [], tags: [] }

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

function EditableChoice({ id, label, value, onChange, options, placeholder }) {
  return <label>
    {label}
    <input list={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    <datalist id={id}>{options.map(option => <option key={option} value={option} />)}</datalist>
  </label>
}

function TagEditor({ tags = [], suggestions = [], onChange }) {
  const [draft, setDraft] = useState('')
  const selected = unique(tags)
  const available = suggestions.filter(tag => !selected.includes(tag))

  function add(values) {
    const next = unique([...selected, ...values.flatMap(value => String(value || '').split(/[，,]/))])
    onChange(next)
    setDraft('')
  }

  function remove(tag) {
    onChange(selected.filter(item => item !== tag))
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
      event.preventDefault()
      if (draft.trim()) add([draft])
    }
    if (event.key === 'Backspace' && !draft && selected.length) {
      remove(selected[selected.length - 1])
    }
  }

  return <div className='publishing-tag-editor wide'>
    <span className='publishing-field-label'>标签</span>
    <div className='publishing-tag-input'>
      {selected.map(tag => <button type='button' className='selected' key={tag} onClick={() => remove(tag)} title='移除标签'>
        {tag}<i>×</i>
      </button>)}
      <input
        list='publishing-tag-options'
        value={draft}
        onBlur={() => draft.trim() && add([draft])}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={selected.length ? '继续添加' : '输入或选择标签'}
      />
      <datalist id='publishing-tag-options'>{available.map(tag => <option key={tag} value={tag} />)}</datalist>
    </div>
    {available.length ? <div className='publishing-tag-suggestions' aria-label='已有标签'>
      {available.slice(0, 18).map(tag => <button type='button' key={tag} onClick={() => add([tag])}>{tag}</button>)}
    </div> : null}
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

  async function loadIndex() {
    const [contentData, courseData] = await Promise.all([
      requestCourseJson('/api/content/manage', {}, '发布内容读取失败'),
      requestCourseJson('/api/courses/notes', {}, '课程笔记读取失败')
    ])
    setItems(contentData.items || [])
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
  const collectionOptions = useMemo(
    () => unique([form.collection, ...taxonomy.collections]),
    [form.collection, taxonomy.collections]
  )
  const tagOptions = useMemo(
    () => unique([...(form.tags || []), ...taxonomy.tags]),
    [form.tags, taxonomy.tags]
  )

  function update(name, value) {
    setForm(current => ({ ...current, [name]: value }))
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
      setMessage(action === 'publish' ? '已经发布。' : action === 'withdraw' ? '已经撤回为草稿。' : '草稿已保存。')
      await loadIndex()
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
          <label className='wide'>摘要<textarea rows={3} value={form.summary} onChange={event => update('summary', event.target.value)} /></label>
          <EditableChoice id='publishing-category-options' label='栏目' value={form.category} onChange={value => update('category', value)} options={categoryOptions} placeholder='选择或新建栏目' />
          <EditableChoice id='publishing-collection-options' label='合集' value={form.collection} onChange={value => update('collection', value)} options={collectionOptions} placeholder='选择或新建合集' />
          <TagEditor tags={form.tags} suggestions={tagOptions} onChange={tags => update('tags', tags)} />
          <label className='wide'>链接路径<input value={form.slug} onChange={event => update('slug', event.target.value)} placeholder='notes/course/lesson-1' /></label>
          <label>访问方式<select value={form.accessMode} onChange={event => update('accessMode', event.target.value)}>
            <option value='private'>私密</option>
            <option value='public'>公开</option>
            <option value='password'>密码</option>
          </select></label>
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
          <button className='soft-button primary' type='button' disabled={busy} onClick={() => void save('publish')}>{publication?.status === 'published' ? '更新发布版本' : '发布'}</button>
          {publication?.status === 'published' ? <button className='soft-button danger' type='button' disabled={busy} onClick={() => void save('withdraw')}>撤回</button> : null}
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
  </section>
}
