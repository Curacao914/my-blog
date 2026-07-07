import { useCallback, useEffect, useMemo, useState } from 'react'

const PIPELINE = [
  ['message', '消息'],
  ['intent', '意图'],
  ['planner', '规划'],
  ['semantic_gate', '语义门禁'],
  ['resource', '资源'],
  ['risk_policy', '风险策略'],
  ['tool', '工具'],
  ['response', '回复'],
  ['trace', '追踪']
]

const CAPABILITIES = [
  ['schedule.read', '日程读取'],
  ['schedule.create', '日程创建'],
  ['schedule.update', '日程修改'],
  ['schedule.delete', '日程删除'],
  ['reading.read', '阅读读取'],
  ['reading.create', '阅读创建'],
  ['reading.update', '阅读修改'],
  ['reading.delete', '阅读删除'],
  ['course.read', '课程读取'],
  ['course.brief.mark_read', '简报标记已读']
]

const DEFAULT_PROFILE = {
  schemaVersion: '1.0',
  topology: PIPELINE.map(([key]) => key),
  models: {
    interpreter: 'deepseek-v4-flash',
    responder: 'deepseek-v4-flash'
  },
  plannerMode: 'deterministic',
  capabilities: Object.fromEntries(CAPABILITIES.map(([key]) => [
    key,
    ['schedule.read', 'reading.read', 'course.read'].includes(key)
  ])),
  thresholds: {
    autoResolveMinimum: 0.98,
    candidateGapMinimum: 0.2,
    clarificationMaximum: 0.05
  },
  aliases: { schedule: [], reading: [], course: [] },
  budgets: {
    maxModelCalls: 1,
    maxInputTokens: 6000,
    maxOutputTokens: 800,
    maxEstimatedUsd: 0.01,
    timeoutMs: 12000
  },
  riskPolicy: {
    read: { confirmation: 'none' },
    reversible_write: { confirmation: 'none' },
    bulk_write: { confirmation: 'required' },
    destructive: { confirmation: 'required' },
    privileged: { confirmation: 'required' }
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

function profileDiff(current, parent) {
  if (!parent) return ['初始版本']
  return ['models', 'capabilities', 'thresholds', 'aliases', 'budgets']
    .filter(key => JSON.stringify(current?.[key]) !== JSON.stringify(parent?.[key]))
    .map(key => ({
      models: '模型',
      capabilities: '能力',
      thresholds: '阈值',
      aliases: '领域别名',
      budgets: '预算'
    })[key])
}

function failureSummary(run) {
  const failures = Array.isArray(run?.failure_categories)
    ? run.failure_categories
    : []
  const counts = new Map()
  const messages = []
  failures.forEach(failure => {
    const category = String(failure?.category || 'unknown_failure')
    counts.set(category, (counts.get(category) || 0) + Number(failure?.count || 1))
    const message = String(failure?.message || '').trim()
    if (message && !messages.includes(message)) messages.push(message)
  })
  return {
    categories: [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4),
    messages: messages.slice(0, 2)
  }
}

function compactIntent(value = {}) {
  return [
    value.action || '∅',
    value.domain || '∅',
    value.objectType || '∅',
    value.scope || '∅',
    `exec=${Boolean(value.executionAllowed)}`
  ].join(' / ')
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: options.body
      ? { 'content-type': 'application/json', ...(options.headers || {}) }
      : options.headers
  })
  const contentType = response.headers?.get?.('content-type') || ''
  let data = null
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null)
  }
  if (!response.ok) {
    throw new Error(
      data?.error || `Agent Studio request failed (HTTP ${response.status})`
    )
  }
  if (!data) throw new Error('Agent Studio returned a non-JSON response')
  return data
}

export function OpenClawAgentStudio() {
  const [environment, setEnvironment] = useState('preview')
  const [configs, setConfigs] = useState([])
  const [runs, setRuns] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(clone(DEFAULT_PROFILE))
  const [state, setState] = useState('loading')
  const [action, setAction] = useState('')
  const [notice, setNotice] = useState(null)
  const [runDetail, setRunDetail] = useState(null)

  const selected = useMemo(
    () => configs.find(item => item.id === selectedId) || configs[0] || null,
    [configs, selectedId]
  )
  const parent = useMemo(() => configs.find(item => (
    item.id === selected?.parent_config_id ||
    item.version_number === selected?.version_number - 1
  )), [configs, selected])
  const selectedRun = useMemo(() => runs.find(run => (
    run.config_id === selected?.id &&
    run.status === 'passed' &&
    Number(run.case_count) >= 150 &&
    Number(run.overall_score) >= 0.98 &&
    Number(run.safety_score) === 1
  )), [runs, selected])
  const latestRun = useMemo(
    () => runs.find(run => run.config_id === selected?.id) || null,
    [runs, selected]
  )
  const latestFailures = useMemo(() => failureSummary(latestRun), [latestRun])
  const visibleFailures = useMemo(() => (
    runDetail && runDetail.run?.id === latestRun?.id
      ? (runDetail.failedResults || [])
      : []
  ), [runDetail, latestRun])

  const load = useCallback(async nextEnvironment => {
    setState('loading')
    setNotice(null)
    setRunDetail(null)
    try {
      const data = await request(
        `/api/settings/openclaw-agent?environment=${nextEnvironment}`
      )
      setConfigs(data.configs || [])
      setRuns(data.evaluationRuns || [])
      const preferred = (data.configs || []).find(item => item.status === 'draft') || data.configs?.[0]
      setSelectedId(preferred?.id || '')
      setDraft(clone(preferred?.profile || DEFAULT_PROFILE))
      setState('ready')
    } catch (error) {
      setState('error')
      setNotice({ kind: 'error', text: error.message })
    }
  }, [])

  useEffect(() => { void load(environment) }, [environment, load])

  useEffect(() => {
    if (selected?.profile) setDraft(clone(selected.profile))
  }, [selected?.profile])

  function chooseEnvironment(next) {
    if (next === environment) return
    setEnvironment(next)
  }

  function update(section, key, value) {
    setDraft(current => ({
      ...current,
      [section]: { ...current[section], [key]: value }
    }))
  }

  async function perform(name, fn, success) {
    setAction(name)
    setNotice(null)
    try {
      await fn()
      setNotice({ kind: 'success', text: success })
      await load(environment)
    } catch (error) {
      if (name === 'evaluate') {
        await load(environment)
        setNotice({
          kind: 'error',
          text: '评估连接中断，已刷新服务器状态；运行结果会保留在评估账本。'
        })
      } else {
        setNotice({ kind: 'error', text: error.message })
      }
    } finally {
      setAction('')
    }
  }

  function createDraft() {
    return perform('create', () => request('/api/settings/openclaw-agent', {
      method: 'POST',
      body: JSON.stringify({
        environment,
        profile: selected?.profile || DEFAULT_PROFILE,
        parentConfigId: selected?.id || null
      })
    }), '新草稿已创建。')
  }

  function saveDraft() {
    return perform('save', () => request('/api/settings/openclaw-agent/config', {
      method: 'PATCH',
      body: JSON.stringify({
        environment,
        configId: selected.id,
        expectedChecksum: selected.checksum,
        profile: draft
      })
    }), '草稿已保存。')
  }

  function evaluate() {
    return perform('evaluate', async () => {
      let runId = latestRun?.status === 'running' ? latestRun.id : null
      while (true) {
        const result = await request('/api/settings/openclaw-agent/evaluate', {
          method: 'POST',
          body: JSON.stringify({
            environment,
            configId: selected.id,
            ...(runId ? { runId } : {})
          })
        })
        if (result.done) return result
        runId = result.run?.id
        setNotice({
          kind: 'info',
          text: `评估进行中：${result.completedCases}/${result.totalCases}`
        })
      }
    }, '完整评估已完成。')
  }

  async function loadRunDetail(run) {
    if (!run?.id) return
    setAction('detail')
    setNotice(null)
    try {
      const data = await request(
        `/api/settings/openclaw-agent/evaluation-run?environment=${environment}&runId=${encodeURIComponent(run.id)}`
      )
      setRunDetail(data)
      setNotice({ kind: 'success', text: '失败明细已载入。' })
    } catch (error) {
      setNotice({ kind: 'error', text: error.message })
    } finally {
      setAction('')
    }
  }

  function exportRunDetail() {
    if (!runDetail) return
    const blob = new Blob([JSON.stringify(runDetail, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `openclaw-agent-eval-${runDetail.run?.id || 'detail'}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function publish() {
    return perform('publish', () => request('/api/settings/openclaw-agent/publish', {
      method: 'POST',
      body: JSON.stringify({
        environment,
        configId: selected.id,
        evaluationRunId: selectedRun.id
      })
    }), '版本已发布。')
  }

  function rollback(target) {
    return perform('rollback', () => request('/api/settings/openclaw-agent/rollback', {
      method: 'POST',
      body: JSON.stringify({
        environment,
        targetConfigId: target.id,
        evaluationRunId: target.published_by_eval_run_id || null
      })
    }), `已回滚到 v${target.version_number}，并生成新的发布版本。`)
  }

  const editable = selected?.status === 'draft'
  const differences = profileDiff(draft, parent?.profile)

  return (
    <section className='settings-section agent-studio'>
      <header className='agent-studio-head'>
        <span>Control plane laboratory</span>
        <h3>Agent Studio</h3>
        <p>
          模型只负责理解；规划、资源、风险与执行保持为不可绕过的代码边界。
          此处管理版本与评估，不接管真实微信流量。
        </p>
      </header>

      <div className='agent-environment' aria-label='Agent 环境'>
        {['preview', 'production'].map(item => (
          <button
            aria-pressed={environment === item}
            key={item}
            onClick={() => chooseEnvironment(item)}
            type='button'
          >
            {item === 'preview' ? 'Preview' : 'Production'}
          </button>
        ))}
        <span>{environment === 'preview' ? '隔离评估环境' : '正式配置环境'}</span>
      </div>

      <div className='agent-pipeline' aria-label='固定 Agent 主链路'>
        {PIPELINE.map(([key, label], index) => (
          <div className='agent-pipeline-node' key={key}>
            <i>{String(index + 1).padStart(2, '0')}</i>
            <strong>{label}</strong>
            {index < PIPELINE.length - 1 ? <b aria-hidden='true'>→</b> : null}
          </div>
        ))}
      </div>

      {notice ? (
        <div className={`agent-notice is-${notice.kind}`} role='status'>{notice.text}</div>
      ) : null}

      {state === 'loading' ? <p className='settings-muted'>正在读取版本与评估记录…</p> : null}
      {state === 'error' ? (
        <button className='agent-primary' onClick={() => { void load(environment) }} type='button'>重试</button>
      ) : null}

      {state === 'ready' ? (
        <div className='agent-studio-grid'>
          <aside className='agent-versions'>
            <div className='agent-panel-title'>
              <div><small>Immutable ledger</small><h4>版本</h4></div>
              <button disabled={Boolean(action)} onClick={() => { void createDraft() }} type='button'>新建草稿</button>
            </div>
            {configs.length ? configs.map(item => (
              <div className={`agent-version ${item.id === selected?.id ? 'is-active' : ''}`} key={item.id}>
                <button onClick={() => setSelectedId(item.id)} type='button'>
                  <span>v{item.version_number}</span>
                  <strong>{item.status === 'draft' ? '草稿' : item.status === 'published' ? '已发布' : '已退役'}</strong>
                  <small>{String(item.checksum || '').slice(0, 8) || 'no hash'}</small>
                </button>
                {item.status === 'retired' ? (
                  <button
                    className='agent-rollback'
                    disabled={Boolean(action)}
                    onClick={() => { void rollback(item) }}
                    type='button'
                  >回滚到此版</button>
                ) : null}
              </div>
            )) : (
              <p className='settings-muted'>尚无配置版本。先创建一份安全默认草稿。</p>
            )}
          </aside>

          <div className='agent-editor'>
            {selected ? (
              <>
                <div className='agent-panel-title'>
                  <div>
                    <small>Schema-driven profile</small>
                    <h4>v{selected.version_number} · {editable ? '草稿' : '只读快照'}</h4>
                  </div>
                  <span className={`agent-status is-${selected.status}`}>{selected.status}</span>
                </div>

                <div className='agent-diff'>
                  <strong>相对上一版</strong>
                  <span>{differences.length ? differences.join('、') : '无变化'}</span>
                </div>

                <div className='agent-form-grid'>
                  <label>
                    <span>理解模型</span>
                    <input
                      aria-label='理解模型'
                      disabled={!editable}
                      onChange={event => update('models', 'interpreter', event.target.value)}
                      value={draft.models?.interpreter || ''}
                    />
                  </label>
                  <label>
                    <span>回复模型</span>
                    <input
                      disabled={!editable}
                      onChange={event => update('models', 'responder', event.target.value)}
                      value={draft.models?.responder || ''}
                    />
                  </label>
                  <label>
                    <span>自动解析阈值</span>
                    <input
                      aria-label='自动解析阈值'
                      disabled={!editable}
                      max='1'
                      min='0.98'
                      onChange={event => update('thresholds', 'autoResolveMinimum', Number(event.target.value))}
                      step='0.01'
                      type='number'
                      value={draft.thresholds?.autoResolveMinimum ?? 0.98}
                    />
                  </label>
                  <label>
                    <span>候选差距阈值</span>
                    <input
                      disabled={!editable}
                      max='1'
                      min='0.2'
                      onChange={event => update('thresholds', 'candidateGapMinimum', Number(event.target.value))}
                      step='0.01'
                      type='number'
                      value={draft.thresholds?.candidateGapMinimum ?? 0.2}
                    />
                  </label>
                </div>

                <div className='agent-subpanel'>
                  <div><small>Registry</small><h5>能力开关</h5></div>
                  <div className='agent-capabilities'>
                    {CAPABILITIES.map(([key, label]) => (
                      <label key={key}>
                        <input
                          checked={Boolean(draft.capabilities?.[key])}
                          disabled={!editable}
                          onChange={event => update('capabilities', key, event.target.checked)}
                          type='checkbox'
                        />
                        <span><strong>{label}</strong><small>{key}</small></span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className='agent-form-grid'>
                  {['schedule', 'reading', 'course'].map(domain => (
                    <label key={domain}>
                      <span>{domain} 领域别名</span>
                      <input
                        disabled={!editable}
                        onChange={event => update(
                          'aliases',
                          domain,
                          event.target.value.split(',').map(value => value.trim()).filter(Boolean)
                        )}
                        placeholder='逗号分隔'
                        value={(draft.aliases?.[domain] || []).join(', ')}
                      />
                    </label>
                  ))}
                </div>

                <div className='agent-guardrails'>
                  <div><span>模型调用</span><strong>1 次 / 请求</strong></div>
                  <div><span>输入上限</span><strong>6,000 tokens</strong></div>
                  <div><span>输出上限</span><strong>800 tokens</strong></div>
                  <div><span>危险操作</span><strong>强制确认</strong></div>
                </div>

                <div className='agent-actions'>
                  <button disabled={!editable || Boolean(action)} onClick={() => { void saveDraft() }} type='button'>
                    {action === 'save' ? '保存中…' : '保存草稿'}
                  </button>
                  <button disabled={!editable || Boolean(action)} onClick={() => { void evaluate() }} type='button'>
                    {action === 'evaluate' ? '评估运行中…' : '运行完整评估'}
                  </button>
                  <button
                    className='agent-primary'
                    disabled={!editable || !selectedRun || Boolean(action)}
                    onClick={() => { void publish() }}
                    type='button'
                  >发布此版本</button>
                </div>

                <div className='agent-gate-report'>
                  <div><small>Release gate</small><h5>发布门禁</h5></div>
                  {latestRun ? (
                    <div>
                      <div className='agent-metrics'>
                        <span><small>样本</small><strong>{latestRun.case_count || 0}</strong></span>
                        <span><small>总体</small><strong>{percent(latestRun.overall_score)}</strong></span>
                        <span><small>安全</small><strong>{percent(latestRun.safety_score)}</strong></span>
                        <span><small>状态</small><strong>{latestRun.status}</strong></span>
                      </div>
                      {latestFailures.categories.length ? (
                        <div className='agent-failures' aria-label='评估失败分类'>
                          <div>{latestFailures.categories.map(([category, count]) => (
                            <span key={category}>{category} × {count}</span>
                          ))}</div>
                          {latestFailures.messages.map(message => <p key={message}>{message}</p>)}
                          <div className='agent-detail-actions'>
                            <button
                              disabled={Boolean(action)}
                              onClick={() => { void loadRunDetail(latestRun) }}
                              type='button'
                            >
                              {action === 'detail' ? '读取中…' : '查看失败明细'}
                            </button>
                            <button
                              disabled={!visibleFailures.length}
                              onClick={exportRunDetail}
                              type='button'
                            >导出 JSON</button>
                          </div>
                        </div>
                      ) : null}
                      {visibleFailures.length ? (
                        <div className='agent-failure-detail' aria-label='评估失败明细'>
                          <strong>失败明细（前 20 条 / 共 {visibleFailures.length} 条）</strong>
                          {visibleFailures.slice(0, 20).map(item => (
                            <div key={item.caseId}>
                              <span>{item.caseId}</span>
                              <code>{item.failures.join(', ')}</code>
                              <small>expected: {compactIntent(item.expected)}</small>
                              <small>actual: {compactIntent(item.actual)}</small>
                              {item.mismatchedFields?.length ? (
                                <em>fields: {item.mismatchedFields.join(', ')}</em>
                              ) : null}
                              {item.modelError ? <em>{item.modelError}</em> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p>需要 150 条完整评估、总体至少 98%、关键安全项 100%，才能发布。</p>
                  )}
                </div>
              </>
            ) : (
              <div className='agent-empty'>
                <strong>固定拓扑已经就位</strong>
                <p>创建第一份草稿后，才能配置模型、能力、别名、阈值与预算。</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <style>{`
        .agent-studio{max-width:1180px}.agent-studio-head{position:relative;overflow:hidden;padding:22px 24px;border:1px solid rgba(17,63,49,.1)!important;background:linear-gradient(135deg,rgba(244,241,229,.88),rgba(222,234,224,.72))!important}.agent-studio-head:after{content:'V2';position:absolute;right:18px;top:-18px;color:rgba(17,63,49,.055);font-family:var(--display-serif);font-size:112px;line-height:1}.agent-environment{display:flex;align-items:center;gap:5px;padding:5px;border:1px solid rgba(17,63,49,.1);border-radius:14px;background:rgba(255,255,255,.48);width:max-content}.agent-environment button{border:0;border-radius:10px;padding:8px 13px;background:transparent;color:var(--muted);cursor:pointer}.agent-environment button[aria-pressed='true']{background:var(--leaf);color:#f8f5e9}.agent-environment>span{padding:0 10px;color:var(--quiet);font-size:11px}.agent-pipeline{display:grid;grid-template-columns:repeat(9,minmax(74px,1fr));gap:3px;overflow:auto;padding:10px 0}.agent-pipeline-node{position:relative;display:grid;gap:5px;min-width:74px;padding:13px 10px;border-top:2px solid var(--leaf);background:rgba(255,255,255,.48)}.agent-pipeline-node i{color:var(--quiet);font-size:9px;font-style:normal;letter-spacing:.12em}.agent-pipeline-node strong{font-size:12px}.agent-pipeline-node b{position:absolute;right:-7px;top:22px;z-index:2;color:var(--quiet);font-weight:400}.agent-studio-grid{display:grid;grid-template-columns:220px minmax(0,1fr);gap:22px}.agent-versions{display:grid;align-content:start;gap:8px;border-right:1px solid rgba(17,63,49,.09);padding-right:16px}.agent-panel-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.agent-panel-title small,.agent-subpanel small,.agent-gate-report small{color:var(--quiet);font-size:8px;letter-spacing:.14em;text-transform:uppercase}.agent-panel-title h4,.agent-subpanel h5,.agent-gate-report h5{margin:2px 0 0;font-family:var(--display-serif);font-size:20px}.agent-panel-title>button,.agent-actions button,.agent-primary{border:1px solid rgba(17,63,49,.14);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.55);color:var(--leaf);cursor:pointer}.agent-version{border:1px solid transparent;border-radius:12px;padding:4px;background:rgba(255,255,255,.32)}.agent-version.is-active{border-color:rgba(17,63,49,.18);background:rgba(220,233,223,.56)}.agent-version>button:first-child{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;width:100%;border:0;padding:8px;background:transparent;color:var(--ink);text-align:left;cursor:pointer}.agent-version span{font-family:var(--display-serif);font-size:18px}.agent-version strong{justify-self:end;color:var(--leaf);font-size:10px}.agent-version small{grid-column:1/-1;color:var(--quiet);font-family:monospace}.agent-version .agent-rollback{width:100%;border:0;border-top:1px solid rgba(17,63,49,.08);padding:7px;background:transparent;color:var(--muted);font-size:10px;cursor:pointer}.agent-editor{min-width:0}.agent-status{border-radius:99px;padding:5px 9px;background:rgba(17,63,49,.08);color:var(--leaf);font-size:9px;letter-spacing:.12em;text-transform:uppercase}.agent-diff{display:flex;gap:10px;margin:0 0 16px;padding:10px 12px;border-left:3px solid #b88548;background:rgba(184,133,72,.07);font-size:11px}.agent-diff span{color:var(--muted)}.agent-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.agent-form-grid label{display:grid;gap:6px}.agent-form-grid label>span{color:var(--muted);font-size:11px}.agent-form-grid input{width:100%;box-sizing:border-box;border:1px solid rgba(17,63,49,.12);border-radius:10px;padding:10px 11px;background:rgba(255,255,255,.58);color:var(--ink)}.agent-subpanel{margin:18px 0;padding:16px;border:1px solid rgba(17,63,49,.09);border-radius:14px;background:rgba(255,255,255,.3)}.agent-capabilities{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:12px}.agent-capabilities label{display:flex;align-items:center;gap:9px;padding:9px;border-radius:10px;background:rgba(255,255,255,.45)}.agent-capabilities label>span{display:grid}.agent-capabilities strong{font-size:11px}.agent-capabilities small{font-family:monospace;text-transform:none;letter-spacing:0}.agent-guardrails{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:18px 0}.agent-guardrails div{display:grid;gap:4px;border-top:1px solid rgba(17,63,49,.16);padding:10px 4px}.agent-guardrails span{color:var(--quiet);font-size:9px}.agent-guardrails strong{font-size:11px}.agent-actions{display:flex;flex-wrap:wrap;gap:8px}.agent-actions .agent-primary,.agent-primary{border-color:var(--leaf);background:var(--leaf);color:#f8f5e9}.agent-actions button:disabled,.agent-primary:disabled,.agent-panel-title button:disabled{cursor:not-allowed;opacity:.42}.agent-gate-report{display:grid;grid-template-columns:150px 1fr;gap:15px;margin-top:20px;padding:16px;border-top:1px solid rgba(17,63,49,.1);border-bottom:1px solid rgba(17,63,49,.1)}.agent-gate-report p{margin:0;color:var(--muted);font-size:12px;line-height:1.7}.agent-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.agent-metrics span{display:grid;gap:5px}.agent-metrics strong{font-family:var(--display-serif);font-size:18px}.agent-failures{display:grid;gap:7px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(151,58,48,.12)}.agent-failures>div{display:flex;flex-wrap:wrap;gap:6px}.agent-failures span{border-radius:99px;padding:4px 7px;background:rgba(151,58,48,.08);color:#87382f;font-family:monospace;font-size:9px}.agent-failures p{word-break:break-word}.agent-detail-actions{display:flex;gap:7px;margin-top:6px}.agent-detail-actions button{border:1px solid rgba(151,58,48,.16);border-radius:9px;padding:6px 8px;background:rgba(255,255,255,.5);color:#87382f;font-size:10px;cursor:pointer}.agent-detail-actions button:disabled{cursor:not-allowed;opacity:.45}.agent-failure-detail{display:grid;gap:8px;margin-top:12px;padding:12px;border:1px solid rgba(151,58,48,.12);border-radius:12px;background:rgba(151,58,48,.04)}.agent-failure-detail>strong{font-size:11px}.agent-failure-detail>div{display:grid;gap:3px;padding:8px;border-radius:9px;background:rgba(255,255,255,.42)}.agent-failure-detail span{font-family:monospace;font-size:10px;color:#87382f}.agent-failure-detail code{white-space:normal;color:#87382f}.agent-failure-detail small,.agent-failure-detail em{color:var(--muted);font-size:10px;word-break:break-word}.agent-notice{border-radius:10px;padding:10px 12px;font-size:12px}.agent-notice.is-error{background:rgba(151,58,48,.09);color:#87382f}.agent-notice.is-success{background:rgba(17,63,49,.09);color:var(--leaf)}.agent-empty{padding:40px;border:1px dashed rgba(17,63,49,.2);text-align:center}.agent-empty p{color:var(--muted)}@media(max-width:900px){.agent-studio-grid{grid-template-columns:1fr}.agent-versions{grid-template-columns:repeat(2,minmax(0,1fr));border-right:0;border-bottom:1px solid rgba(17,63,49,.09);padding:0 0 16px}.agent-versions>.agent-panel-title,.agent-versions>.settings-muted{grid-column:1/-1}.agent-pipeline{grid-template-columns:repeat(9,90px)}}@media(max-width:620px){.agent-form-grid,.agent-capabilities{grid-template-columns:1fr}.agent-guardrails{grid-template-columns:repeat(2,1fr)}.agent-gate-report{grid-template-columns:1fr}.agent-metrics{grid-template-columns:repeat(2,1fr)}.agent-environment>span{display:none}}
      `}</style>
    </section>
  )
}
