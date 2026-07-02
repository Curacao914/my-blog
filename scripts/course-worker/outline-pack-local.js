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

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, value)
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`)
  }
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

function listFiles(dirPath, predicate = () => true) {
  if (!fs.existsSync(dirPath)) return []
  return fs
    .readdirSync(dirPath)
    .filter(name => predicate(name))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function fileStats(filePath) {
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
  return {
    lines: text ? text.split(/\r?\n/).length : 0,
    chars: text.length
  }
}

function inferPptPages(filePath) {
  if (!fs.existsSync(filePath)) return null
  const text = fs.readFileSync(filePath, 'utf8')
  const matches = text.match(/^##\s+幻灯片\s+\d+/gm)
  return matches ? matches.length : null
}

function buildPromptText({ courseDir, lesson, preferences, transcriptMeta, segments, pptFiles, previousLesson }) {
  const course = preferences.course_name || preferences.courseName || ''
  const learningGoal = preferences.learning_goal || preferences.learningGoal || '自学 / 入门'

  return [
    `# 第 ${lesson.lesson_order} 课大纲生成输入包`,
    '',
    '你要完成的是 haoke-notes 阶段 A：通读转录稿与课件池，生成带行号映射的 outline JSON。',
    '',
    '## 课程信息',
    '',
    `- 课程：${course || '见 preferences.json'}`,
    `- 教师：${preferences.teacher || lesson.teacher || '未填写'}`,
    `- 学习目标：${learningGoal}`,
    `- 本课：${lesson.title || lesson.lesson_key}`,
    '',
    '## 输入文件',
    '',
    `- 偏好：working/preferences.json`,
    `- 课次映射：working/lesson_map.json`,
    `- 转录元数据：${path.relative(courseDir, transcriptMeta.file)}`,
    ...segments.map(segment => `- 转录分段：${path.relative(courseDir, segment.file)}（${segment.startLine}-${segment.endLine} 行）`),
    ...pptFiles.map(file => `- 课件池：${path.relative(courseDir, file.path)}${file.pages ? `（约 ${file.pages} 页）` : ''}`),
    previousLesson
      ? `- 上一课滚动上下文：${path.relative(courseDir, previousLesson)}`
      : '- 上一课滚动上下文：无，首课',
    '',
    '## 输出要求',
    '',
    `- 输出 JSON 到：working/第${lesson.lesson_order}课_outline.json`,
    '- 必须包含 main_thread、outline、appendix_topics。',
    '- outline 节点必须含 transcript_lines；level 2 节点尽量含 stars、concepts、provisions、cases、key_signals、writer_brief。',
    '- 大纲骨架以 PPT 主题和逻辑顺序为锚，内容填充以老师实际讲授为准。',
    '- PPT 中有但转录未展开的内容标注“PPT 提及但未展开”。',
    '- 转录中讲了但 PPT 未显示的内容归入语义最近的 PPT 节点。',
    '- 发散内容、课堂管理、闲聊等放入 appendix_topics。',
    '- 不要开始写正式笔记；只生成大纲 JSON。',
    '',
    '## 用户确认点',
    '',
    '- 生成 outline JSON 后，先在网页端/工作台等待用户确认。',
    '- 用户确认后才进入节点级笔记生成。'
  ].join('\n')
}

function makeOutlinePack(options) {
  const courseDir = path.resolve(options.dir)
  const lessonMapPath = path.join(courseDir, 'working', 'lesson_map.json')
  const preferencesPath = path.join(courseDir, 'working', 'preferences.json')
  const preprocessPath = path.join(courseDir, 'working', 'preprocess_result.json')

  requireFile(lessonMapPath, 'lesson_map.json')
  requireFile(preferencesPath, 'preferences.json')
  requireFile(preprocessPath, 'preprocess_result.json')

  const lessonMap = readJson(lessonMapPath, {})
  const preferences = readJson(preferencesPath, {})
  const preprocess = readJson(preprocessPath, {})
  if (Array.isArray(preprocess.pptNeedsOcr) && preprocess.pptNeedsOcr.length) {
    throw new Error('There are PPT files still waiting for OCR. Run paddle-local first or explicitly resolve them before outline packing.')
  }

  const outputDir = path.join(courseDir, 'working', 'outline_inputs')
  const transcriptDir = path.join(courseDir, 'data', 'transcripts')
  const segmentsDir = path.join(courseDir, 'data', 'segments')
  const pptMdDir = path.join(courseDir, 'data', 'ppt_md')
  const pptFiles = listFiles(pptMdDir, name => name.endsWith('.md')).map(name => ({
    name,
    path: path.join(pptMdDir, name),
    pages: inferPptPages(path.join(pptMdDir, name)),
    ...fileStats(path.join(pptMdDir, name))
  }))

  appendChangelog(courseDir, 'outline-pack', 'running', '生成逐课大纲输入包')

  const packs = []
  for (const lesson of lessonMap.lessons || []) {
    const transcriptFile = path.join(transcriptDir, `第${lesson.lesson_order}课.txt`)
    const transcriptMetaFile = path.join(segmentsDir, `第${lesson.lesson_order}课_segments.json`)
    requireFile(transcriptFile, `第${lesson.lesson_order}课 transcript`)
    requireFile(transcriptMetaFile, `第${lesson.lesson_order}课 segments metadata`)

    const transcriptMeta = readJson(transcriptMetaFile, {})
    const segments = (transcriptMeta.segments || []).map(segment => ({
      index: segment.index,
      startLine: segment.start_line,
      endLine: segment.end_line,
      lineCount: segment.line_count,
      file: path.join(segmentsDir, segment.file)
    }))

    const previousContext = lesson.lesson_order > 1
      ? path.join(courseDir, 'working', `第${lesson.lesson_order - 1}课_rolling_context.json`)
      : null
    const previousLesson = previousContext && fs.existsSync(previousContext)
      ? previousContext
      : null

    const pack = {
      version: 1,
      generatedAt: new Date().toISOString(),
      course: {
        id: lessonMap.course?.id || null,
        name: lessonMap.course?.name || preferences.course_name || null,
        teacher: lessonMap.course?.teacher || preferences.teacher || null
      },
      lesson: {
        order: lesson.lesson_order,
        key: lesson.lesson_key,
        title: lesson.title
      },
      preferencesFile: 'working/preferences.json',
      transcript: {
        file: path.relative(courseDir, transcriptFile),
        metadata: path.relative(courseDir, transcriptMetaFile),
        totalLines: transcriptMeta.total_lines || fileStats(transcriptFile).lines,
        segments: segments.map(segment => ({
          index: segment.index,
          file: path.relative(courseDir, segment.file),
          startLine: segment.startLine,
          endLine: segment.endLine,
          lineCount: segment.lineCount
        }))
      },
      pptPool: pptFiles.map(file => ({
        file: path.relative(courseDir, file.path),
        pages: file.pages,
        lines: file.lines,
        chars: file.chars
      })),
      context: {
        policy: lesson.context_policy || lesson.contextPolicy || 'rolling-summary-concepts-provisions-cases-terms',
        previousLesson: previousLesson
          ? path.relative(courseDir, previousLesson)
          : null
      },
      output: {
        outlineJson: `working/第${lesson.lesson_order}课_outline.json`,
        humanReviewRequired: true
      }
    }

    const base = `第${lesson.lesson_order}课_outline_input`
    const jsonPath = path.join(outputDir, `${base}.json`)
    const mdPath = path.join(outputDir, `${base}.md`)
    writeJson(jsonPath, pack)
    writeText(
      mdPath,
      buildPromptText({
        courseDir,
        lesson,
        preferences,
        transcriptMeta: { file: transcriptMetaFile },
        segments,
        pptFiles,
        previousLesson
      })
    )

    packs.push({
      lesson: lesson.lesson_order,
      json: path.relative(courseDir, jsonPath),
      markdown: path.relative(courseDir, mdPath)
    })
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: packs.length,
    packs,
    next: '把每课 outline_input.md 交给模型生成 outline JSON；写回 working/第N课_outline.json 后进入网页端确认。'
  }
  writeJson(path.join(outputDir, 'index.json'), index)
  appendChangelog(courseDir, 'outline-pack', 'done', `生成 ${packs.length} 个大纲输入包`)
  return index
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run course:worker:outline-pack -- --dir /tmp/course-workdir',
      '',
      'This prepares per-lesson outline input packages only.',
      'It does not call models and does not generate the final outline JSON.'
    ].join('\n')
  )
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.dir) {
    printHelp()
    return
  }

  console.log(JSON.stringify(makeOutlinePack({ dir: args.dir }), null, 2))
}

main()
