import { useEffect, useState } from 'react'

const OPENCLAW_MODELS = [
  ['deepseek/deepseek-v4-flash', 'DeepSeek V4 Flash · 日常默认'],
  ['deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro · 更强推理'],
  ['deepseek/deepseek-chat', 'DeepSeek Chat · 兼容模式'],
  ['deepseek/deepseek-reasoner', 'DeepSeek Reasoner · 长推理']
]

const empty = {
  enabled: true,
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  defaultModel: 'deepseek-v4-pro',
  scheduleModel: 'deepseek-v4-flash',
  openclawSyncEnabled: true,
  openclawModel: 'deepseek/deepseek-v4-flash'
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
      openclawSyncEnabled: config.openclawSyncEnabled !== false,
      openclawModel:
        config.openclawModel ||
        current.openclawModel,
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
      setMessage('已保存；OpenClaw 在线时会自动同步所选模型')
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

        <div className='settings-subsection'>
          <div>
            <h4>OpenClaw 默认模型</h4>
            <p>
              前端保存期望模型，本机 Relay 在线时自动同步。DeepSeek API Key
              只保存在 OpenClaw 本机环境中，不通过网页接口回传。
            </p>
          </div>
        </div>

        <label className='settings-check-row'>
          <input
            type='checkbox'
            checked={form.openclawSyncEnabled}
            onChange={event => update('openclawSyncEnabled', event.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>由 Law-Tech 同步 OpenClaw 模型</strong>
            <small>关闭后保留 OpenClaw 当前本地模型，不再自动改动。</small>
          </span>
        </label>

        <label>
          <span>OpenClaw 模型</span>
          <select
            disabled={disabled || !form.openclawSyncEnabled}
            value={form.openclawModel}
            onChange={event => update('openclawModel', event.target.value)}
          >
            {OPENCLAW_MODELS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <p className='settings-muted'>
          课程简报、大纲、写作、审查、错峰和媒体清理都在“课程自动化”中管理。
          微信日程解析会优先使用这里保存的个人 DeepSeek 配置。
        </p>

        <div className='settings-actions'>
          <button className='soft-button primary' disabled={disabled} type='submit'>
            {state === 'saving' ? '保存中…' : '保存'}
          </button>
          {meta.configured ? (
            <button className='soft-button' disabled={disabled} type='button' onClick={remove}>
              删除
            </button>
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
