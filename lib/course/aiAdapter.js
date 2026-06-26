const ROLE_MODEL_ENV = {
  outline: 'COURSE_OUTLINE_MODEL',
  writer: 'COURSE_WRITER_MODEL',
  reviewer: 'COURSE_REVIEWER_MODEL',
  revision: 'COURSE_REVISION_MODEL',
  finalReview: 'COURSE_FINAL_REVIEW_MODEL'
}

const ROLE_SYSTEM = {
  outline:
    'You are the course outline planner. Return only valid JSON that follows the requested schema.',
  writer:
    'You are the course node writer. Write grounded Markdown for exactly the requested node and return only valid JSON.',
  reviewer:
    'You are the independent course reviewer. Score the node rigorously and return only valid JSON.',
  revision:
    'You are the course node reviser. Revise only the requested node according to reviewer issues and return only valid JSON.',
  finalReview:
    'You are the final lesson reviewer. Check consistency, grounding, duplicated passages, and return only valid JSON.'
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
  promptVersion = 'course-mvp-v1',
  courseSpec,
  lessonBlueprint,
  writerBrief,
  sourceText,
  pptText,
  previousNodeSummary,
  nextNodeTarget,
  schema
}) {
  const system = `${ROLE_SYSTEM[role] || ROLE_SYSTEM.writer}\nPrompt version: ${promptVersion}`
  const user = [
    textBlock('PromptVersion', promptVersion),
    jsonBlock('CourseSpec', courseSpec),
    jsonBlock('LessonBlueprint', lessonBlueprint),
    jsonBlock('WriterBrief', writerBrief),
    textBlock('PreviousNodeSummary', previousNodeSummary),
    textBlock('NextNodeTarget', nextNodeTarget),
    textBlock('TranscriptSource', sourceText),
    textBlock('PptSource', pptText),
    jsonBlock('RequiredOutputSchema', schema),
    'Return valid JSON only. Do not add materials that are not grounded in TranscriptSource or PptSource.'
  ].join('\n\n')

  return { system, user }
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
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
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
  const data = body ? JSON.parse(body) : {}
  const content = data.choices?.[0]?.message?.content || ''
  const parsed = parseJsonResponse(content)
  return {
    parsed,
    trace: {
      provider: config.provider,
      model: config.model,
      role,
      promptVersion: 'course-mvp-v1',
      startedAt,
      endedAt,
      promptChars: prompt.user.length + prompt.system.length,
      completionChars: content.length,
      usage: data.usage || null
    }
  }
}
