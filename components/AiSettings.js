import { useEffect, useState } from 'react'

const empty = {
  enabled: true,
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  defaultModel: 'deepseek-v4-pro',
  scheduleModel: 'deepseek-v4-flash'
}

export function AiSettings() {
  const [form, setForm] = useState(empty)
  const [meta, setMeta] = useState({})
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  async function load() {
    setState('loading')
    const response = await fetch('/api/settings/ai', {
      credentials: 'same-origin'
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '读取 AI 配置失败')
    const config = data.integration?.config || {}
    setMeta({ ...data.integration, effective: data.effective })
    setForm(current => ({
      ...current,
      enabled: data.integration?.enabled !== false,
      baseUrl: data.integration?.baseUrl || current.baseUrl,
      defaultModel: config.defaultModel || current.defaultModel,
      scheduleModel:
        config.scheduleModel ||
        config.defaultModel ||
        current.scheduleModel,
      apiKey: ''
    }))
    setState('ready')
  }

  useEffect(() => {
    load().catch(error => {
      setMessage(error.message)
      setState('error')
    })
  }, [])

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存 AI 配置失败')
      setMeta(data.integration || {})
      setForm(current => ({ ...current, apiKey: '' }))
      setState('ready')
      setMessage('已保存')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  async function remove() {
    if (!window.confirm('删除当前 AI 配置？课程自动化将停止使用模型。')) return
    const response = await fetch('/api/settings/ai', {
      method: 'DELETE',
      credentials: 'same-origin'
    })
    if (!response.ok) {
      setMessage('删除失败')
      return
    }
    setForm(empty)
    setMeta({})
    setMessage('已删除')
  }

  const disabled = state === 'loading' || state === 'saving'

  return (
    <section className='settings-section'>
      <header>
        <span>AI Provider</span>
        <h3>模型与 API</h3>
      </header>

      <div className='settings-status-line'>
        <b className={meta.effective?.configured ? 'is-ok' : ''}>
          {meta.effective?.configured ? '可用' : '未配置'}
        </b>
        <span>
          {meta.secretHint
            ? `密钥 ${meta.secretHint}`
            : meta.effective?.source === 'environment'
              ? '环境配置'
              : '无密钥'}
        </span>
      </div>

      <form className='settings-form' onSubmit={save}>
        <label>
          <span>API 地址</span>
          <input
            disabled={disabled}
            value={form.baseUrl}
            onChange={event => update('baseUrl', event.target.value)}
            placeholder='https://api.deepseek.com/v1'
          />
        </label>

        <label>
          <span>API Key</span>
          <input
            autoComplete='off'
            disabled={disabled}
            type='password'
            value={form.apiKey}
            onChange={event => update('apiKey', event.target.value)}
            placeholder={meta.secretHint ? '留空保留原密钥' : 'sk-…'}
          />
        </label>

        <div className='settings-form-grid'>
          <label>
            <span>通用默认模型</span>
            <input
              disabled={disabled}
              value={form.defaultModel}
              onChange={event => update('defaultModel', event.target.value)}
              placeholder='deepseek-v4-pro'
            />
          </label>
          <label>
            <span>日程解析模型</span>
            <input
              disabled={disabled}
              value={form.scheduleModel}
              onChange={event => update('scheduleModel', event.target.value)}
              placeholder='deepseek-v4-flash'
            />
          </label>
        </div>

        <p className='settings-muted'>
          课程简报、大纲、写作、审查、错峰和媒体清理都已移到“课程自动化”，
          这里仅保留通用供应商与密钥。
        </p>

        <div className='settings-actions'>
          <button className='is-primary' disabled={disabled} type='submit'>
            {state === 'saving' ? '保存中…' : '保存'}
          </button>
          {meta.configured ? (
            <button disabled={disabled} type='button' onClick={remove}>删除</button>
          ) : null}
        </div>

        {message ? (
          <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>
            {message}
          </p>
        ) : null}
      </form>
    </section>
  )
}
