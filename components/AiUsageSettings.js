import { useEffect, useState } from 'react'

function number(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function money(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 4
  }).format(Number(value || 0))
}

export function AiUsageSettings() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  async function load() {
    setState('loading')
    setMessage('')
    try {
      const response = await fetch('/api/settings/ai-usage', {
        credentials: 'same-origin'
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || '读取 AI 用量失败')
      }
      setData(payload)
      setState('ready')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section className='settings-section ai-usage-settings'>
      <header>
        <span>AI Usage</span>
        <h3>用量与费用</h3>
      </header>

      {state === 'loading' ? (
        <p className='settings-muted'>正在汇总最近 30 天的课程调用…</p>
      ) : state === 'error' ? (
        <div className='settings-inline-notice is-error'>
          {message}
          <button type='button' onClick={load}>重试</button>
        </div>
      ) : (
        <>
          <div className='ai-usage-summary'>
            <article>
              <span>调用</span>
              <strong>{number(data?.calls)}</strong>
              <small>最近 {data?.windowDays || 30} 天</small>
            </article>
            <article>
              <span>输入 Token</span>
              <strong>{number(data?.inputTokens)}</strong>
              <small>模型返回的 usage</small>
            </article>
            <article>
              <span>输出 Token</span>
              <strong>{number(data?.outputTokens)}</strong>
              <small>{number(data?.totalTokens)} 总计</small>
            </article>
            <article>
              <span>费用估算</span>
              <strong>{money(data?.estimatedCost)}</strong>
              <small>
                {data?.pricing?.configured
                  ? '按模型设置中的单价估算'
                  : '请先在模型设置中填写单价'}
              </small>
            </article>
          </div>

          {data?.unmeteredCalls ? (
            <p className='settings-inline-notice'>
              另有 {data.unmeteredCalls} 次调用未返回 token usage，
              已计入调用次数但未计入费用。
            </p>
          ) : null}

          <div className='ai-usage-table'>
            <div className='ai-usage-row is-head'>
              <span>模型 / 阶段</span>
              <span>调用</span>
              <span>输入</span>
              <span>输出</span>
            </div>
            {(data?.groups || []).map(group => (
              <div
                className='ai-usage-row'
                key={`${group.model}-${group.role}`}
              >
                <span>
                  <strong>{group.model}</strong>
                  <small>{group.role}</small>
                </span>
                <span>{number(group.calls)}</span>
                <span>{number(group.inputTokens)}</span>
                <span>{number(group.outputTokens)}</span>
              </div>
            ))}
          </div>

          <div className='settings-actions'>
            <button type='button' onClick={load}>重新统计</button>
          </div>
        </>
      )}
    </section>
  )
}
