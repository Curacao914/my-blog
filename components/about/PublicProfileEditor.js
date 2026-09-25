import { useEffect, useMemo, useState } from 'react'

import { DEFAULT_SITE_PROFILE, normalizeSiteProfile } from '@/lib/siteProfile'

function copyProfile(profile) {
  return JSON.parse(JSON.stringify(normalizeSiteProfile(profile || DEFAULT_SITE_PROFILE)))
}

function UploadImageButton({ kind, onUploaded }) {
  const [state, setState] = useState('idle')

  function choose(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setState('error')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      setState('uploading')
      try {
        const response = await fetch('/api/site-profile-image', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind, data: reader.result })
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.url) throw new Error(data.error || '上传失败')
        onUploaded(data.url)
        setState('done')
      } catch {
        setState('error')
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <label className={`profile-image-upload is-${state}`}>
      <input accept='image/jpeg,image/png,image/webp' onChange={choose} type='file' />
      {state === 'uploading' ? '上传中…' : state === 'error' ? '重试上传' : state === 'done' ? '已上传' : '选择图片'}
    </label>
  )
}

function SkillEditor({ item, index, onChange }) {
  return (
    <div className='profile-editor-skill'>
      <input aria-label={`技能组 ${index + 1} 名称`} value={item.group} onChange={event => onChange({ ...item, group: event.target.value })} placeholder='分组名称' />
      <input aria-label={`技能组 ${index + 1} 标签`} value={item.items.join('、')} onChange={event => onChange({ ...item, items: event.target.value.split(/[、,，]/).map(value => value.trim()).filter(Boolean) })} placeholder='用顿号分隔标签' />
    </div>
  )
}

function LinkEditor({ item, index, onChange }) {
  return (
    <div className='profile-editor-link'>
      <input aria-label={`链接 ${index + 1} 名称`} value={item.label} onChange={event => onChange({ ...item, label: event.target.value })} placeholder='链接名称' />
      <input aria-label={`链接 ${index + 1} 地址`} value={item.href} onChange={event => onChange({ ...item, href: event.target.value })} placeholder='https://… 或 /content' />
    </div>
  )
}

function EducationEditor({ item, index, onChange }) {
  return (
    <div className='profile-editor-school'>
      <span className='profile-editor-school-preview'>{item.logoUrl ? <img src={item.logoUrl} alt='' /> : <b>{item.school.slice(0, 1) || '校'}</b>}</span>
      <div>
        <input value={item.school} onChange={event => onChange({ ...item, school: event.target.value })} placeholder='学校' />
        <input value={item.program} onChange={event => onChange({ ...item, program: event.target.value })} placeholder='院系与专业' />
        <div className='profile-editor-inline'>
          <input value={item.period} onChange={event => onChange({ ...item, period: event.target.value })} placeholder='时间' />
          <input value={item.logoUrl} onChange={event => onChange({ ...item, logoUrl: event.target.value })} placeholder='校徽图片 URL' />
        </div>
        <UploadImageButton kind={`school-${index + 1}`} onUploaded={logoUrl => onChange({ ...item, logoUrl })} />
        <input value={item.href} onChange={event => onChange({ ...item, href: event.target.value })} placeholder='学校链接' />
      </div>
    </div>
  )
}

export function PublicProfileEditor() {
  const [form, setForm] = useState(() => copyProfile(DEFAULT_SITE_PROFILE))
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/site-profile', { credentials: 'same-origin' })
      .then(response => response.json())
      .then(data => {
        if (cancelled) return
        setForm(copyProfile(data?.profile || DEFAULT_SITE_PROFILE))
        setState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setState('ready')
      })
    return () => { cancelled = true }
  }, [])

  const preview = useMemo(() => normalizeSiteProfile(form), [form])
  const home = form.home || DEFAULT_SITE_PROFILE.home

  function updateHome(section, patch) {
    setForm(current => ({
      ...current,
      home: {
        ...current.home,
        [section]: { ...current.home?.[section], ...patch }
      }
    }))
  }

  function updateEducation(index, next) {
    setForm(current => ({ ...current, education: current.education.map((item, itemIndex) => itemIndex === index ? next : item) }))
  }

  function updateLink(index, next) {
    setForm(current => ({ ...current, links: current.links.map((item, itemIndex) => itemIndex === index ? next : item) }))
  }

  function updateSkill(index, next) {
    setForm(current => ({ ...current, skills: current.skills.map((item, itemIndex) => itemIndex === index ? next : item) }))
  }

  async function save(event) {
    event.preventDefault()
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/site-profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(preview)
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存失败')
      setForm(copyProfile(data.profile))
      setMessage('已保存')
      setState('saved')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
      setState('error')
    }
  }

  return (
    <section className='settings-section public-profile-settings home-page-settings'>
      <header><span>Homepage</span><h3>首页</h3></header>
      <div className='public-profile-editor-layout'>
        <form className='public-profile-editor-form' onSubmit={save}>
          <fieldset>
            <legend>首页状态</legend>
            <label className='settings-check-row'>
              <input type='checkbox' checked={home.status?.enabled !== false} onChange={event => updateHome('status', { enabled: event.target.checked })} />
              <span><strong>显示状态</strong></span>
            </label>
            <div className='profile-editor-inline'>
              <label><span>图标</span><input maxLength={12} value={home.status?.emoji || ''} onChange={event => updateHome('status', { emoji: event.target.value })} placeholder='✍️' /></label>
              <label><span>状态名</span><input value={home.status?.eyebrow || ''} onChange={event => updateHome('status', { eyebrow: event.target.value })} placeholder='论文写作' /></label>
            </div>
            <label><span>内容</span><input value={home.status?.title || ''} onChange={event => updateHome('status', { title: event.target.value })} placeholder='正在做什么' /></label>
            <label><span>补充说明</span><input value={home.status?.meta || ''} onChange={event => updateHome('status', { meta: event.target.value })} placeholder='可留空' /></label>
            <div className='profile-editor-inline'>
              <label><span>进度</span><input min='0' max='100' type='number' value={home.status?.progress ?? 0} onChange={event => updateHome('status', { progress: event.target.value })} /></label>
              <label><span>色调</span><select value={home.status?.tone || 'mint'} onChange={event => updateHome('status', { tone: event.target.value })}><option value='mint'>薄荷</option><option value='blue'>冷蓝</option><option value='sand'>暖金</option><option value='lilac'>淡紫</option><option value='neutral'>中性</option></select></label>
            </div>
            <label><span>链接</span><input value={home.status?.href || ''} onChange={event => updateHome('status', { href: event.target.value })} placeholder='/desk/writing' /></label>
          </fieldset>

          <fieldset>
            <legend>文章轮播</legend>
            <label className='settings-check-row'>
              <input type='checkbox' checked={home.reading?.enabled !== false} onChange={event => updateHome('reading', { enabled: event.target.checked })} />
              <span><strong>显示 Reading 小组件</strong></span>
            </label>
            <label><span>标题</span><input value={home.reading?.title || ''} onChange={event => updateHome('reading', { title: event.target.value })} /></label>
            <div className='profile-editor-inline'>
              <label><span>同时轮播</span><select value={home.reading?.count || 5} onChange={event => updateHome('reading', { count: Number(event.target.value) })}><option value='3'>3 篇</option><option value='4'>4 篇</option><option value='5'>5 篇</option><option value='6'>6 篇</option><option value='7'>7 篇</option></select></label>
              <label><span>候选更新</span><select value={home.reading?.refreshHours || 6} onChange={event => updateHome('reading', { refreshHours: Number(event.target.value) })}><option value='3'>每 3 小时</option><option value='6'>每 6 小时</option><option value='12'>每 12 小时</option><option value='24'>每天</option></select></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>首页组件</legend>
            <div className='profile-editor-inline'>
              <label><span>主窗口标题</span><input value={home.libraryTitle || ''} onChange={event => setForm(current => ({ ...current, home: { ...current.home, libraryTitle: event.target.value } }))} /></label>
              <label><span>更新区标题</span><input value={home.recentTitle || ''} onChange={event => setForm(current => ({ ...current, home: { ...current.home, recentTitle: event.target.value } }))} /></label>
            </div>
            <label className='settings-check-row'><input type='checkbox' checked={home.quote?.enabled !== false} onChange={event => updateHome('quote', { enabled: event.target.checked })} /><span><strong>随机句</strong></span></label>
            <label><span>随机句更新</span><select value={home.quote?.refreshHours || 6} onChange={event => updateHome('quote', { refreshHours: Number(event.target.value) })}><option value='3'>每 3 小时</option><option value='6'>每 6 小时</option><option value='12'>每 12 小时</option><option value='24'>每天</option></select></label>
            <label className='settings-check-row'><input type='checkbox' checked={home.launchpad?.enabled !== false} onChange={event => updateHome('launchpad', { enabled: event.target.checked })} /><span><strong>快捷工具</strong></span></label>
            <label className='settings-check-row'><input type='checkbox' checked={home.signature?.enabled !== false} onChange={event => updateHome('signature', { enabled: event.target.checked })} /><span><strong>动态签名</strong></span></label>
          </fieldset>

          <fieldset>
            <legend>关于页资料</legend>
            <label><span>名称</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
            <label><span>身份标签</span><input value={form.subtitle} onChange={event => setForm(current => ({ ...current, subtitle: event.target.value }))} /></label>
            <label><span>地点</span><input value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} /></label>
            <label><span>头像 URL</span><input value={form.avatarUrl} onChange={event => setForm(current => ({ ...current, avatarUrl: event.target.value }))} placeholder='https://…' /></label>
            <UploadImageButton kind='avatar' onUploaded={avatarUrl => setForm(current => ({ ...current, avatarUrl }))} />
            <label><span>简介</span><textarea rows={4} value={form.intro} onChange={event => setForm(current => ({ ...current, intro: event.target.value }))} /></label>
            <label><span>About 第一段</span><textarea rows={3} value={form.about[0] || ''} onChange={event => setForm(current => ({ ...current, about: [event.target.value, current.about[1] || ''] }))} /></label>
            <label><span>About 第二段</span><textarea rows={3} value={form.about[1] || ''} onChange={event => setForm(current => ({ ...current, about: [current.about[0] || '', event.target.value] }))} /></label>
          </fieldset>

          <fieldset><legend>教育经历</legend>{form.education.slice(0, 2).map((item, index) => <EducationEditor item={item} index={index} key={index} onChange={next => updateEducation(index, next)} />)}</fieldset>
          <fieldset><legend>Skills</legend>{form.skills.slice(0, 4).map((item, index) => <SkillEditor item={item} index={index} key={index} onChange={next => updateSkill(index, next)} />)}</fieldset>
          <fieldset><legend>页面链接</legend>{form.links.slice(0, 3).map((item, index) => <LinkEditor item={item} index={index} key={index} onChange={next => updateLink(index, next)} />)}</fieldset>

          <div className='settings-actions'>
            <button className='is-primary' disabled={state === 'saving' || state === 'loading'} type='submit'>{state === 'saving' ? '保存中…' : '保存首页设置'}</button>
            <a href='/' target='_blank' rel='noreferrer'>预览首页 ↗</a>
            <a href='/about' target='_blank' rel='noreferrer'>预览关于页 ↗</a>
          </div>
          {message ? <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
        </form>

        <aside className='public-profile-live-preview public-profile-home-preview'>
          <small>首页状态</small>
          <section className={`profile-preview-status tone-${preview.home.status.tone}`}>
            <b aria-hidden='true'>{preview.home.status.emoji}</b>
            <span><small>{preview.home.status.eyebrow}</small><strong>{preview.home.status.title}</strong>{preview.home.status.meta ? <em>{preview.home.status.meta}</em> : null}</span>
            {preview.home.status.progress ? <i><u style={{ width: `${preview.home.status.progress}%` }} /></i> : null}
          </section>
          <div className='profile-preview-home-settings'>
            <span>轮播 {preview.home.reading.count} 篇</span>
            <span>{preview.home.reading.refreshHours} 小时换一组</span>
            <span>{preview.home.quote.enabled ? '随机句开启' : '随机句关闭'}</span>
            <span>{preview.home.signature.enabled ? '签名开启' : '签名关闭'}</span>
          </div>
          <hr />
          <small>关于页</small>
          <span className='profile-preview-avatar'>{preview.avatarUrl ? <img src={preview.avatarUrl} alt='' /> : <b>{preview.name.slice(0, 1)}</b>}</span>
          <h4>{preview.name}</h4>
          <p>{preview.subtitle}</p>
        </aside>
      </div>
    </section>
  )
}
