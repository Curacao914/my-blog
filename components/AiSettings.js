import { useEffect, useState } from 'react'

const empty = {
  enabled: true,
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  defaultModel: 'deepseek-v4-pro',
  scheduleModel: '',
  outlineModel: '',
  writerModel: '',
  reviewerModel: '',
  revisionModel: '',
  finalReviewModel: '',
  courseCostMode: 'economy',
  courseTimezone: 'Asia/Shanghai',
  coursePeakWindows: [
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '18:00' }
  ],
  courseBoundaryBufferMinutes: 10
}

const COST_MODE_LABELS = {
  economy: '经济模式',
  standard: '标准模式',
  immediate: '立即处理'
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
    if (!response.ok) {
      throw new Error(data.error || '读取 AI 配置失败')
    }
    const config = data.integration?.config || {}
    const costControl = data.effective?.costControl || {}
    setMeta({ ...data.integration, effective: data.effective })
    setForm(current => ({
      ...current,
      enabled: data.integration?.enabled !== false,
      baseUrl:
        data.integration?.baseUrl ||
        current.baseUrl,
      ...config,
      courseCostMode:
        config.courseCostMode ||
        costControl.mode ||
        current.courseCostMode,
      courseBoundaryBufferMinutes:
        config.courseBoundaryBufferMinutes ??
        costControl.boundaryBufferMinutes ??
        current.courseBoundaryBufferMinutes,
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
      if (!response.ok) {
        throw new Error(data.error || '保存 AI 配置失败')
      }
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
    if (!window.confirm('删除当前 AI 配置？')) return
    const response = await fetch('/api/settings/ai', {
      method: 'DELETE',
      credentials: 'same-origin'
    })
    if (!response.ok) return setMessage('删除失败')
    setForm(empty)
    setMeta({})
    setMessage('已删除')
  }

  const disabled = state === 'loading' || state === 'saving'
  const modeLabel =
    COST_MODE_LABELS[form.courseCostMode] ||
    COST_MODE_LABELS.economy

  return (
    <section className='settings-section'>
      <header>
        <span>AI</span>
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
            placeholder={
              meta.secretHint
                ? '留空保留原密钥'
                : 'sk-…'
            }
          />
        </label>

        <div className='settings-form-grid'>
          <label>
            <span>默认模型</span>
            <input
              disabled={disabled}
              value={form.defaultModel}
              onChange={event =>
                update('defaultModel', event.target.value)
              }
              placeholder='deepseek-v4-pro'
            />
          </label>
          <label>
            <span>日程解析</span>
            <input
              disabled={disabled}
              value={form.scheduleModel}
              onChange={event =>
                update('scheduleModel', event.target.value)
              }
              placeholder='默认模型'
            />
          </label>
          <label>
            <span>课程大纲</span>
            <input
              disabled={disabled}
              value={form.outlineModel}
              onChange={event =>
                update('outlineModel', event.target.value)
              }
              placeholder='默认模型'
            />
          </label>
          <label>
            <span>节点写作</span>
            <input
              disabled={disabled}
              value={form.writerModel}
              onChange={event =>
                update('writerModel', event.target.value)
              }
              placeholder='默认模型'
            />
          </label>
          <label>
            <span>独立审查</span>
            <input
              disabled={disabled}
              value={form.reviewerModel}
              onChange={event =>
                update('reviewerModel', event.target.value)
              }
              placeholder='默认模型'
            />
          </label>
          <label>
            <span>局部修订</span>
            <input
              disabled={disabled}
              value={form.revisionModel}
              onChange={event =>
                update('revisionModel', event.target.value)
              }
              placeholder='默认模型'
            />
          </label>
          <label>
            <span>最终审查</span>
            <input
              disabled={disabled}
              value={form.finalReviewModel}
              onChange={event =>
                update('finalReviewModel', event.target.value)
              }
              placeholder='默认模型'
            />
          </label>
        </div>

        <div className='settings-form-grid'>
          <label>
            <span>课程调用策略</span>
            <select
              disabled={disabled}
              value={form.courseCostMode}
              onChange={event =>
                update('courseCostMode', event.target.value)
              }
            >
              <option value='economy'>
                经济模式 · 严格错峰
              </option>
              <option value='standard'>
                标准模式 · 官方高峰外运行
              </option>
              <option value='immediate'>
                立即处理 · 忽略价格窗口
              </option>
            </select>
          </label>

          <label>
            <span>边界缓冲（分钟）</span>
            <input
              disabled={
                disabled ||
                form.courseCostMode !== 'economy'
              }
              min='0'
              max='60'
              type='number'
              value={form.courseBoundaryBufferMinutes}
              onChange={event =>
                update(
                  'courseBoundaryBufferMinutes',
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className='settings-status-line'>
          <b>{modeLabel}</b>
          <span>
            北京时间 09:00–12:00、14:00–18:00
          </span>
        </div>

        <div className='settings-actions'>
          <button
            className='is-primary'
            disabled={disabled}
            type='submit'
          >
            {state === 'saving' ? '保存中…' : '保存'}
          </button>
          {meta.configured ? (
            <button
              disabled={disabled}
              type='button'
              onClick={remove}
            >
              删除
            </button>
          ) : null}
        </div>

        {message ? (
          <p
            className={`settings-message ${
              state === 'error' ? 'is-error' : ''
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  )
}
