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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'))
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, value)
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

function listOutlineFiles(courseDir, lessonFilter) {
  const workingDir = path.join(courseDir, 'working')
  return fs
    .readdirSync(workingDir)
    .filter(name => /^第\d+课_outline\.json$/.test(name))
    .filter(name => {
      if (!lessonFilter) return true
      const match = name.match(/^第(\d+)课_outline\.json$/)
      return match && lessonFilter.includes(Number(match[1]))
    })
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map(name => path.join(workingDir, name))
}

function parseLessonFilter(value) {
  if (!value) return null
  return String(value)
    .split(',')
    .map(item => Number(item.trim()))
    .filter(Boolean)
}

function sanitizeNodeId(id) {
  return String(id || 'node')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
}

function findSegmentsForLines(courseDir, lessonNum, lines) {
  const metaPath = path.join(courseDir, 'data', 'segments', `第${lessonNum}课_segments.json`)
  requireFile(metaPath, `第${lessonNum}课 segments metadata`)
  const meta = readJson(metaPath)
  const [start, end] = Array.isArray(lines) ? lines : [null, null]
  if (!start || !end) return []

  return (meta.segments || [])
    .filter(segment => segment.end_line >= start && segment.start_line <= end)
    .map(segment => ({
      file: path.join(courseDir, 'data', 'segments', segment.file),
      startLine: segment.start_line,
      endLine: segment.end_line,
      overlap: [Math.max(segment.start_line, start), Math.min(segment.end_line, end)]
    }))
}

function listPptFiles(courseDir) {
  const dir = path.join(courseDir, 'data', 'ppt_md')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map(name => path.join(dir, name))
}

function buildNodePrompt({ courseDir, lessonNum, outline, node, segments, pptFiles }) {
  const nodeFile = `working/notes_第${lessonNum}课_node_${sanitizeNodeId(node.id)}.md`
  return [
    `# 第 ${lessonNum} 课节点写作输入：${node.title}`,
    '',
    '你要完成的是 haoke-notes 阶段 B：只写这个节点的完整笔记，不写全课总结。',
    '',
    '## 写作对象',
    '',
    `- 节点 ID：${node.id}`,
    `- 标题：${node.title}`,
    `- 重要度：${node.stars ? '★'.repeat(Number(node.stars)) : '未标注'}`,
    `- writer_brief：${node.writer_brief || '无'}`,
    '',
    '## 必读文件',
    '',
    `- 全课大纲：working/第${lessonNum}课_outline.json`,
    `- 偏好：working/preferences.json`,
    ...segments.map(segment => `- 转录片段：${path.relative(courseDir, segment.file)}（取 ${segment.overlap[0]}-${segment.overlap[1]} 行）`),
    ...pptFiles.map(file => `- 课件池：${path.relative(courseDir, file)}`),
    '',
    '## 输出要求',
    '',
    `- 输出到：${nodeFile}`,
    '- 只写本节点；不要写课程概览、知识连接、附录。',
    '- 正文末尾保留 META_FOR_NODE 块，收纳 CONCEPT / PROVISION / CASE / PITFALL。',
    '- 如节点对应转录 >= 200 行，可先在同一节点内按三级小点分段。',
    '- 遇到 ASR 可疑术语，优先用课件池文字校正。',
    '- 不确定内容标注“（转写不清，待确认）”，不要编造。'
  ].join('\n')
}

function makeNodePack(options) {
  const courseDir = path.resolve(options.dir)
  const preferencesPath = path.join(courseDir, 'working', 'preferences.json')
  requireFile(preferencesPath, 'preferences.json')

  const lessonFilter = parseLessonFilter(options.lessons)
  const outlineFiles = listOutlineFiles(courseDir, lessonFilter)
  if (!outlineFiles.length) {
    throw new Error('No outline JSON files found.')
  }

  const outputDir = path.join(courseDir, 'working', 'node_inputs')
  const pptFiles = listPptFiles(courseDir)
  appendChangelog(courseDir, 'node-pack', 'running', `准备 ${outlineFiles.length} 课节点输入包`)

  const packs = []
  for (const outlineFile of outlineFiles) {
    const outline = readJson(outlineFile)
    const lessonNum =
      Number(outline.lesson_num || outline.lessonNum || outline.lesson_order) ||
      Number(path.basename(outlineFile).match(/^第(\d+)课_outline\.json$/)?.[1])
    const nodes = (outline.outline || []).filter(node => Number(node.level) === 2)

    for (const node of nodes) {
      const segments = findSegmentsForLines(courseDir, lessonNum, node.transcript_lines)
      const safeId = sanitizeNodeId(node.id)
      const base = `第${lessonNum}课_node_${safeId}`
      const jsonPath = path.join(outputDir, `${base}.json`)
      const mdPath = path.join(outputDir, `${base}.md`)
      const pack = {
        version: 1,
        generatedAt: new Date().toISOString(),
        lesson: lessonNum,
        node: {
          id: node.id,
          title: node.title,
          stars: node.stars || null,
          transcriptLines: node.transcript_lines || null,
          pptPages: node.ppt_pages || [],
          concepts: node.concepts || [],
          provisions: node.provisions || [],
          cases: node.cases || [],
          keySignals: node.key_signals || [],
          writerBrief: node.writer_brief || ''
        },
        input: {
          outline: path.relative(courseDir, outlineFile),
          preferences: 'working/preferences.json',
          segments: segments.map(segment => ({
            file: path.relative(courseDir, segment.file),
            sourceRange: [segment.startLine, segment.endLine],
            overlap: segment.overlap
          })),
          pptPool: pptFiles.map(file => path.relative(courseDir, file))
        },
        output: {
          nodeMarkdown: `working/notes_第${lessonNum}课_node_${safeId}.md`
        }
      }

      writeJson(jsonPath, pack)
      writeText(
        mdPath,
        buildNodePrompt({ courseDir, lessonNum, outline, node, segments, pptFiles })
      )
      packs.push({
        lesson: lessonNum,
        node: node.id,
        json: path.relative(courseDir, jsonPath),
        markdown: path.relative(courseDir, mdPath),
        output: pack.output.nodeMarkdown
      })
    }
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: packs.length,
    packs,
    next: '把每个 node input 交给模型生成节点 Markdown；全部完成后进入 assemble-notes。'
  }
  writeJson(path.join(outputDir, 'index.json'), index)
  appendChangelog(courseDir, 'node-pack', 'done', `生成 ${packs.length} 个节点输入包`)
  return index
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run course:worker:node-pack -- --dir /tmp/course-workdir',
      '  npm run course:worker:node-pack -- --dir /tmp/course-workdir --lessons 1,2',
      '',
      'This prepares per-outline-node writing packages only.',
      'It does not call models and does not write final notes.'
    ].join('\n')
  )
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.dir) {
    printHelp()
    return
  }

  console.log(JSON.stringify(makeNodePack({ dir: args.dir, lessons: args.lessons }), null, 2))
}

main()
