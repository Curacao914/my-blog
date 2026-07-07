import { useEffect, useMemo, useState } from 'react'

const EXAMPLES = [
  '提醒我明天下午三点开组会',
  '把这篇文章加入阅读箱：https://example.com/ai-law',
  '我今天有什么安排？',
  '删除我明天所有日程',
  '把刚刚那个标记为重要'
]

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || `${url} failed with HTTP ${response.status}`)
  }
  return data
}

function statusText(result, error) {
  if (error) return '预览失败'
  if (!result) return '等待输入'
  if (result.persistence?.ok === false) return '已预览，但审计表未写入'
  const reasons = result.summary?.reasons || []
  if (reasons.length) return `需要澄清：${reasons.slice(0, 3).join('、')}`
  return '预览完成：未执行'
}

function pretty(value) {
  return JSON.stringify(value, null, 2)
}

function shortDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function AgentCommandLane() {
  const [environment, setEnvironment] = useState('preview')
  const [text, setText] = useState(EXAMPLES[0])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const summary = useMemo(() => result?.summary || null, [result])

  async function refreshHistory(nextEnvironment = environment) {
    setHistoryLoading(true)
    try {
      const data = await jsonRequest(
        `/api/desk/agent-command-history?environment=${encodeURIComponent(nextEnvironment)}&limit=12`
      )
      setHistory(data.runs || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    refreshHistory(environment)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment])

  async function submit(event) {
    event?.preventDefault?.()
    setLoading(true)
    setError('')
    try {
      const data = await jsonRequest('/api/desk/agent-command-preview', {
        method: 'POST',
        body: JSON.stringify({ environment, text })
      })
      setResult(data)
      await refreshHistory(environment)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : '预览失败')
    } finally {
      setLoading(false)
    }
  }

  async function decide(decision) {
    if (!result?.runId) {
      setError('当前预览没有 runId；请先应用迁移并重新预览。')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await jsonRequest('/api/desk/agent-command-decision', {
        method: 'POST',
        body: JSON.stringify({ runId: result.runId, decision, note })
      })
      setResult(current => ({ ...current, run: data.run }))
      setNote('')
      await refreshHistory(environment)
    } catch (err) {
      setError(err instanceof Error ? err.message : '记录判断失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className='agent-command-lane'>
      <div className='desk-module-intro'>
        <div>
          <span>Agent Command Lane</span>
          <h2>大一统输入框 · 完整预览闭环</h2>
          <p>
            输入一句自然语言，系统完成理解、确定性规划、对象候选、语义门禁、建议归档位置和审计记录。
            这一环只记录预览与判断，不执行工具、不写业务对象、不启用 Production Shadow。
          </p>
        </div>
        <div className='agent-command-badge'>
          <b>Preview + Audit</b>
          <small>executionAllowed=false</small>
        </div>
      </div>

      <div className='agent-command-layout'>
        <form className='agent-command-card' onSubmit={submit}>
          <div className='agent-command-row'>
            <label>
              <span>Profile 环境</span>
              <select value={environment} onChange={event => setEnvironment(event.target.value)}>
                <option value='preview'>Preview published profile</option>
                <option value='production'>Production published profile</option>
              </select>
            </label>
            <div className='agent-command-state'>{statusText(result, error)}</div>
          </div>

          <label className='wide'>
            <span>命令</span>
            <textarea
              value={text}
              maxLength={2000}
              onChange={event => setText(event.target.value)}
              placeholder='输入一句话，例如：我今天有什么安排？'
            />
          </label>

          <div className='agent-example-row'>
            {EXAMPLES.map(example => (
              <button key={example} type='button' onClick={() => setText(example)}>
                {example}
              </button>
            ))}
          </div>

          <div className='agent-command-actions'>
            <button className='soft-button primary' disabled={loading || !text.trim()} type='submit'>
              {loading ? '处理中…' : '解释并预览'}
            </button>
            <span>不会执行工具，不会写业务表。</span>
          </div>

          {error ? <p className='agent-command-error'>{error}</p> : null}
          {result?.persistence?.ok === false ? (
            <p className='agent-command-warning'>{result.persistence.warning}</p>
          ) : null}
        </form>

        <aside className='agent-history-card'>
          <header>
            <span>History</span>
            <button type='button' onClick={() => refreshHistory(environment)} disabled={historyLoading}>
              刷新
            </button>
          </header>
          <div className='agent-history-list'>
            {history.length ? history.map(run => (
              <button key={run.id} type='button' onClick={() => setResult({ ...run, runId: run.id, command: run.commandText })}>
                <strong>{run.commandText}</strong>
                <small>{run.status} · {run.summary?.domain || '-'} / {run.summary?.action || '-'} · {shortDate(run.createdAt)}</small>
              </button>
            )) : <p>暂无记录。应用迁移并预览一次后，这里会出现历史。</p>}
          </div>
        </aside>
      </div>

      {summary ? (
        <div className='agent-result-grid'>
          <article>
            <span>Intent</span>
            <strong>{summary.action} / {summary.domain}</strong>
            <p>{summary.objectType} · {summary.scope}</p>
          </article>
          <article>
            <span>Destination</span>
            <strong>{summary.destination?.label}</strong>
            <p>{summary.destination?.description}</p>
          </article>
          <article>
            <span>Gate</span>
            <strong>{summary.gateDecision}</strong>
            <p>{summary.reasons?.length ? summary.reasons.join('、') : 'no blocking reasons'}</p>
          </article>
          <article>
            <span>Execution</span>
            <strong>不会执行</strong>
            <p>toolExecuted=false · writesPerformed=false</p>
          </article>
        </div>
      ) : null}

      {result ? (
        <div className='agent-review-card'>
          <header>
            <div>
              <span>Human decision</span>
              <h3>记录你对这次识别的判断</h3>
              <p>这只是审计记录，不会触发写入。真正执行流必须另开闭环。</p>
            </div>
            <div className='agent-review-actions'>
              <button type='button' className='soft-button' onClick={() => decide('accepted_preview')} disabled={loading || !result.runId}>识别正确</button>
              <button type='button' className='soft-button' onClick={() => decide('needs_adjustment')} disabled={loading || !result.runId}>需要调整</button>
              <button type='button' className='soft-button' onClick={() => decide('dismissed')} disabled={loading || !result.runId}>忽略</button>
            </div>
          </header>
          <textarea value={note} onChange={event => setNote(event.target.value)} placeholder='可选：写下为什么正确/不正确，供后续调试用。' />
        </div>
      ) : null}

      {result ? (
        <div className='agent-preview-detail'>
          <details open>
            <summary>完整预览 JSON</summary>
            <pre>{pretty(result)}</pre>
          </details>
        </div>
      ) : null}

      <style jsx>{`
        .agent-command-lane { display: grid; gap: 16px; }
        .agent-command-badge { display: grid; gap: 4px; justify-items: end; min-width: 180px; border: 1px solid rgba(17,63,49,.1); border-radius: 18px; padding: 14px 16px; background: rgba(220,233,223,.5); }
        .agent-command-badge b { color: var(--leaf); }
        .agent-command-badge small { color: var(--muted); }
        .agent-command-layout { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 14px; }
        .agent-command-card, .agent-history-card, .agent-preview-detail, .agent-result-grid article, .agent-review-card { border: 1px solid rgba(255,255,255,.72); border-radius: 22px; background: rgba(255,255,255,.52); box-shadow: var(--shadow-sm); }
        .agent-command-card { display: grid; gap: 12px; padding: 18px; }
        .agent-command-row { display: grid; grid-template-columns: minmax(180px,260px) minmax(0,1fr); gap: 12px; align-items: end; }
        .agent-command-card label { display: grid; gap: 7px; color: var(--muted); font-size: 11px; }
        .agent-command-card select, .agent-command-card textarea, .agent-review-card textarea { width: 100%; border: 1px solid rgba(17,63,49,.11); border-radius: 14px; padding: 11px 12px; color: var(--ink); background: rgba(255,255,255,.72); outline: none; }
        .agent-command-card textarea { min-height: 130px; resize: vertical; line-height: 1.7; }
        .agent-command-state { border: 1px solid rgba(17,63,49,.08); border-radius: 14px; padding: 11px 12px; color: var(--leaf); background: rgba(220,233,223,.45); font-size: 12px; }
        .agent-example-row, .agent-command-actions, .agent-review-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .agent-example-row button, .agent-history-card button { border: 1px solid rgba(17,63,49,.08); border-radius: 999px; padding: 7px 10px; color: var(--muted); background: rgba(255,255,255,.48); cursor: pointer; }
        .agent-command-actions span, .agent-command-error, .agent-command-warning { color: var(--muted); font-size: 12px; }
        .agent-command-error, .agent-command-warning { margin: 0; border-radius: 12px; padding: 10px 12px; }
        .agent-command-error { color: #8a4b35; background: rgba(239,220,208,.62); }
        .agent-command-warning { color: #7b5a1f; background: rgba(244,230,193,.68); }
        .agent-history-card { display: grid; grid-template-rows: auto minmax(0,1fr); min-height: 260px; padding: 14px; }
        .agent-history-card header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 10px; }
        .agent-history-card header span { color: var(--quiet); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
        .agent-history-list { display: grid; align-content: start; gap: 8px; max-height: 360px; overflow: auto; }
        .agent-history-list button { display: grid; gap: 4px; border-radius: 14px; text-align: left; }
        .agent-history-list strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); font-size: 12px; }
        .agent-history-list small, .agent-history-list p { color: var(--muted); font-size: 10px; line-height: 1.5; }
        .agent-result-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; }
        .agent-result-grid article { display: grid; gap: 5px; min-height: 120px; padding: 16px; }
        .agent-result-grid span, .agent-review-card span { color: var(--quiet); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
        .agent-result-grid strong { color: var(--leaf); font-size: 16px; word-break: break-word; }
        .agent-result-grid p, .agent-review-card p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; word-break: break-word; }
        .agent-review-card { display: grid; gap: 12px; padding: 16px; }
        .agent-review-card header { display: flex; justify-content: space-between; gap: 18px; align-items: end; }
        .agent-review-card h3 { margin: 4px 0 5px; font-family: var(--display-serif); font-size: 22px; }
        .agent-review-card textarea { min-height: 82px; resize: vertical; }
        .agent-preview-detail { padding: 16px; }
        .agent-preview-detail summary { cursor: pointer; color: var(--leaf); font-weight: 700; }
        .agent-preview-detail pre { max-height: 560px; overflow: auto; border-radius: 14px; padding: 14px; background: rgba(17,63,49,.06); font-size: 12px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
        @media (max-width: 980px) { .agent-command-layout { grid-template-columns: 1fr; } .agent-result-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .agent-review-card header { display: grid; } }
        @media (max-width: 620px) { .agent-command-row, .agent-result-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  )
}
