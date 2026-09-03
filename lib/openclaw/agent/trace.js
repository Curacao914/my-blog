import crypto from 'crypto'

function clean(value, limit = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function createTrace({
  messageId = '',
  sessionId = '',
  inputText = '',
  now = new Date()
} = {}) {
  const traceId = crypto.randomUUID()
  return {
    traceId,
    messageId: clean(messageId, 240),
    sessionId: clean(sessionId, 240),
    input: clean(inputText, 800),
    inputHash: crypto
      .createHash('sha256')
      .update(String(inputText || ''))
      .digest('hex'),
    startedAt: now.toISOString(),
    routePlan: null,
    model: null,
    capability: '',
    querySpecs: [],
    candidates: [],
    policy: null,
    mutationSpecs: [],
    toolResults: [],
    beforeAfter: [],
    response: '',
    latencyMs: 0,
    error: ''
  }
}

export function finishTrace(trace, {
  response = '',
  error = '',
  now = new Date()
} = {}) {
  const started = Date.parse(trace.startedAt || '')
  return {
    ...trace,
    response: clean(response, 1600),
    error: clean(error, 800),
    finishedAt: now.toISOString(),
    latencyMs: Number.isFinite(started)
      ? Math.max(0, now.getTime() - started)
      : 0
  }
}

export function compactCandidateTrace(candidates = []) {
  return (candidates || []).slice(0, 12).map(item => ({
    id: item.id,
    type: item.type,
    title: clean(item.title, 240),
    score: Number(item.score || 0),
    reason: clean(item.matchReason, 240)
  }))
}

export function emitTrace(trace) {
  const safe = {
    event: 'openclaw_agent_trace',
    traceId: trace.traceId,
    messageId: trace.messageId,
    capability: trace.capability,
    decision: trace.routePlan?.decision || '',
    scope: trace.routePlan?.scope || '',
    candidateCount: trace.candidates?.length || 0,
    policy: trace.policy?.decision || '',
    toolCount: trace.toolResults?.length || 0,
    latencyMs: trace.latencyMs,
    error: trace.error || ''
  }
  console.info(JSON.stringify(safe))
}
