#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue

    const key = arg.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      index += 1
    }
  }
  return args
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\n/)
      .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map(line => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

function getModelConfig() {
  const localEnv = parseEnvFile(path.join(process.cwd(), '.env.local'))
  const apiUrl = process.env.COURSE_MODEL_API_URL || localEnv.COURSE_MODEL_API_URL
  const apiKey = process.env.COURSE_MODEL_API_KEY || localEnv.COURSE_MODEL_API_KEY
  const model = process.env.COURSE_MODEL_NAME || localEnv.COURSE_MODEL_NAME

  if (!apiUrl || !apiKey || !model) {
    throw new Error(
      'Missing COURSE_MODEL_API_URL, COURSE_MODEL_API_KEY, or COURSE_MODEL_NAME.'
    )
  }

  return { apiUrl, apiKey, model }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'))
}

function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8')
}

function readTextIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return ''
  return fs.readFileSync(path.resolve(filePath), 'utf8')
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, value)
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function appendChangelog(courseDir, step, status, note) {
  const filePath = path.join(courseDir, '.haoke_changelog.md')
  const exists = fs.existsSync(filePath)
  const header =
    '# 好课工作流 — 网页端预处理追踪\n\n| 步骤 | 时间 | 状态 | 说明 |\n|------|------|------|------|\n'
  const icon =
    { done: '✅', running: '🔄', failed: '❌', skipped: '⏭️' }[status] || status
  fs.appendFileSync(
    filePath,
    `${exists ? '' : header}| ${step} | ${new Date().toISOString()} | ${icon} | ${note} |\n`
  )
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`)
  }
}

function listPackFiles(courseDir, mode, lessonFilter) {
  const dir = path.join(
    courseDir,
    'working',
    mode === 'outline' ? 'outline_inputs' : 'node_inputs'
  )
  requireFile(path.join(dir, 'index.json'), `${mode} input index`)
  const index = readJson(path.join(dir, 'index.json'))

  return (index.packs || [])
    .filter(pack => {
      if (!lessonFilter) return true
      return lessonFilter.includes(Number(pack.lesson))
    })
    .map(pack => ({
      pack,
      markdownPath: path.join(courseDir, pack.markdown),
      jsonPath: path.join(courseDir, pack.json)
    }))
}

function parseLessonFilter(value) {
  if (!value) return null
  return String(value)
    .split(',')
    .map(item => Number(item.trim()))
    .filter(Boolean)
}

function getMaxInputChars(options) {
  if (options.maxInputChars) return Number(options.maxInputChars)
  if (process.env.COURSE_MODEL_MAX_INPUT_CHARS) {
    return Number(process.env.COURSE_MODEL_MAX_INPUT_CHARS)
  }
  return 800000
}

function relativeToCourse(courseDir, filePath) {
  return path.relative(courseDir, filePath)
}

function resolveCoursePath(courseDir, filePath) {
  return path.join(courseDir, filePath)
}

function fenceText(label, text) {
  return [
    `\n\n---\n\n## ${label}`,
    '',
    '```text',
    text.trim(),
    '```'
  ].join('\n')
}

function fenceJson(label, value) {
  return [
    `\n\n---\n\n## ${label}`,
    '',
    '```json',
    JSON.stringify(value, null, 2),
    '```'
  ].join('\n')
}

function sliceLines(text, sourceRange, overlap) {
  const lines = text.split(/\r?\n/)
  if (!Array.isArray(sourceRange) || !Array.isArray(overlap)) return text

  const sourceStart = Number(sourceRange[0])
  const overlapStart = Number(overlap[0])
  const overlapEnd = Number(overlap[1])
  if (!sourceStart || !overlapStart || !overlapEnd || overlapEnd < overlapStart) {
    return text
  }

  const startIndex = Math.max(0, overlapStart - sourceStart)
  const endIndex = Math.min(lines.length, overlapEnd - sourceStart + 1)
  return lines.slice(startIndex, endIndex).join('\n')
}

function assertInputSize(input, options) {
  const maxChars = getMaxInputChars(options)
  if (!options.allowLarge && input.length > maxChars) {
    throw new Error(
      `Hydrated model input is ${input.length} chars, above limit ${maxChars}. ` +
        'Use --max-input-chars to raise the limit, or --allow-large to bypass.'
    )
  }
}

function hydrateOutlineInput(courseDir, item, options) {
  const pack = readJson(item.jsonPath)
  const base = readText(item.markdownPath)
  const blocks = [base]

  blocks.push(fenceJson('preferences.json', readJson(resolveCoursePath(courseDir, pack.preferencesFile))))

  if (pack.context?.previousLesson) {
    const previous = readTextIfExists(resolveCoursePath(courseDir, pack.context.previousLesson))
    if (previous) blocks.push(fenceText(`上一课滚动上下文：${pack.context.previousLesson}`, previous))
  }

  for (const segment of pack.transcript?.segments || []) {
    const filePath = resolveCoursePath(courseDir, segment.file)
    blocks.push(
      fenceText(
        `转录分段：${segment.file}（${segment.startLine}-${segment.endLine} 行）`,
        readText(filePath)
      )
    )
  }

  for (const ppt of pack.pptPool || []) {
    blocks.push(fenceText(`课件文本：${ppt.file}`, readText(resolveCoursePath(courseDir, ppt.file))))
  }

  const input = blocks.join('\n')
  assertInputSize(input, options)
  return input
}

function hydrateNodeInput(courseDir, item, options) {
  const pack = readJson(item.jsonPath)
  const base = readText(item.markdownPath)
  const blocks = [base]

  blocks.push(fenceText('preferences.json', readText(resolveCoursePath(courseDir, pack.input.preferences))))
  blocks.push(fenceJson(`全课大纲：${pack.input.outline}`, readJson(resolveCoursePath(courseDir, pack.input.outline))))

  for (const segment of pack.input.segments || []) {
    const filePath = resolveCoursePath(courseDir, segment.file)
    const sliced = sliceLines(readText(filePath), segment.sourceRange, segment.overlap)
    blocks.push(
      fenceText(
        `转录片段：${segment.file}（取 ${segment.overlap?.[0] || '?'}-${segment.overlap?.[1] || '?'} 行）`,
        sliced
      )
    )
  }

  for (const pptFile of pack.input.pptPool || []) {
    blocks.push(fenceText(`课件文本：${pptFile}`, readText(resolveCoursePath(courseDir, pptFile))))
  }

  const input = blocks.join('\n')
  assertInputSize(input, options)
  return input
}

function describeHydratedInput(courseDir, mode, item, options) {
  const input =
    mode === 'outline'
      ? hydrateOutlineInput(courseDir, item, options)
      : hydrateNodeInput(courseDir, item, options)
  return {
    lesson: item.pack.lesson,
    node: item.pack.node || null,
    input: relativeToCourse(courseDir, item.markdownPath),
    chars: input.length,
    approxTokens: Math.ceil(input.length / 2)
  }
}

function extractTextFromResponse(data) {
  const message = data?.choices?.[0]?.message
  if (typeof message?.content === 'string') return message.content
  if (Array.isArray(message?.content)) {
    return message.content
      .map(part => (typeof part === 'string' ? part : part.text || ''))
      .join('')
  }
  if (typeof data?.output_text === 'string') return data.output_text
  throw new Error('Model response did not contain text content.')
}

function extractJson(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < start) {
    throw new Error('Model output does not contain a JSON object.')
  }
  return JSON.parse(candidate.slice(start, end + 1))
}

async function callModel({ system, user, temperature = 0.2 }) {
  const config = getModelConfig()
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Model request failed ${response.status}: ${text.slice(0, 500)}`)
  }

  return extractTextFromResponse(await response.json())
}

function buildSystemPrompt(mode) {
  if (mode === 'outline') {
    return [
      '你是法学课程笔记工作流中的大纲生成器。',
      '严格根据用户提供的文件索引与任务说明工作。',
      '只输出合法 JSON，不输出解释、寒暄或 Markdown 代码块。',
      '不要编造未在材料中出现的事实；不确定时写“待确认”。'
    ].join('\n')
  }

  return [
    '你是法学课程笔记工作流中的节点级笔记撰写器。',
    '严格根据用户提供的文件索引与任务说明工作。',
    '输出完整 Markdown 节点笔记，并在末尾保留 META_FOR_NODE 块。',
    '不要写课程概览、全课总结或附录；不要编造未在材料中出现的事实。'
  ].join('\n')
}

async function runOutline(courseDir, item, options) {
  const input = hydrateOutlineInput(courseDir, item, options)
  const output = await callModel({
    system: buildSystemPrompt('outline'),
    user: input,
    temperature: 0.1
  })
  const outlineJson = extractJson(output)
  const lesson = item.pack.lesson
  const target = path.join(courseDir, 'working', `第${lesson}课_outline.json`)
  writeJson(target, outlineJson)
  return { lesson, output: path.relative(courseDir, target) }
}

async function runNode(courseDir, item, options) {
  const input = hydrateNodeInput(courseDir, item, options)
  const pack = readJson(item.jsonPath)
  const output = await callModel({
    system: buildSystemPrompt('node'),
    user: input,
    temperature: 0.2
  })
  const target = path.join(courseDir, pack.output.nodeMarkdown)
  writeText(target, `${output.trim()}\n`)
  return {
    lesson: item.pack.lesson,
    node: item.pack.node,
    output: path.relative(courseDir, target)
  }
}

async function runModelExec(options) {
  const courseDir = path.resolve(options.dir)
  const mode = options.mode
  if (!['outline', 'node'].includes(mode)) {
    throw new Error('--mode must be outline or node')
  }

  const lessonFilter = parseLessonFilter(options.lessons)
  let items = listPackFiles(courseDir, mode, lessonFilter)
  if (options.limit) items = items.slice(0, Number(options.limit))
  if (!items.length) throw new Error(`No ${mode} input packs found.`)

  if (options.dryRun) {
    const dryRun = {
      mode,
      generatedAt: new Date().toISOString(),
      count: items.length,
      maxInputChars: getMaxInputChars(options),
      inputs: items.map(item => describeHydratedInput(courseDir, mode, item, options))
    }
    writeJson(path.join(courseDir, 'working', `model_${mode}_dry_run.json`), dryRun)
    return dryRun
  }

  appendChangelog(courseDir, `model-${mode}`, 'running', `开始执行 ${items.length} 个 ${mode} 任务`)

  const results = []
  const failures = []
  for (const item of items) {
    try {
      results.push(
        mode === 'outline'
          ? await runOutline(courseDir, item, options)
          : await runNode(courseDir, item, options)
      )
    } catch (error) {
      failures.push({
        input: path.relative(courseDir, item.markdownPath),
        error: error instanceof Error ? error.message : String(error)
      })
      if (!options.continueOnError) break
    }
  }

  const summary = {
    mode,
    generatedAt: new Date().toISOString(),
    count: results.length,
    failures,
    results
  }
  writeJson(path.join(courseDir, 'working', `model_${mode}_result.json`), summary)
  appendChangelog(
    courseDir,
    `model-${mode}`,
    failures.length ? 'failed' : 'done',
    `完成 ${results.length} 个；失败 ${failures.length} 个`
  )
  return summary
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run course:worker:model-exec -- --dir /tmp/course --mode outline',
      '  npm run course:worker:model-exec -- --dir /tmp/course --mode node --lessons 1 --limit 3',
      '  npm run course:worker:model-exec -- --dir /tmp/course --mode outline --dry-run',
      '',
      'Environment:',
      '  COURSE_MODEL_API_URL   OpenAI-compatible chat completions endpoint',
      '  COURSE_MODEL_API_KEY   API key',
      '  COURSE_MODEL_NAME      model name',
      '  COURSE_MODEL_MAX_INPUT_CHARS Optional safety limit, default 800000',
      '',
      'This hydrates local transcript/PPT text into the prompt, then calls the configured model API.',
      'It does not use Claude Code.'
    ].join('\n')
  )
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.dir || !args.mode) {
    printHelp()
    return
  }

  const result = await runModelExec({
    dir: args.dir,
    mode: args.mode,
    lessons: args.lessons,
    limit: args.limit,
    dryRun: Boolean(args['dry-run']),
    allowLarge: Boolean(args['allow-large']),
    maxInputChars: args['max-input-chars'],
    continueOnError: Boolean(args['continue-on-error'])
  })
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
