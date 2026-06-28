import { useEffect, useState } from 'react'

export function EmailSettings() {
  const [form, setForm] = useState({ apiKey: '', from: '', enabled: true })
  const [meta, setMeta] = useState({})
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/settings/email', { credentials: 'same-origin' }).then(async response => {
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || '读取邮件配置失败'); return data
    }).then(data => {
      setMeta({ ...data.integration, effective: data.effective })
      setForm(current => ({ ...current, enabled: data.integration?.enabled !== false, from: data.integration?.config?.from || '', apiKey: '' }))
      setState('ready')
    }).catch(error => { setMessage(error.message); setState('error') })
  }, [])

  async function save(event) {
    event.preventDefault(); setState('saving'); setMessage('')
    try {
      const response = await fetch('/api/settings/email', { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || '保存失败')
      setMeta(data.integration || {}); setForm(current => ({ ...current, apiKey: '' })); setState('ready'); setMessage('邮件发送配置已保存。')
    } catch (error) { setState('error'); setMessage(error.message) }
  }

  async function remove() {
    if (!window.confirm('删除当前身份保存的邮件发送配置？')) return
    const response = await fetch('/api/settings/email', { method: 'DELETE', credentials: 'same-origin' })
    if (response.ok) { setMeta({}); setForm({ apiKey: '', from: '', enabled: true }); setMessage('个人邮件配置已删除。') }
  }

  const disabled = state === 'loading' || state === 'saving'
  return <section className='settings-section'>
    <header><span>Email provider</span><h3>我的邮件发送</h3><p>提醒邮件使用当前成员自己的 Resend Key 和发件人；管理员的邮件额度不会自动共享。</p></header>
    <div className='settings-status-line'><b className={meta.effective?.configured ? 'is-ok' : ''}>{meta.effective?.configured ? '可以发送' : '尚未配置'}</b><span>{meta.secretHint ? `已保存密钥 · ${meta.secretHint}` : meta.effective?.source === 'environment' ? '管理员环境配置' : '没有保存密钥'}</span></div>
    <form className='settings-form' onSubmit={save}>
      <label><span>Resend API Key</span><input autoComplete='off' disabled={disabled} type='password' value={form.apiKey} onChange={event => setForm(current => ({ ...current, apiKey: event.target.value }))} placeholder={meta.secretHint ? '留空则保留已保存密钥' : 're_…'} /></label>
      <label><span>发件人</span><input disabled={disabled} value={form.from} onChange={event => setForm(current => ({ ...current, from: event.target.value }))} placeholder='Law-Tech <reminders@example.com>' /></label>
      <div className='settings-actions'><button className='is-primary' disabled={disabled} type='submit'>{state === 'saving' ? '保存中…' : '保存邮件配置'}</button>{meta.configured ? <button disabled={disabled} type='button' onClick={remove}>删除个人配置</button> : null}</div>
      {message ? <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
      <small>发件域名仍需在 Resend 中验证。测试身份会使用被测试成员的邮件配置。</small>
    </form>
  </section>
}
