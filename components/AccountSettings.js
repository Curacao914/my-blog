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
      setMessage('已保存')
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
    <header><span>Account</span><h3>账号</h3></header>

    <div className='settings-profile-summary'>
      <span className='settings-profile-avatar'>
        {previewUrl && !previewFailed ? <img src={previewUrl} alt='' onError={() => setPreviewFailed(true)} /> : <b>{avatarLetter(profile, form.displayName)}</b>}
      </span>
      <div>
        <strong>{form.displayName || profile.displayName || '未命名用户'}</strong>
        <span>{profile.email || '未提供邮箱'}</span>
        <small>{profile.role === 'owner' ? '管理员' : '成员'} · {profile.status === 'active' ? '已启用' : profile.status}</small>
      </div>
    </div>

    {session?.impersonating ? <div className='settings-inline-notice'>正在查看 {profile.displayName || profile.email || '成员'}；资料编辑已锁定。返回管理员身份后可在“成员与权限”中修改。</div> : null}

    <form className='settings-form account-profile-form' onSubmit={save}>
      <label><span>显示昵称</span><input disabled={readOnly || state === 'saving'} maxLength={80} value={form.displayName} onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))} placeholder='昵称' /></label>
      <label><span>头像 URL</span><input disabled={readOnly || state === 'saving'} inputMode='url' value={form.avatarUrl} onChange={event => { setPreviewFailed(false); setForm(current => ({ ...current, avatarUrl: event.target.value })) }} placeholder='https://example.com/avatar.png' /></label>
      <div className='settings-actions'>
        <button className='is-primary' disabled={readOnly || state === 'saving'} type='submit'>{state === 'saving' ? '保存中…' : '保存'}</button>
        <button disabled={readOnly || state === 'saving'} type='button' onClick={useAccountAvatar}>使用登录头像</button>
      </div>
    </form>

    {message ? <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
  </section>
}
