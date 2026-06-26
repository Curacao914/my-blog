const ROLE_MODEL_ENV = {
  outline: 'COURSE_OUTLINE_MODEL',
  writer: 'COURSE_WRITER_MODEL',
  reviewer: 'COURSE_REVIEWER_MODEL',
  revision: 'COURSE_REVISION_MODEL',
  finalReview: 'COURSE_FINAL_REVIEW_MODEL'
}

const COMMON_RULES = `
你正在参与一个法律课程笔记工作流。只能完成本次指定阶段，不得越过大纲确认、节点写作、独立审查或最终检查。
所有结论必须以提供的课堂转录、课件和补充材料为依据。材料没有说明的内容不得补写为课堂事实、法条原文、案例事实或教师观点；存在不确定性时应明确标注。
输出必须是符合 RequiredOutputSchema 的单个 JSON 对象，不得添加 Markdown 代码围栏、解释性前言或额外字段。
`.trim()

const ROLE_SYSTEM = {
  outline: `你是课程大纲规划者 [outline]。阅读全文后提炼本课主线，并把材料划分为连续、无遗漏、尽量不重叠的可写节点。每个节点必须给出准确的转录行号范围和对应课件页码，识别概念、法条、案例、教师强调信号与节点写作目标。不要撰写正文。`,
  writer: `你是课程节点撰写者 [writer]。只撰写当前 WriterBrief 指定的一个节点，保持与完整 LessonBlueprint 的主线和相邻节点分工一致。内容应充分展开课堂论证，不得压缩成提纲式摘要，也不得重复其他节点。案例至少交代背景或案名、事实、争点、结论与规则适用、教师评价、论证意义；材料缺少其中某项时应如实标注。输出 Markdown 正文，但必须放在 JSON 的 markdown 字段中。`,
  reviewer: `你是独立课程审查者 [reviewer]。逐项核对草稿与来源，严禁因为文字流畅而宽松放行。重点检查材料覆盖、来源依据、论证逻辑、细节充分程度、案例六要素、法条与教师观点的准确性、无依据扩写、异常压缩和重复。issues 必须具体、可执行，并尽量给出 nodeId 与 sourceRange。`,
  revision: `你是课程节点修订者 [revision]。只修订当前节点，逐项回应 Reviewer issues 和用户修改要求；保留已经正确且有来源的内容，不得重写整课，不得跨节点补写。输出完整的新版本 Markdown，放在 JSON 的 markdown 字段中。`,
  finalReview: `你是单课最终审查者 [finalReview]。检查已拼装笔记是否落实本课主线、节点是否遗漏或重复、术语与教师观点是否一致、法条和案例表达是否准确、篇幅是否失衡、来源覆盖是否完整。发现问题必须定位到具体 nodeId；质量问题应返回 revise 或 human_review，不得把它描述成技术故障。`
}

function jsonBlock(label, value) {
  return [`## ${label}`, '```json', JSON.stringify(value || {}, null, 2), '```'].join('\n')
}

function textBlock(label, value) {
  return [`## ${label}`, String(value || '').trim() || '(empty)'].join('\n')
}

export function requireCourseModelConfig(role) {
  const apiKey = process.env.COURSE_AI_API_KEY || process.env.SCHEDULE_AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('COURSE_AI_API_KEY is required for course worker model calls')

  const baseUrl =
    process.env.COURSE_AI_BASE_URL ||
    process.env.SCHEDULE_AI_BASE_URL ||
    'https://api.openai.com/v1'
  const model =
    process.env[ROLE_MODEL_ENV[role]] ||
    process.env.COURSE_AI_MODEL ||
    process.env.SCHEDULE_AI_MODEL
  if (!model) throw new Error(`${ROLE_MODEL_ENV[role] || 'COURSE_AI_MODEL'} is required`)

  return {
    provider: process.env.COURSE_AI_PROVIDER || 'openai-compatible',
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKey,
    model
  }
}

export function buildPrompt({
  role,
  promptVersion = 'course-workflow-v3',
  courseSpec,
  lessonBlueprint,
  writerBrief,
  sourceText,
  pptText,
  previousNodeSummary,
  nextNodeTarget,
  schema
}) {
  const system = `${ROLE_SYSTEM[role] || ROLE_SYSTEM.writer}\n\n${COMMON_RULES}\n\nPrompt version: ${promptVersion}`
  const user = [
    textBlock('PromptVersion', promptVersion),
    jsonBlock('CourseSpec', courseSpec),
    jsonBlock('LessonBlueprint', lessonBlueprint),
    jsonBlock('WriterBrief', writerBrief),
    textBlock('PreviousNodeSummary', previousNodeSummary),
    textBlock('NextNodeTarget', nextNodeTarget),
    textBlock('TranscriptSource', sourceText),
    textBlock('PptAndSupplementSource', pptText),
    jsonBlock('RequiredOutputSchema', schema),
    '请只返回一个有效 JSON 对象。不得编造来源中不存在的内容。'
  ].join('\n\n')

  return { system, user, version: promptVersion, role }
}

export function parseJsonResponse(text) {
  const raw = String(text || '').trim()
  if (!raw) throw new Error('Model response is empty')
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(stripped)
  } catch {
    throw new Error('Model response must be valid JSON')
  }
}

export async function callCourseModel({ role, prompt, signal }) {
  const config = requireCourseModelConfig(role)
  const startedAt = new Date().toISOString()
  const timeoutMs = Math.max(10_000, Number(process.env.COURSE_AI_TIMEOUT_MS || 120_000))
  const requestSignal = signal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined)
  let response
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: requestSignal,
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: Number(process.env.COURSE_AI_TEMPERATURE || 0.2),
        response_format: { type: 'json_object' }
      })
    })
  } catch (error) {
    const message = error?.name === 'TimeoutError' || error?.name === 'AbortError'
      ? `Course model call timed out after ${timeoutMs}ms`
      : `Course model request failed: ${error instanceof Error ? error.message : String(error)}`
    const wrapped = new Error(message)
    wrapped.meta = { provider: config.provider, model: config.model, role, startedAt, endedAt: new Date().toISOString() }
    throw wrapped
  }

  const endedAt = new Date().toISOString()
  const body = await response.text()
  if (!response.ok) {
    const error = new Error(`Course model call failed: ${response.status}`)
    error.meta = {
      provider: config.provider,
      model: config.model,
      role,
      startedAt,
      endedAt,
      status: response.status
    }
    throw error
  }

  let data
  try {
    data = body ? JSON.parse(body) : {}
  } catch {
    throw new Error('Course model endpoint returned invalid JSON')
  }
  const content = data.choices?.[0]?.message?.content || ''
  const parsed = parseJsonResponse(content)
  return {
    parsed,
    trace: {
      provider: config.provider,
      model: config.model,
      role,
      promptVersion: prompt.version || 'course-workflow-v3',
      startedAt,
      endedAt,
      promptChars: prompt.user.length + prompt.system.length,
      completionChars: content.length,
      usage: data.usage || null
    }
  }
}
