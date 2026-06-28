import { useEffect, useState } from 'react'

const empty = { enabled: true, baseUrl: 'https://api.openai.com/v1', apiKey: '', defaultModel: '', scheduleModel: '', outlineModel: '', writerModel: '', reviewerModel: '', revisionModel: '', finalReviewModel: '' }

export function AiSettings() {
  const [form, setForm] = useState(empty)
  const [meta, setMeta] = useState({})
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  async function load() {
    setState('loading')
    const response = await fetch('/api/settings/ai', { credentials: 'same-origin' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '读取 AI 配置失败')
    const config = data.integration?.config || {}
    setMeta({ ...data.integration, effective: data.effective })
    setForm(current => ({ ...current, enabled: data.integration?.enabled !== false, baseUrl: data.integration?.baseUrl || current.baseUrl, ...config, apiKey: '' }))
    setState('ready')
  }

  useEffect(() => { load().catch(error => { setMessage(error.message); setState('error') }) }, [])

  function update(key, value) { setForm(current => ({ ...current, [key]: value })); setMessage('') }

  async function save(event) {
    event.preventDefault(); setState('saving'); setMessage('')
    try {
      const response = await fetch('/api/settings/ai', { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存 AI 配置失败')
      setMeta(data.integration || {})
      setForm(current => ({ ...current, apiKey: '' }))
      setState('ready'); setMessage('AI 配置已保存。')
    } catch (error) { setState('error'); setMessage(error.message) }
  }

  async function remove() {
    if (!window.confirm('删除当前身份保存的 AI 配置？')) return
    const response = await fetch('/api/settings/ai', { method: 'DELETE', credentials: 'same-origin' })
    if (!response.ok) return setMessage('删除失败。')
    setForm(empty); setMeta({}); setMessage('个人 AI 配置已删除。')
  }

  const disabled = state === 'loading' || state === 'saving'
  return <section className='settings-section'>
    <header><span>AI provider</span><h3>我的 AI</h3><p>每个成员保存自己的 API Key 和模型。成员不会使用管理员的全局 Key。</p></header>
    <div className='settings-status-line'><b className={meta.effective?.configured ? 'is-ok' : ''}>{meta.effective?.configured ? '可以调用' : '尚未完整配置'}</b><span>{meta.secretHint ? `已保存密钥 · ${meta.secretHint}` : meta.effective?.source === 'environment' ? '管理员环境配置' : '没有保存密钥'}</span></div>
    <form className='settings-form' onSubmit={save}>
      <label><span>API 地址</span><input disabled={disabled} value={form.baseUrl} onChange={event => update('baseUrl', event.target.value)} placeholder='https://api.openai.com/v1' /></label>
      <label><span>API Key</span><input autoComplete='off' disabled={disabled} type='password' value={form.apiKey} onChange={event => update('apiKey', event.target.value)} placeholder={meta.secretHint ? '留空则保留已保存密钥' : 'sk-…'} /></label>
      <div className='settings-form-grid'>
        <label><span>默认模型</span><input disabled={disabled} value={form.defaultModel} onChange={event => update('defaultModel', event.target.value)} /></label>
        <label><span>日程解析</span><input disabled={disabled} value={form.scheduleModel} onChange={event => update('scheduleModel', event.target.value)} placeholder='留空使用默认模型' /></label>
        <label><span>课程大纲</span><input disabled={disabled} value={form.outlineModel} onChange={event => update('outlineModel', event.target.value)} /></label>
        <label><span>节点写作</span><input disabled={disabled} value={form.writerModel} onChange={event => update('writerModel', event.target.value)} /></label>
        <label><span>独立审查</span><input disabled={disabled} value={form.reviewerModel} onChange={event => update('reviewerModel', event.target.value)} /></label>
        <label><span>局部修订</span><input disabled={disabled} value={form.revisionModel} onChange={event => update('revisionModel', event.target.value)} /></label>
        <label><span>最终审查</span><input disabled={disabled} value={form.finalReviewModel} onChange={event => update('finalReviewModel', event.target.value)} /></label>
      </div>
      <div className='settings-actions'><button className='is-primary' disabled={disabled} type='submit'>{state === 'saving' ? '保存中…' : '保存 AI 配置'}</button>{meta.configured ? <button disabled={disabled} type='button' onClick={remove}>删除个人配置</button> : null}</div>
      {message ? <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
      <small>密钥只会在服务端加密保存，页面不会回显完整内容。更换身份后，这里读取的是该成员自己的配置。</small>
    </form>
  </section>
}
