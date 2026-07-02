#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const {
  cleanupExpiredTempDirs,
  createJobTempDir,
  removeJobTempDir
} = require('./temp-safety')

const DEFAULT_SKILL_DIR = '/Users/curacao/.agents/skills/haoke-notes'
const SCHEMA_VERSION = 'course-textpack.v1'

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function safeName(value, fallback = '未命名') {
  return String(value || fallback)
    .normalize('NFKC')
    .replace(/[<>:"|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || fallback
}

function checksum(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function runPython(scriptPath, args, options = {}) {
  const python = options.python || process.env.PYTHON || 'python3'
  const result = spawnSync(python, [scriptPath, ...args], {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    const error = new Error(result.stderr || result.stdout || `${path.basename(scriptPath)} failed`)
    error.code = result.status
    throw error
  }
  return result
}

function copyAllowedFiles(sourceDir, rawDir) {
  fs.mkdirSync(rawDir, { recursive: true })
  const copied = []
  const warnings = []
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const lower = entry.name.toLowerCase()
    if (!lower.endsWith('.srt') && !lower.endsWith('.pptx') && !lower.endsWith('.ppt')) continue
    if (lower.endsWith('.ppt') && !lower.endsWith('.pptx')) {
      warnings.push(`${entry.name} 是 .ppt，请先另存为 .pptx。`)
      continue
    }
    const from = path.join(sourceDir, entry.name)
    const to = path.join(rawDir, entry.name)
    fs.copyFileSync(from, to)
    copied.push(entry.name)
  }
  return { copied, warnings }
}

function segmentText(lines, target = 500) {
  const segments = []
  for (let index = 0; index < lines.length; index += target) {
    const chunk = lines.slice(index, index + target)
    segments.push({
      key: `segment-${String(segments.length + 1).padStart(2, '0')}`,
      startLine: index + 1,
      endLine: index + chunk.length,
      charCount: chunk.join('\n').length,
      text: chunk.join('\n')
    })
  }
  return segments
}

function buildPackFromWorkdir(workdir, warnings = []) {
  const lessonMap = readJson(path.join(workdir, 'working', 'lesson_map.json'))
  const lessons = []
  const decks = []

  for (const lesson of lessonMap.lessons || []) {
    const order = Number(lesson.lesson_num || lessons.length + 1)
    const transcriptPath = path.join(workdir, 'data', 'transcripts', `第${order}课.txt`)
    const transcript = fs.existsSync(transcriptPath)
      ? fs.readFileSync(transcriptPath, 'utf8').trim()
      : ''
    const lines = transcript ? transcript.split(/\n/) : []
    lessons.push({
      order,
      key: `lesson-${String(order).padStart(2, '0')}`,
      title: `第 ${order} 课 ${lesson.date || ''} ${lesson.period ? `第${lesson.period}节` : ''}`.trim(),
      sourceFile: safeName(lesson.srt_file || `第${order}课.srt`),
      transcript,
      transcriptCharCount: transcript.length,
      transcriptLineCount: lines.length,
      segments: segmentText(lines),
      sourceMap: lines.map((_, index) => ({
        line: index + 1,
        sourceLine: index + 1,
        file: safeName(lesson.srt_file || `第${order}课.srt`)
      })),
      warnings: transcript ? [] : ['缺少可用转录文本。']
    })

    if (lesson.pptx_file) {
      const pptPath = path.join(workdir, 'data', 'ppt_md', `第${order}课_PPT.md`)
      const markdown = fs.existsSync(pptPath) ? fs.readFileSync(pptPath, 'utf8').trim() : ''
      const slideMatches = markdown.match(/^##\s*Slide\s+\d+|^##\s*第\s*\d+\s*页/gm) || []
      const slideCount = slideMatches.length
      decks.push({
        key: `deck-${String(order).padStart(2, '0')}`,
        title: safeName(lesson.pptx_file.replace(/\.pptx$/i, ''), `第 ${order} 课课件`),
        sourceFile: safeName(lesson.pptx_file),
        slideCount,
        textDensity: slideCount ? markdown.length / slideCount : 0,
        ocrRequired: !markdown,
        markdown,
        charCount: markdown.length,
        slides: [],
        warnings: markdown ? [] : ['课件未解析到文字，可能需要 OCR。']
      })
    }
  }

  const totalChars =
    lessons.reduce((sum, lesson) => sum + lesson.transcriptCharCount, 0) +
    decks.reduce((sum, deck) => sum + deck.charCount, 0)
  const sourceHash = checksum(JSON.stringify({ course: lessonMap.course_name, lessons, decks }))

  return {
    schemaVersion: SCHEMA_VERSION,
    manifest: {
      createdAt: new Date().toISOString(),
      sourceHash,
      lessonCount: lessons.length,
      deckCount: decks.length,
      transcriptChars: lessons.reduce((sum, lesson) => sum + lesson.transcriptCharCount, 0),
      pptChars: decks.reduce((sum, deck) => sum + deck.charCount, 0),
      totalChars
    },
    course: {
      name: safeName(lessonMap.course_name, '未命名课程'),
      teacher: safeName(lessonMap.teacher || '', ''),
      lessonRange: ''
    },
    preferences: {
      origin: 'local-course-worker',
      deterministicPreprocess: true
    },
    lessons,
    ppt_text: decks,
    source_maps: {
      transcripts: lessons.map(lesson => ({
        lessonKey: lesson.key,
        sourceFile: lesson.sourceFile,
        lines: lesson.sourceMap
      })),
      slides: decks.map(deck => ({
        deckKey: deck.key,
        sourceFile: deck.sourceFile,
        slides: []
      }))
    },
    checksums: {
      sourceHash,
      lessons: Object.fromEntries(lessons.map(lesson => [lesson.key, checksum(lesson.transcript)])),
      decks: Object.fromEntries(decks.map(deck => [deck.key, checksum(deck.markdown)]))
    },
    warnings: [
      ...warnings,
      ...lessons.flatMap(lesson => lesson.warnings),
      ...decks.flatMap(deck => deck.warnings)
    ].filter(Boolean)
  }
}

function preprocessWithSkill(workdir, skillDir, options) {
  const scriptsDir = path.join(skillDir, 'scripts')
  runPython(path.join(scriptsDir, 'scan_files.py'), ['--dir', workdir], options)
  const lessonMap = readJson(path.join(workdir, 'working', 'lesson_map.json'))
  fs.mkdirSync(path.join(workdir, 'data', 'transcripts'), { recursive: true })
  fs.mkdirSync(path.join(workdir, 'data', 'ppt_md'), { recursive: true })
  fs.mkdirSync(path.join(workdir, 'data', 'segments'), { recursive: true })

  for (const lesson of lessonMap.lessons || []) {
    const order = Number(lesson.lesson_num)
    if (lesson.srt_file) {
      const transcriptPath = path.join(workdir, 'data', 'transcripts', `第${order}课.txt`)
      runPython(
        path.join(scriptsDir, 'parse_srt.py'),
        ['--input', path.join(workdir, 'raw', lesson.srt_file), '--output', transcriptPath],
        options
      )
      runPython(
        path.join(scriptsDir, 'split_transcript.py'),
        ['--input', transcriptPath, '--output', path.join(workdir, 'data', 'segments'), '--lines', '500'],
        options
      )
    }
    if (lesson.pptx_file) {
      const output = path.join(workdir, 'data', 'ppt_md', `第${order}课_PPT.md`)
      try {
        runPython(
          path.join(scriptsDir, 'extract_ppt.py'),
          ['--input', path.join(workdir, 'raw', lesson.pptx_file), '--output', output],
          options
        )
      } catch (error) {
        if (error.code !== 2) throw error
      }
    }
  }
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  node scripts/course-worker/build-pack.js --course-dir <dir> --output <file>',
      '',
      'Options:',
      '  --skill-dir <path>  haoke-notes skill path',
      '  --job-id <id>       safe temp job id; auto-generated by default',
      '  --keep-temp         keep temp dir for debugging',
      '',
      'Only pure TextPack JSON is written to --output. Raw SRT/PPTX files stay local.'
    ].join('\n')
  )
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args['course-dir'] || !args.output) {
    printHelp()
    return
  }

  cleanupExpiredTempDirs()
  const jobId = args['job-id'] || `pack-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tempDir = createJobTempDir(jobId)
  const rawDir = path.join(tempDir, 'raw')
  const sourceDir = path.resolve(args['course-dir'])
  const output = path.resolve(args.output)
  const skillDir = path.resolve(args['skill-dir'] || DEFAULT_SKILL_DIR)
  let cleanup = !args['keep-temp']

  try {
    const { copied, warnings } = copyAllowedFiles(sourceDir, rawDir)
    if (!copied.some(name => name.toLowerCase().endsWith('.srt'))) {
      throw new Error('No SRT files found. TextPack requires at least one transcript.')
    }
    preprocessWithSkill(tempDir, skillDir, { python: args.python })
    const textPack = buildPackFromWorkdir(tempDir, warnings)
    writeJson(output, textPack)
    console.log(JSON.stringify({
      ok: true,
      output,
      tempDir: cleanup ? null : tempDir,
      lessonCount: textPack.lessons.length,
      deckCount: textPack.ppt_text.length,
      warnings: textPack.warnings
    }, null, 2))
  } catch (error) {
    cleanup = cleanup && !args['keep-failed']
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  } finally {
    if (cleanup) removeJobTempDir(jobId)
  }
}

if (require.main === module) main()

module.exports = {
  buildPackFromWorkdir,
  copyAllowedFiles
}
