#!/usr/bin/env node

const ROLE_INSTRUCTIONS = {
  outline: '设计覆盖全部来源的单课大纲，给出准确转录行号和课件页码，不写正文。',
  writer: '只撰写当前正文节点，充分展开来源中的概念、论证、法条和案例，不得写其他节点。',
  reviewer: '独立核对草稿与来源，给出可定位的问题，不得笼统好评。',
  revision: '只修订当前节点，根据审查意见和用户要求补足内容，不重写整课。',
  finalReview: '检查整课覆盖、来源依据、重复、结构和术语一致性，需要修改时给出 nodeId。'
}

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2); const next = argv[i + 1]
    if (!next || next.startsWith('--')) args[key] = true
    else { args[key] = next; i += 1 }
  }
  return args
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function requireCourseModelConfig(role) {
  const env = { outline: 'COURSE_OUTLINE_MODEL', writer: 'COURSE_WRITER_MODEL', reviewer: 'COURSE_REVIEWER_MODEL', revision: 'COURSE_REVISION_MODEL', finalReview: 'COURSE_FINAL_REVIEW_MODEL' }
  const apiKey = process.env.COURSE_AI_API_KEY || process.env.SCHEDULE_AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('COURSE_AI_API_KEY is required for course model calls')
  const fallback = process.env.COURSE_AI_MODEL || process.env.SCHEDULE_AI_MODEL
  const model = process.env[env[role]] || (role === 'revision' ? process.env.COURSE_WRITER_MODEL : '') || fallback
  if (!model) throw new Error(`${env[role] || 'COURSE_AI_MODEL'} is required`)
  return { baseUrl: (process.env.COURSE_AI_BASE_URL || process.env.SCHEDULE_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''), apiKey, model }
}

function buildPrompt({ role, promptVersion = 'course-controlled-v2', courseSpec, lessonBlueprint, writerBrief, sourceText, pptText, currentDraft, schema }) {
  return {
    system: `${ROLE_INSTRUCTIONS[role] || '整理课程内容。'}\nPrompt version: ${promptVersion}\n只返回 JSON，不得编造材料中没有的内容。`,
    user: [
      `课程规则：\n${JSON.stringify(courseSpec || {}, null, 2)}`,
      `本课全局结构：\n${JSON.stringify(lessonBlueprint || {}, null, 2)}`,
      `当前节点要求：\n${JSON.stringify(writerBrief || {}, null, 2)}`,
      currentDraft ? `当前草稿：\n${currentDraft}` : '',
      `转录来源：\n${sourceText || ''}`,
      `课件与讲义来源：\n${pptText || ''}`,
      `输出结构：\n${JSON.stringify(schema || {}, null, 2)}`
    ].filter(Boolean).join('\n\n')
  }
}

function parseJsonResponse(text) {
  const raw = String(text || '').trim()
  if (!raw) throw new Error('Model response is empty')
  return JSON.parse(raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim())
}

function validateOutline(value) {
  if (!value || typeof value.mainLine !== 'string' || !Array.isArray(value.outline) || !value.outline.length) throw new Error('Outline response is invalid')
  value.outline.forEach((node, i) => { if (!node?.title || !Array.isArray(node.lineRange) || node.lineRange.length !== 2) throw new Error(`Outline node ${i + 1} is invalid`) })
  return value
}
function validateMarkdown(value) {
  if (!value || typeof value.markdown !== 'string' || !value.markdown.trim()) throw new Error('Writer returned empty markdown')
  return value
}
function validateReview(value) {
  if (!value || !['approve', 'revise', 'human_review'].includes(value.decision)) throw new Error('Reviewer decision is invalid')
  for (const key of ['coverage', 'grounding', 'logic', 'detail', 'sourceCoverage']) {
    const score = Number(value[key]); if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`Reviewer score ${key} is invalid`); value[key] = score
  }
  value.issues = Array.isArray(value.issues) ? value.issues : []
  return value
}

async function callCourseModel({ role, prompt, fetchImpl = fetch }) {
  const config = requireCourseModelConfig(role)
  const attempts = Math.max(1, Number(process.env.COURSE_AI_MAX_ATTEMPTS || 3))
  const timeoutMs = Math.max(5000, Number(process.env.COURSE_AI_TIMEOUT_MS || 90000))
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: 'POST', headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }], temperature: Number(process.env.COURSE_AI_TEMPERATURE || .2), response_format: { type: 'json_object' } })
      })
      const body = await response.text()
      if (!response.ok) { const error = new Error(`Course model call failed: ${response.status}`); error.retryable = response.status === 429 || response.status >= 500; throw error }
      const data = body ? JSON.parse(body) : {}
      return { parsed: parseJsonResponse(data.choices?.[0]?.message?.content || ''), trace: { role, model: config.model, provider: process.env.COURSE_AI_PROVIDER || 'openai-compatible', promptVersion: process.env.COURSE_PROMPT_VERSION || 'course-controlled-v2', usage: data.usage || null, completedAt: new Date().toISOString() } }
    } catch (error) {
      if (!(error.name === 'AbortError' || error.retryable) || attempt === attempts) throw error
      await sleep(Math.min(8000, 500 * (2 ** (attempt - 1))))
    } finally { clearTimeout(timer) }
  }
}

async function request(baseUrl, jobId, token, method = 'GET', body, fetchImpl = fetch) {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/courses/jobs/${encodeURIComponent(jobId)}/worker-step`, { method, headers: { 'content-type': 'application/json', 'x-course-worker-token': token }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  if (!response.ok || !data.ok) throw new Error(data.error || `Worker API failed ${response.status}`)
  return data
}

function deterministicOutline(task) {
  const lines = String(task.lesson.transcript || '').split('\n').filter(Boolean); const end = Math.max(1, lines.length); const middle = Math.max(1, Math.floor(end / 2))
  const outline = end > 40 ? [
    { title: '基本概念与问题展开', lineRange: [1, middle], slideRange: [1, 1], rationale: '梳理前半部分概念和论证。', importance: 'high', concepts: [], statutes: [], cases: [] },
    { title: '规则适用与案例分析', lineRange: [middle + 1, end], slideRange: [1, 1], rationale: '整理后半部分规则、案例和结论。', importance: 'high', concepts: [], statutes: [], cases: [] }
  ] : [{ title: task.lesson.title || '本课主线', lineRange: [1, end], slideRange: [1, 1], rationale: '覆盖本课全部来源。', importance: 'high', concepts: [], statutes: [], cases: [] }]
  return { type: 'save-outline', lessonKey: task.lessonKey, mainLine: task.lesson.title, outline, taskKey: task.taskKey }
}
function deterministicNode(task) {
  const source = String(task.node.sourceText || '').trim()
  return { type: 'save-node-draft-worker', lessonKey: task.lessonKey, nodeId: task.node.id, markdown: [`## ${task.node.title}`, '', source || '本节点缺少可用来源。'].join('\n'), source: task.type === 'revise-node' ? 'revision' : 'writer', taskKey: task.taskKey, trace: { provider: 'deterministic', role: task.type === 'revise-node' ? 'revision' : 'writer' } }
}
function deterministicReview(task) {
  const ok = Boolean(String(task.node.sourceText || '').trim() && String(task.node.draft || '').trim())
  return { type: 'save-node-review', lessonKey: task.lessonKey, nodeId: task.node.id, reviewerReport: { coverage: ok ? 90 : 20, grounding: ok ? 92 : 20, logic: ok ? 88 : 20, detail: ok ? 86 : 20, sourceCoverage: ok ? 90 : 10, issues: ok ? [] : [{ type: 'missing_content', severity: 'high', message: '缺少来源或正文。', nodeId: task.node.id }], decision: ok ? 'approve' : 'revise' }, taskKey: task.taskKey, trace: { provider: 'deterministic', role: 'reviewer' } }
}
function deterministicFinal(task) {
  const ok = Boolean(String(task.lesson?.finalNote?.markdown || '').trim())
  return { type: 'complete-final-review', lessonKey: task.lessonKey, qualityReport: { coverage: ok ? 90 : 20, grounding: ok ? 90 : 20, logic: ok ? 88 : 20, detail: ok ? 86 : 20, sourceCoverage: ok ? 88 : 20, issues: ok ? [] : [{ type: 'empty_note', severity: 'high', message: '最终笔记为空。' }], decision: ok ? 'approve' : 'revise' }, taskKey: task.taskKey, trace: { provider: 'deterministic', role: 'finalReview' } }
}

async function executeTask(task, options = {}) {
  if (task.type === 'idle') return null
  if (task.type === 'plan-nodes') return { type: 'plan-nodes', lessonKey: task.lessonKey, taskKey: task.taskKey }
  if (task.type === 'assemble') return { type: 'assemble', lessonKey: task.lessonKey, taskKey: task.taskKey }
  if (options.deterministic) {
    if (task.type === 'generate-outline') return deterministicOutline(task)
    if (['write-node', 'revise-node'].includes(task.type)) return deterministicNode(task)
    if (task.type === 'review-node') return deterministicReview(task)
    if (task.type === 'final-review') return deterministicFinal(task)
  }
  if (task.type === 'generate-outline') {
    const result = await callCourseModel({ role: 'outline', prompt: buildPrompt({ role: 'outline', promptVersion: task.courseSpec?.promptVersion, courseSpec: task.courseSpec, lessonBlueprint: { title: task.lesson.title }, sourceText: task.lesson.transcript, pptText: JSON.stringify([...(task.lesson.pptText || []), ...(task.lesson.supplements || [])]), schema: { mainLine: 'string', outline: [{ title: 'string', lineRange: [1, 10], slideRange: [1, 1], rationale: 'string', importance: 'high|normal|low', concepts: [], statutes: [], cases: [] }] } }) })
    const value = validateOutline(result.parsed)
    return { type: 'save-outline', lessonKey: task.lessonKey, mainLine: value.mainLine, outline: value.outline, taskKey: task.taskKey, trace: result.trace }
  }
  if (['write-node', 'revise-node'].includes(task.type)) {
    const role = task.type === 'revise-node' ? 'revision' : 'writer'
    const result = await callCourseModel({ role, prompt: buildPrompt({ role, promptVersion: task.courseSpec?.promptVersion, courseSpec: task.courseSpec, lessonBlueprint: task.lessonBlueprint, writerBrief: { ...(task.node.writerBrief || {}), revisionRequests: task.node.revisionRequests || [], reviewerIssues: task.node.reviewerReports?.at(-1)?.value?.issues || [] }, currentDraft: task.type === 'revise-node' ? task.node.draft : '', sourceText: task.node.sourceText, pptText: task.node.pptText, schema: { markdown: 'string' } }) })
    return { type: 'save-node-draft-worker', lessonKey: task.lessonKey, nodeId: task.node.id, markdown: validateMarkdown(result.parsed).markdown, source: role, taskKey: task.taskKey, trace: result.trace }
  }
  if (task.type === 'review-node') {
    const result = await callCourseModel({ role: 'reviewer', prompt: buildPrompt({ role: 'reviewer', promptVersion: task.courseSpec?.promptVersion, courseSpec: task.courseSpec, lessonBlueprint: task.lessonBlueprint, writerBrief: { ...(task.node.writerBrief || {}), nodeId: task.node.id, title: task.node.title }, currentDraft: task.node.draft, sourceText: task.node.sourceText, pptText: task.node.pptText, schema: { coverage: 0, grounding: 0, logic: 0, detail: 0, sourceCoverage: 0, issues: [{ type: 'string', severity: 'high|medium|low', message: 'string', nodeId: task.node.id, sourceRange: 'string' }], decision: 'approve|revise|human_review' } }) })
    return { type: 'save-node-review', lessonKey: task.lessonKey, nodeId: task.node.id, reviewerReport: validateReview(result.parsed), taskKey: task.taskKey, trace: result.trace }
  }
  if (task.type === 'final-review') {
    const result = await callCourseModel({ role: 'finalReview', prompt: buildPrompt({ role: 'finalReview', promptVersion: task.courseSpec?.promptVersion, courseSpec: task.courseSpec, lessonBlueprint: task.lesson?.blueprint, writerBrief: { lessonTitle: task.lesson?.title, nodes: (task.lesson?.nodes || []).map(node => ({ id: node.id, title: node.title, lineRange: node.lineRange })) }, currentDraft: task.lesson?.finalNote?.markdown, sourceText: (task.lesson?.nodes || []).map(node => `[${node.id}]\n${node.sourceText || ''}`).join('\n\n'), schema: { coverage: 0, grounding: 0, logic: 0, detail: 0, sourceCoverage: 0, issues: [{ type: 'string', severity: 'high|medium|low', message: 'string', nodeId: 'string' }], decision: 'approve|revise|human_review' } }) })
    return { type: 'complete-final-review', lessonKey: task.lessonKey, qualityReport: validateReview(result.parsed), taskKey: task.taskKey, trace: result.trace }
  }
  throw new Error(`Unsupported worker task: ${task.type}`)
}

function printHelp() {
  console.log('Usage:\n  npm run course:worker:run-job -- --job-id <id> --base-url http://127.0.0.1:3000 --token <token>\n\nOptions:\n  --once\n  --deterministic\n  --poll-ms <number>\n\nThe worker only receives processed text and never uploads raw course files.')
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args['job-id'] || !args['base-url'] || !args.token) return printHelp()
  const pollMs = Math.max(500, Number(args['poll-ms'] || 1500)); let completed = 0
  while (completed < 100) {
    await request(args['base-url'], args['job-id'], args.token, 'POST', { type: 'heartbeat', message: '本地处理服务已连接' })
    const state = await request(args['base-url'], args['job-id'], args.token); const task = state.task
    if (!task || task.type === 'idle') { console.log(JSON.stringify({ ok: true, idle: true, reason: task?.reason || 'none', completed }, null, 2)); return }
    try {
      const action = await executeTask(task, { deterministic: Boolean(args.deterministic) }); if (!action) return
      await request(args['base-url'], args['job-id'], args.token, 'POST', action); completed += 1
      if (args.once) break
      await sleep(pollMs)
    } catch (error) {
      await request(args['base-url'], args['job-id'], args.token, 'POST', { type: 'fail-step', step: task.type, error: error instanceof Error ? error.message : String(error), retryable: true, taskKey: `${task.taskKey || task.type}:failed` })
      throw error
    }
  }
  console.log(JSON.stringify({ ok: true, completed }, null, 2))
}

if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
module.exports = { buildPrompt, callCourseModel, executeTask, parseJsonResponse, validateOutline, validateMarkdown, validateReview }
