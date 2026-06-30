import { useEffect, useState } from 'react'

function number(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function usd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(Number(value || 0))
}

function percent(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'percent',
    maximumFractionDigits: 1
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
      if (!response.ok) throw new Error(payload.error || '读取 AI 用量失败')
      setData(payload)
      setState('ready')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className='settings-section ai-usage-settings'>
      <header>
        <span>DeepSeek Usage</span>
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
              <span>缓存命中</span>
              <strong>{number(data?.cacheHitTokens)}</strong>
              <small>命中率 {percent(data?.cacheHitRate)}</small>
            </article>
            <article>
              <span>缓存未命中</span>
              <strong>{number(data?.cacheMissTokens)}</strong>
              <small>{number(data?.outputTokens)} 输出 Token</small>
            </article>
            <article>
              <span>官方价格估算</span>
              <strong>{usd(data?.estimatedUsd)}</strong>
              <small>按每次响应的缓存命中明细计算</small>
            </article>
          </div>

          {data?.unknownInputTokens || data?.unsupportedCalls || data?.missingUsageCalls ? (
            <p className='settings-inline-notice'>
              {data.unknownInputTokens
                ? `有 ${number(data.unknownInputTokens)} 个旧输入 Token 没有缓存拆分，未强行计价。`
                : ''}
              {data.unsupportedCalls
                ? `另有 ${number(data.unsupportedCalls)} 次非 DeepSeek 或未知模型调用未计价。`
                : ''}
              {data.missingUsageCalls
                ? `其中 ${number(data.missingUsageCalls)} 次没有返回 usage。`
                : ''}
            </p>
          ) : null}

          <div className='ai-usage-table'>
            <div className='ai-usage-row is-head'>
              <span>模型 / 阶段</span>
              <span>调用</span>
              <span>命中 / 未命中</span>
              <span>估算费用</span>
            </div>
            {(data?.groups || []).map(group => (
              <div className='ai-usage-row' key={`${group.model}-${group.role}`}>
                <span>
                  <strong>{group.model}</strong>
                  <small>{group.role}</small>
                </span>
                <span>{number(group.calls)}</span>
                <span>
                  {number(group.cacheHitTokens)} / {number(group.cacheMissTokens)}
                </span>
                <span>{usd(group.estimatedUsd)}</span>
              </div>
            ))}
          </div>

          <div className='deepseek-price-note'>
            <strong>当前官方单价</strong>
            {(data?.pricing || []).map(row => (
              <span key={row.model}>
                {row.model}：命中 {usd(row.cacheHitPerMillionUsd)} /
                未命中 {usd(row.cacheMissPerMillionUsd)} /
                输出 {usd(row.outputPerMillionUsd)}（每百万 Token）
              </span>
            ))}
            <small>
              价格快照：{data?.pricingVersion}。这里只按 API 返回的 usage
              估算，最终扣费仍以 DeepSeek 控制台为准。
            </small>
          </div>

          <div className='settings-actions'>
            <button type='button' onClick={load}>重新统计</button>
          </div>
        </>
      )}
    </section>
  )
}
