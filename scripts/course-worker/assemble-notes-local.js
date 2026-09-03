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

function readText(filePath) {
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

function parseLessonFilter(value) {
  if (!value) return null
  return String(value)
    .split(',')
    .map(item => Number(item.trim()))
    .filter(Boolean)
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

function sanitizeNodeId(id) {
  return String(id || 'node')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
}

function lessonNumberFromOutline(outline, outlineFile) {
  return (
    Number(outline.lesson_num || outline.lessonNum || outline.lesson_order) ||
    Number(path.basename(outlineFile).match(/^第(\d+)课_outline\.json$/)?.[1])
  )
}

function groupOutline(outline = []) {
  const groups = []
  let current = null

  for (const node of outline) {
    if (Number(node.level) === 1) {
      current = { node, children: [] }
      groups.push(current)
    } else if (Number(node.level) === 2) {
      if (!current) {
        current = {
          node: {
            id: 'uncategorized',
            title: '未归类内容',
            section_summary: ''
          },
          children: []
        }
        groups.push(current)
      }
      current.children.push(node)
    }
  }

  return groups
}

function stripNodeMeta(markdown) {
  const metaStart = markdown.indexOf('META_FOR_NODE:')
  if (metaStart < 0) return { body: markdown.trim(), meta: [] }

  const body = markdown.slice(0, metaStart).trim()
  const metaText = markdown.slice(metaStart)
  const meta = metaText
    .split(/\r?\n/)
    .map(line => line.trim())
    .map(line => line.match(/^-\s*(CONCEPT|PROVISION|CASE|PITFALL):\s*(.+)$/))
    .filter(Boolean)
    .map(match => `${match[1]}: ${match[2].trim()}`)
  return { body, meta }
}

function nodeMarkdownPath(courseDir, lessonNum, nodeId) {
  return path.join(
    courseDir,
    'working',
    `notes_第${lessonNum}课_node_${sanitizeNodeId(nodeId)}.md`
  )
}

function buildOverview(outline, lessonNum, courseName) {
  const mainThread = outline.main_thread || outline.mainThread || '待补充'
  const questions = (outline.outline || [])
    .filter(node => Number(node.level) === 1)
    .slice(0, 5)
    .map(node => `1. ${node.title || '本节主题'}解决了什么问题？`)
    .join('\n')

  return [
    `# ${courseName || outline.course_name || '课程'} — 第${lessonNum}课`,
    '',
    '## 课程概览',
    '',
    '### 本课要回答的核心问题',
    questions || '1. 本课的核心问题是什么？',
    '',
    '### 本课你应当能够',
    '- [ ] 复述本课的主要结构。',
    '- [ ] 解释本课核心概念及其相互关系。',
    '- [ ] 将本课规则或观点应用到基本案例中。',
    '',
    '### 课程脉络',
    `> ${mainThread}`,
    '',
    '***'
  ].join('\n')
}

function buildAppendix(outline) {
  const appendix = outline.appendix_topics || outline.appendixTopics || []
  if (!appendix.length) return ''

  return [
    '***',
    '',
    '## 附录：补充与发散',
    '',
    '> 以下内容为课堂补充材料和发散性讨论，不影响课程主线',
    '',
    ...appendix.map(item => {
      if (typeof item === 'string') return `### ${item}\n\n待补充。`
      const lines = Array.isArray(item.transcript_lines)
        ? `（转录行：${item.transcript_lines.join('-')}）`
        : ''
      return `### ${item.topic || '补充内容'}\n\n${lines || '待补充。'}`
    })
  ].join('\n')
}

function buildKnowledgeLinks(lessonNum) {
  return [
    '***',
    '',
    '## 知识连接',
    '',
    `**承接什么**：第${lessonNum}课以前的课程内容或默认学科背景。`,
    '',
    '**为后续铺垫什么**：',
    '- 本课核心概念 → 后续规则适用与案例分析',
    '- 本课争议结构 → 后续学说辨析与综合复习',
    '',
    '**下节预告**：待根据后续课程补充。'
  ].join('\n')
}

function buildMetaBlock(metaItems) {
  const unique = Array.from(new Set(metaItems)).sort((a, b) =>
    a.localeCompare(b, 'zh-CN')
  )
  if (!unique.length) return ''

  return [
    '***',
    '',
    '<details><summary>📑 笔记元数据（用于跨课整合）</summary>',
    '<pre><code>',
    ...unique.map(item => `META: ${item}`),
    '</code></pre>',
    '</details>'
  ].join('\n')
}

function assembleOne(courseDir, outlineFile) {
  const outline = readJson(outlineFile)
  const lessonNum = lessonNumberFromOutline(outline, outlineFile)
  if (!lessonNum) throw new Error(`Cannot infer lesson number: ${outlineFile}`)

  const courseName = outline.course_name || outline.courseName || ''
  const groups = groupOutline(outline.outline || [])
  const parts = [buildOverview(outline, lessonNum, courseName)]
  const metaItems = []
  const missing = []

  for (const group of groups) {
    parts.push('')
    parts.push(`### ${group.node.title || '未命名章节'}`)
    if (group.node.section_summary) {
      parts.push('')
      parts.push(group.node.section_summary)
    }

    for (const child of group.children) {
      const mdPath = nodeMarkdownPath(courseDir, lessonNum, child.id)
      if (!fs.existsSync(mdPath)) {
        missing.push(path.relative(courseDir, mdPath))
        continue
      }
      const { body, meta } = stripNodeMeta(readText(mdPath))
      parts.push('')
      parts.push(body)
      metaItems.push(...meta)
    }

    parts.push('')
    parts.push('> **自测**（合上笔记，能回答吗？）')
    parts.push('> 1. 本节的核心概念之间是什么关系？')
    parts.push('> 2. 本节最容易混淆的规则或观点是什么？')
  }

  const appendix = buildAppendix(outline)
  if (appendix) parts.push('', appendix)
  parts.push('', buildKnowledgeLinks(lessonNum))

  const metaBlock = buildMetaBlock(metaItems)
  if (metaBlock) parts.push('', metaBlock)

  const outputPath = path.join(courseDir, 'output', 'notes', `第${lessonNum}课.md`)
  writeText(outputPath, `${parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`)

  return {
    lesson: lessonNum,
    output: path.relative(courseDir, outputPath),
    missingNodes: missing
  }
}

function assembleNotes(options) {
  const courseDir = path.resolve(options.dir)
  const lessonFilter = parseLessonFilter(options.lessons)
  const outlineFiles = listOutlineFiles(courseDir, lessonFilter)
  if (!outlineFiles.length) throw new Error('No outline JSON files found.')

  appendChangelog(courseDir, 'assemble-notes', 'running', `拼装 ${outlineFiles.length} 课笔记`)
  const results = outlineFiles.map(outlineFile => assembleOne(courseDir, outlineFile))
  const failures = results.filter(result => result.missingNodes.length)

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    results,
    failures,
    next: failures.length
      ? '存在缺失节点 Markdown，补齐后重新拼装。'
      : '笔记已拼装，可进入校验和内容快照写回。'
  }
  writeJson(path.join(courseDir, 'output', 'notes', 'index.json'), index)
  appendChangelog(
    courseDir,
    'assemble-notes',
    failures.length ? 'failed' : 'done',
    `输出 ${results.length} 课；缺失节点 ${failures.reduce((sum, item) => sum + item.missingNodes.length, 0)} 个`
  )
  return index
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run course:worker:assemble-notes -- --dir /tmp/course-workdir',
      '  npm run course:worker:assemble-notes -- --dir /tmp/course-workdir --lessons 1,2',
      '',
      'This assembles existing node markdown files into output/notes/第N课.md.',
      'It does not call models.'
    ].join('\n')
  )
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.dir) {
    printHelp()
    return
  }

  console.log(JSON.stringify(assembleNotes({ dir: args.dir, lessons: args.lessons }), null, 2))
}

main()
