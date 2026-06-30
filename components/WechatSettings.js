import { useEffect, useState } from 'react'

const defaults = {
  enabled: true,
  dailyScheduleEnabled: true,
  dailyTime: '09:00',
  courseBriefEnabled: true,
  courseBriefDelivery: 'scheduled',
  courseBriefTime: '20:30',
  timezone: 'Asia/Shanghai'
}

export function WechatSettings({ courseOnly = false }) {
  const [form, setForm] = useState(defaults)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  async function load() {
    setState('loading')
    setMessage('')
    try {
      const response = await fetch('/api/settings/wechat', {
        credentials: 'same-origin'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '读取微信设置失败')
      setForm(current => ({ ...current, ...(data.preference || {}) }))
      setState('ready')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  useEffect(() => { load() }, [])

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
    setMessage('')
  }

  async function save(event) {
    event?.preventDefault()
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/settings/wechat', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存微信设置失败')
      setForm(current => ({ ...current, ...(data.preference || {}) }))
      setState('ready')
      setMessage('已保存')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  async function test() {
    setState('testing')
    setMessage('')
    try {
      const response = await fetch('/api/settings/wechat/test', {
        method: 'POST',
        credentials: 'same-origin'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '测试消息入队失败')
      setState('ready')
      setMessage('测试消息已进入微信发送队列')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  const disabled = ['loading', 'saving', 'testing'].includes(state)

  if (courseOnly) {
    return (
      <div className='course-wechat-settings'>
        <label className='settings-check-row'>
          <input
            type='checkbox'
            checked={form.courseBriefEnabled}
            onChange={event => update('courseBriefEnabled', event.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>课程简报发送到微信</strong>
            <small>不再使用邮件作为中间方案。</small>
          </span>
        </label>
        <div className='settings-form-grid'>
          <label>
            <span>发送方式</span>
            <select
              value={form.courseBriefDelivery}
              onChange={event => update('courseBriefDelivery', event.target.value)}
              disabled={disabled || !form.courseBriefEnabled}
            >
              <option value='scheduled'>在设定时间发送</option>
              <option value='immediate'>生成后立即发送</option>
            </select>
          </label>
          <label>
            <span>发送时间</span>
            <input
              type='time'
              value={form.courseBriefTime}
              onChange={event => update('courseBriefTime', event.target.value)}
              disabled={
                disabled ||
                !form.courseBriefEnabled ||
                form.courseBriefDelivery !== 'scheduled'
              }
            />
          </label>
        </div>
        <div className='settings-actions'>
          <button className='soft-button primary' type='button' onClick={save} disabled={disabled}>
            {state === 'saving' ? '保存中…' : '保存课程通知'}
          </button>
        </div>
        {message ? (
          <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>
            {message}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <section className='settings-section wechat-settings'>
      <header>
        <span>WeChat</span>
        <h3>微信与日程</h3>
      </header>

      <div className='settings-status-line'>
        <b className={form.configured ? 'is-ok' : ''}>
          {form.configured ? '已保存' : '等待配置'}
        </b>
        <span>
          站内只保存发送规则；微信登录和接收目标由本机 OpenClaw Relay 保管。
        </span>
      </div>

      <form className='settings-form' onSubmit={save}>
        <label className='settings-check-row'>
          <input
            type='checkbox'
            checked={form.dailyScheduleEnabled}
            onChange={event => update('dailyScheduleEnabled', event.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>发送每日安排</strong>
            <small>到点后由本机 Relay 拉取并发送，不经过大模型。</small>
          </span>
        </label>

        <div className='settings-form-grid'>
          <label>
            <span>每日安排时间</span>
            <input
              type='time'
              value={form.dailyTime}
              onChange={event => update('dailyTime', event.target.value)}
              disabled={disabled || !form.dailyScheduleEnabled}
            />
          </label>
          <label>
            <span>时区</span>
            <select
              value={form.timezone}
              onChange={event => update('timezone', event.target.value)}
              disabled={disabled}
            >
              <option value='Asia/Shanghai'>北京时间</option>
              <option value='Asia/Tokyo'>日本时间</option>
            </select>
          </label>
        </div>

        <div className='settings-subsection'>
          <div>
            <h4>发送链路</h4>
            <p>
              站内消息队列 → 本机 OpenClaw Relay →
              openclaw-weixin → 微信私聊。Relay 不把通知交给 Agent 改写。
            </p>
          </div>
        </div>

        <div className='settings-actions'>
          <button className='soft-button primary' type='submit' disabled={disabled}>
            {state === 'saving' ? '保存中…' : '保存'}
          </button>
          <button className='soft-button' type='button' onClick={test} disabled={disabled}>
            {state === 'testing' ? '正在入队…' : '发送测试微信'}
          </button>
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
