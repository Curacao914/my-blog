import { useEffect, useMemo, useState } from 'react'

import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'

function initialForm(profile = {}) {
  return {
    displayName: profile.displayName || '',
    avatarUrl: profile.avatarUrl || ''
  }
}

function avatarLetter(profile = {}, displayName = '') {
  return String(displayName || profile.displayName || profile.email || 'C').trim().slice(0, 1).toUpperCase() || 'C'
}

export function AccountSettings() {
  const { session, refresh } = useWorkspaceSession()
  const profile = session?.profile || session?.actor || {}
  const actor = session?.actor || profile
  const [form, setForm] = useState(() => initialForm(profile))
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const readOnly = Boolean(session?.impersonating)

  useEffect(() => {
    setForm(initialForm(profile))
    setPreviewFailed(false)
  }, [profile.id, profile.displayName, profile.avatarUrl])

  const previewUrl = useMemo(() => String(form.avatarUrl || '').trim(), [form.avatarUrl])

  async function save(event) {
    event.preventDefault()
    if (readOnly) return
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '资料保存失败')
      setMessage('个人资料已保存。')
      await refresh()
      setState('saved')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '资料保存失败')
      setState('error')
    }
  }

  function useAccountAvatar() {
    setForm(current => ({ ...current, avatarUrl: '' }))
    setPreviewFailed(false)
  }

  return <section className='settings-section account-settings'>
    <header><span>Account</span><h3>账号与当前身份</h3><p>昵称与头像只影响工作台展示；私人数据、邮件和 AI 配置仍跟随当前身份。</p></header>

    <div className='settings-profile-summary'>
      <span className='settings-profile-avatar'>
        {previewUrl && !previewFailed ? <img src={previewUrl} alt='' onError={() => setPreviewFailed(true)} /> : <b>{avatarLetter(profile, form.displayName)}</b>}
      </span>
      <div><strong>{form.displayName || profile.displayName || '未命名用户'}</strong><span>{profile.email || '未提供邮箱'}</span><small>{profile.role === 'owner' ? '管理员' : '成员'} · {profile.status === 'active' ? '已启用' : profile.status}</small></div>
    </div>

    {session?.impersonating ? <div className='settings-inline-notice'>当前由 <strong>{actor.displayName || actor.email || '管理员'}</strong> 以成员身份查看。为避免误改成员资料，请退出测试身份后在“成员与权限”中管理。</div> : null}

    <form className='settings-form account-profile-form' onSubmit={save}>
      <label><span>显示昵称</span><input disabled={readOnly || state === 'saving'} maxLength={80} value={form.displayName} onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))} placeholder='在工作台中显示的名字' /></label>
      <label><span>头像图片 URL</span><input disabled={readOnly || state === 'saving'} inputMode='url' value={form.avatarUrl} onChange={event => { setPreviewFailed(false); setForm(current => ({ ...current, avatarUrl: event.target.value })) }} placeholder='https://example.com/avatar.png' /><small>图片仍由图床托管，站内只保存 URL，不上传图片文件。</small></label>
      <div className='settings-actions'>
        <button className='is-primary' disabled={readOnly || state === 'saving'} type='submit'>{state === 'saving' ? '保存中…' : '保存资料'}</button>
        <button disabled={readOnly || state === 'saving'} type='button' onClick={useAccountAvatar}>使用登录账户头像</button>
      </div>
    </form>

    {message ? <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}

    <dl className='settings-definition-list'>
      <div><dt>数据空间</dt><dd>日程、笔记、阅读、课程、草稿与提醒只属于当前身份。</dd></div>
      <div><dt>私人配置</dt><dd>AI API、模型和邮件发送配置不会与其他成员共用。</dd></div>
      <div><dt>公开发布</dt><dd>{profile.role === 'owner' || profile.permissions?.publish ? '当前身份拥有公开发布权限。' : '当前身份只能保存私人草稿。'}</dd></div>
    </dl>
  </section>
}
