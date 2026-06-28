import { useEffect, useState } from 'react'

const emptyPreference = {
  email: '',
  dailyDigestEnabled: true,
  weeklyDigestEnabled: false,
  dueRemindersEnabled: true,
  lastDailySentOn: null,
  lastWeeklySentOn: null
}

function Toggle({ checked, children, disabled, onChange }) {
  return <label className='reminder-toggle'>
    <input checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} type='checkbox' />
    <span aria-hidden='true'><i /></span>
    <b>{children}</b>
  </label>
}

export function ReminderSettings({ cronConfigured = false, emailConfigured = false, senderConfigured = false }) {
  const [preference, setPreference] = useState(emptyPreference)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/reminders/preferences', { credentials: 'same-origin' })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || '读取提醒设置失败')
        return data
      })
      .then(data => {
        if (cancelled) return
        setPreference({ ...emptyPreference, ...(data.preference || {}) })
        setState('ready')
      })
      .catch(error => {
        if (cancelled) return
        setMessageType('error')
        setMessage(error.message)
        setState('error')
      })
    return () => { cancelled = true }
  }, [])

  function update(patch) {
    setPreference(current => ({ ...current, ...patch }))
    setMessage('')
    setMessageType('')
  }

  async function save(event) {
    event.preventDefault()
    setState('saving')
    setMessage('')
    setMessageType('')
    try {
      const response = await fetch('/api/reminders/preferences', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(preference)
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存提醒设置失败')
      setPreference({ ...emptyPreference, ...(data.preference || {}) })
      setState('ready')
      setMessageType('success')
      setMessage('提醒设置已保存。')
    } catch (error) {
      setState('error')
      setMessageType('error')
      setMessage(error.message)
    }
  }

  async function sendTest() {
    setTesting(true)
    setMessage('')
    setMessageType('')
    try {
      const response = await fetch('/api/reminders/test', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: preference.email })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '测试邮件发送失败')
      setMessageType('success')
      setMessage('测试邮件已发送，请检查收件箱。')
    } catch (error) {
      setMessageType('error')
      setMessage(error.message)
    } finally {
      setTesting(false)
    }
  }

  const disabled = state === 'loading' || state === 'saving'

  return <article className='reminder-settings-card'>
    <header>
      <div><span>Reminders</span><h3>邮件提醒</h3></div>
      <em>{emailConfigured && senderConfigured && cronConfigured ? '生产就绪' : emailConfigured ? '可发送测试' : '等待邮件配置'}</em>
    </header>
    <p>每天上午 9:00 左右整理今日安排与未来 24 小时提醒；周一可在同一封邮件里附上本周回顾。</p>
    <div className='reminder-channel-status' aria-label='邮件提醒服务状态'>
      <span className={emailConfigured ? 'is-ok' : ''}>邮件 API</span>
      <span className={senderConfigured ? 'is-ok' : ''}>正式发件人</span>
      <span className={cronConfigured ? 'is-ok' : ''}>生产定时</span>
    </div>
    <form onSubmit={save}>
      <label className='reminder-email-field'>
        <span>接收邮箱</span>
        <input
          autoComplete='email'
          disabled={disabled}
          onChange={event => update({ email: event.target.value })}
          placeholder='name@example.com'
          type='email'
          value={preference.email}
        />
      </label>
      <div className='reminder-toggle-list'>
        <Toggle checked={preference.dailyDigestEnabled} disabled={disabled} onChange={value => update({ dailyDigestEnabled: value })}>每日安排</Toggle>
        <Toggle checked={preference.dueRemindersEnabled} disabled={disabled} onChange={value => update({ dueRemindersEnabled: value })}>未来 24 小时提醒</Toggle>
        <Toggle checked={preference.weeklyDigestEnabled} disabled={disabled} onChange={value => update({ weeklyDigestEnabled: value })}>周一回顾</Toggle>
      </div>
      <div className='reminder-settings-actions'>
        <button className='is-primary' disabled={disabled} type='submit'>{state === 'saving' ? '保存中…' : '保存设置'}</button>
        <button disabled={disabled || testing || !preference.email || !emailConfigured} onClick={sendTest} type='button'>{testing ? '发送中…' : '发送测试邮件'}</button>
      </div>
      {message ? <p className={`reminder-settings-message ${messageType === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
      <small>每日提醒会在上午 9 点附近送达；实际时间可能有少量浮动。</small>
    </form>
  </article>
}
