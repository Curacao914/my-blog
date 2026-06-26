#!/usr/bin/env node

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) args[key] = true
    else {
      args[key] = next
      index += 1
    }
  }
  return args
}

function requireCourseModelConfig(role) {
  const modelEnv = {
    outline: 'COURSE_OUTLINE_MODEL',
    writer: 'COURSE_WRITER_MODEL',
    reviewer: 'COURSE_REVIEWER_MODEL',
    revision: 'COURSE_REVISION_MODEL',
    finalReview: 'COURSE_FINAL_REVIEW_MODEL'
  }
  const apiKey = process.env.COURSE_AI_API_KEY || process.env.SCHEDULE_AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('COURSE_AI_API_KEY is required for course worker model calls')
  const model = process.env[modelEnv[role]] || process.env.COURSE_AI_MODEL || process.env.SCHEDULE_AI_MODEL
  if (!model) throw new Error(`${modelEnv[role] || 'COURSE_AI_MODEL'} is required`)
  return {
    baseUrl: (process.env.COURSE_AI_BASE_URL || process.env.SCHEDULE_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    apiKey,
    model
  }
}

function buildPrompt({ role, promptVersion = 'course-mvp-v1', courseSpec, lessonBlueprint, writerBrief, sourceText, pptText, schema }) {
  return {
    system: `You are the course ${role}. Return valid JSON only. Prompt version: ${promptVersion}`,
    user: [
      `PromptVersion: ${promptVersion}`,
      `CourseSpec:\n${JSON.stringify(courseSpec || {}, null, 2)}`,
      `LessonBlueprint:\n${JSON.stringify(lessonBlueprint || {}, null, 2)}`,
      `WriterBrief:\n${JSON.stringify(writerBrief || {}, null, 2)}`,
      `TranscriptSource:\n${sourceText || ''}`,
      `PptSource:\n${pptText || ''}`,
      `RequiredOutputSchema:\n${JSON.stringify(schema || {}, null, 2)}`,
      'Return valid JSON only. Do not invent unsupported material.'
    ].join('\n\n')
  }
}

function parseJsonResponse(text) {
  const raw = String(text || '').trim()
  if (!raw) throw new Error('Model response is empty')
  const stripped = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(stripped)
}

async function callCourseModel({ role, prompt }) {
  const config = requireCourseModelConfig(role)
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
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
  const body = await response.text()
  if (!response.ok) throw new Error(`Course model call failed: ${response.status}`)
  const data = body ? JSON.parse(body) : {}
  return { parsed: parseJsonResponse(data.choices?.[0]?.message?.content || '') }
}

async function request(baseUrl, jobId, token, method = 'GET', body) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/courses/jobs/${encodeURIComponent(jobId)}/worker-step`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-course-worker-token': token
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await response.json()
  if (!response.ok || !data.ok) throw new Error(data.error || `Worker API failed ${response.status}`)
  return data
}

function deterministicOutline(task) {
  const lines = String(task.lesson.transcript || '').split('\n').filter(Boolean)
  const end = Math.max(1, lines.length)
  return {
    type: 'save-outline',
    lessonKey: task.lessonKey,
    mainLine: task.lesson.title,
    outline: [
      {
        title: task.lesson.title || '本课主线',
        lineRange: [1, end],
        slideRange: [1, 1],
        rationale: '根据本课转录文本建立的单课主线。',
        importance: 'high',
        concepts: [],
        statutes: [],
        cases: []
      }
    ]
  }
}

function deterministicNode(task) {
  const source = String(task.node.sourceText || '').trim()
  return {
    type: 'update-node-draft',
    lessonKey: task.lessonKey,
    nodeId: task.node.id,
    markdown: [`## ${task.node.title}`, '', source || '该节点缺少可用来源文本。'].join('\n'),
    reviewerReport: {
      coverage: source ? 90 : 20,
      grounding: source ? 90 : 20,
      logic: source ? 85 : 20,
      detail: source ? 80 : 20,
      sourceCoverage: source ? 88 : 10,
      issues: source ? [] : ['缺少来源文本'],
      decision: source ? 'approve' : 'revise'
    }
  }
}

function deterministicFinalReview(task) {
  const markdown = String(task.lesson?.finalNote?.markdown || '').trim()
  return {
    type: 'complete-final-review',
    lessonKey: task.lessonKey,
    qualityReport: {
      coverage: markdown ? 90 : 20,
      grounding: markdown ? 90 : 20,
      logic: markdown ? 88 : 20,
      detail: markdown ? 86 : 20,
      sourceCoverage: markdown ? 88 : 20,
      issues: markdown ? [] : ['最终笔记为空'],
      decision: markdown ? 'approve' : 'revise'
    }
  }
}

async function executeTask(task, options) {
  if (task.type === 'idle') return null
  if (task.type === 'plan-nodes') {
    return { type: 'plan-nodes', lessonKey: task.lessonKey }
  }
  if (task.type === 'assemble') {
    return { type: 'assemble', lessonKey: task.lessonKey }
  }
  if (options.deterministic) {
    if (task.type === 'generate-outline') return deterministicOutline(task)
    if (task.type === 'write-node' || task.type === 'revise-node') return deterministicNode(task)
    if (task.type === 'final-review') return deterministicFinalReview(task)
  }

  if (task.type === 'generate-outline') {
    const prompt = buildPrompt({
      role: 'outline',
      promptVersion: task.courseSpec?.promptVersion,
      courseSpec: task.courseSpec,
      lessonBlueprint: { title: task.lesson.title },
      sourceText: task.lesson.transcript,
      pptText: JSON.stringify(task.lesson.pptText || []),
      schema: {
        mainLine: 'string',
        outline: [
          {
            title: 'string',
            lineRange: [1, 10],
            slideRange: [1, 1],
            rationale: 'string',
            importance: 'high|normal|low',
            concepts: [],
            statutes: [],
            cases: []
          }
        ]
      }
    })
    const result = await callCourseModel({ role: 'outline', prompt })
    return {
      type: 'save-outline',
      lessonKey: task.lessonKey,
      mainLine: result.parsed.mainLine,
      outline: result.parsed.outline
    }
  }

  if (task.type === 'write-node' || task.type === 'revise-node') {
    const writerRole = task.type === 'revise-node' ? 'revision' : 'writer'
    const writerPrompt = buildPrompt({
      role: writerRole,
      promptVersion: task.courseSpec?.promptVersion,
      courseSpec: task.courseSpec,
      lessonBlueprint: task.lessonBlueprint,
      writerBrief: {
        ...(task.node.writerBrief || {}),
        revisionRequests: task.node.revisionRequests || [],
        reviewerIssues: task.node.reviewerReports?.at?.(-1)?.value?.issues || []
      },
      sourceText: task.node.sourceText,
      pptText: task.type === 'revise-node'
        ? [`## CurrentDraft`, task.node.draft || '', `## PptSource`, task.node.pptText || ''].join('\n\n')
        : task.node.pptText,
      schema: {
        markdown: 'string'
      }
    })
    const writerResult = await callCourseModel({ role: writerRole, prompt: writerPrompt })
    const markdown = writerResult.parsed.markdown
    if (!String(markdown || '').trim()) throw new Error('Writer returned empty markdown')
    const reviewerPrompt = buildPrompt({
      role: 'reviewer',
      promptVersion: task.courseSpec?.promptVersion,
      courseSpec: task.courseSpec,
      lessonBlueprint: task.lessonBlueprint,
      writerBrief: task.node.writerBrief,
      sourceText: task.node.sourceText,
      pptText: [`## Draft`, markdown].join('\n\n'),
      schema: {
        coverage: 0,
        grounding: 0,
        logic: 0,
        detail: 0,
        sourceCoverage: 0,
        issues: [],
        decision: 'approve|revise|human_review'
      }
    })
    const reviewerResult = await callCourseModel({ role: 'reviewer', prompt: reviewerPrompt })
    return {
      type: 'update-node-draft',
      lessonKey: task.lessonKey,
      nodeId: task.node.id,
      markdown,
      reviewerReport: reviewerResult.parsed
    }
  }

  if (task.type === 'final-review') {
    const prompt = buildPrompt({
      role: 'finalReview',
      promptVersion: task.courseSpec?.promptVersion,
      courseSpec: task.courseSpec,
      lessonBlueprint: task.lesson?.blueprint,
      writerBrief: {
        lessonTitle: task.lesson?.title,
        nodeCount: task.lesson?.nodes?.length || 0
      },
      sourceText: (task.lesson?.nodes || []).map(node => node.sourceText || '').join('\n\n'),
      pptText: task.lesson?.finalNote?.markdown || '',
      schema: {
        coverage: 0,
        grounding: 0,
        logic: 0,
        detail: 0,
        sourceCoverage: 0,
        issues: [],
        decision: 'approve|revise|human_review'
      }
    })
    const result = await callCourseModel({ role: 'finalReview', prompt })
    return {
      type: 'complete-final-review',
      lessonKey: task.lessonKey,
      qualityReport: result.parsed
    }
  }

  throw new Error(`Unsupported worker task: ${task.type}`)
}

function printHelp() {
  console.log([
    'Usage:',
    '  npm run course:worker:run-job -- --job-id <id> --base-url http://127.0.0.1:3000 --token <token>',
    '',
    'Options:',
    '  --once              run one task only',
    '  --deterministic     generate local deterministic outputs for testing',
    '',
    'The worker talks to the app API and never uploads raw course files.'
  ].join('\n'))
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args['job-id'] || !args['base-url'] || !args.token) {
    printHelp()
    return
  }

  let completed = 0
  while (completed < 50) {
    const state = await request(args['base-url'], args['job-id'], args.token)
    const task = state.task
    if (!task || task.type === 'idle') {
      console.log(JSON.stringify({ ok: true, idle: true, reason: task?.reason || 'none', completed }, null, 2))
      return
    }

    try {
      const action = await executeTask(task, { deterministic: Boolean(args.deterministic) })
      if (!action) return
      await request(args['base-url'], args['job-id'], args.token, 'POST', action)
      completed += 1
      if (args.once) break
    } catch (error) {
      await request(args['base-url'], args['job-id'], args.token, 'POST', {
        type: 'fail-step',
        step: task.type,
        error: error instanceof Error ? error.message : String(error),
        retryable: true
      })
      throw error
    }
  }
  console.log(JSON.stringify({ ok: true, completed }, null, 2))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
