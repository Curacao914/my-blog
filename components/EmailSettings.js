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
      setMeta(data.integration || {}); setForm(current => ({ ...current, apiKey: '' })); setState('ready'); setMessage('已保存')
    } catch (error) { setState('error'); setMessage(error.message) }
  }

  async function remove() {
    if (!window.confirm('删除当前邮件配置？')) return
    const response = await fetch('/api/settings/email', { method: 'DELETE', credentials: 'same-origin' })
    if (response.ok) { setMeta({}); setForm({ apiKey: '', from: '', enabled: true }); setMessage('已删除') }
  }

  const disabled = state === 'loading' || state === 'saving'
  return <section className='settings-section'>
    <header><span>Email</span><h3>邮件发送</h3></header>
    <div className='settings-status-line'><b className={meta.effective?.configured ? 'is-ok' : ''}>{meta.effective?.configured ? '可用' : '未配置'}</b><span>{meta.secretHint ? `密钥 ${meta.secretHint}` : meta.effective?.source === 'environment' ? '环境配置' : '无密钥'}</span></div>
    <form className='settings-form' onSubmit={save}>
      <label><span>Resend API Key</span><input autoComplete='off' disabled={disabled} type='password' value={form.apiKey} onChange={event => setForm(current => ({ ...current, apiKey: event.target.value }))} placeholder={meta.secretHint ? '留空保留原密钥' : 're_…'} /></label>
      <label><span>发件人</span><input disabled={disabled} value={form.from} onChange={event => setForm(current => ({ ...current, from: event.target.value }))} placeholder='Law-Tech <reminders@example.com>' /></label>
      <div className='settings-actions'><button className='is-primary' disabled={disabled} type='submit'>{state === 'saving' ? '保存中…' : '保存'}</button>{meta.configured ? <button disabled={disabled} type='button' onClick={remove}>删除</button> : null}</div>
      {message ? <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
    </form>
  </section>
}
