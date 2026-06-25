#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const DEFAULT_SKILL_DIR = '/Users/curacao/.agents/skills/haoke-notes'

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
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function appendChangelog(courseDir, step, status, note) {
  const filePath = path.join(courseDir, '.haoke_changelog.md')
  const exists = fs.existsSync(filePath)
  const header =
    '# 好课工作流 — 网页端预处理追踪\n\n| 步骤 | 时间 | 状态 | 说明 |\n|------|------|------|------|\n'
  const icon =
    {
      done: '✅',
      running: '🔄',
      failed: '❌',
      pending: '⏳',
      skipped: '⏭️'
    }[status] || status

  const row = `| ${step} | ${new Date().toISOString()} | ${icon} | ${note} |\n`
  fs.appendFileSync(filePath, `${exists ? '' : header}${row}`)
}

function runPython(scriptPath, args, options = {}) {
  const python = options.python || process.env.PYTHON || 'python3'
  const result = spawnSync(python, [scriptPath, ...args], {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8'
  })

  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    command: `${python} ${scriptPath} ${args.join(' ')}`
  }
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`)
  }
}

function lessonTranscriptName(lesson) {
  return `第${lesson.lesson_order}课.txt`
}

function pptPoolName(index, item) {
  const baseName = path
    .basename(item.raw_file || item.name || `ppt-${index + 1}.pptx`)
    .replace(/\.[^.]+$/, '')
  return `课件池-${String(index + 1).padStart(2, '0')}-${baseName}.md`
}

function summarizeResult(results) {
  return {
    ok: results.failures.length === 0,
    transcripts: results.transcripts,
    segments: results.segments,
    pptText: results.pptText,
    pptNeedsOcr: results.pptNeedsOcr,
    failures: results.failures,
    next: results.pptNeedsOcr.length
      ? '有纯图 PPT 需要单独确认 OCR，再进入大纲生成。'
      : '预处理完成，可以进入逐课大纲生成准备。'
  }
}

function preprocessLocalCourse(options) {
  const courseDir = path.resolve(options.dir)
  const skillDir = path.resolve(options.skillDir || DEFAULT_SKILL_DIR)
  const scriptsDir = path.join(skillDir, 'scripts')
  const lessonMapPath = path.join(courseDir, 'working', 'lesson_map.json')

  requireFile(lessonMapPath, 'lesson_map.json')
  requireFile(path.join(scriptsDir, 'parse_srt.py'), 'parse_srt.py')
  requireFile(path.join(scriptsDir, 'extract_ppt.py'), 'extract_ppt.py')
  requireFile(path.join(scriptsDir, 'split_transcript.py'), 'split_transcript.py')

  const lessonMap = readJson(lessonMapPath)
  const rawDir = path.join(courseDir, 'raw')
  const transcriptDir = path.join(courseDir, 'data', 'transcripts')
  const pptMdDir = path.join(courseDir, 'data', 'ppt_md')
  const segmentsDir = path.join(courseDir, 'data', 'segments')
  const workingDir = path.join(courseDir, 'working')

  ;[transcriptDir, pptMdDir, segmentsDir, workingDir].forEach(ensureDir)

  const results = {
    transcripts: [],
    segments: [],
    pptText: [],
    pptNeedsOcr: [],
    failures: []
  }

  appendChangelog(courseDir, 'web-preprocess', 'running', '开始网页端本地预处理')

  for (const lesson of lessonMap.lessons || []) {
    if (!lesson.transcript?.raw_file) {
      results.failures.push({
        step: 'srt',
        lesson: lesson.lesson_order,
        error: '缺少 SRT raw_file'
      })
      continue
    }

    const inputPath = path.join(courseDir, lesson.transcript.raw_file)
    const outputPath = path.join(transcriptDir, lessonTranscriptName(lesson))
    const shouldSkip = options.resume && fs.existsSync(outputPath)

    if (!shouldSkip) {
      const parsed = runPython(
        path.join(scriptsDir, 'parse_srt.py'),
        ['--input', inputPath, '--output', outputPath],
        options
      )

      if (parsed.code !== 0) {
        results.failures.push({
          step: 'srt',
          lesson: lesson.lesson_order,
          error: parsed.stderr || parsed.stdout || 'SRT parse failed'
        })
        continue
      }
    }

    results.transcripts.push({
      lesson: lesson.lesson_order,
      file: path.relative(courseDir, outputPath),
      skipped: shouldSkip
    })

    const split = runPython(
      path.join(scriptsDir, 'split_transcript.py'),
      [
        '--input',
        outputPath,
        '--output',
        segmentsDir,
        '--lines',
        String(options.lines || 500),
        '--tolerance',
        String(options.tolerance || 50),
        '--min-segment',
        String(options.minSegment || 200)
      ],
      options
    )

    if (split.code !== 0) {
      results.failures.push({
        step: 'split',
        lesson: lesson.lesson_order,
        error: split.stderr || split.stdout || 'Transcript split failed'
      })
      continue
    }

    results.segments.push({
      lesson: lesson.lesson_order,
      source: path.relative(courseDir, outputPath)
    })
  }

  for (const [index, deck] of (lessonMap.slide_pool || []).entries()) {
    const inputPath = path.join(courseDir, deck.raw_file)
    const outputPath = path.join(pptMdDir, pptPoolName(index, deck))
    const shouldSkip = options.resume && fs.existsSync(outputPath)

    if (shouldSkip) {
      results.pptText.push({
        deck: deck.name || deck.raw_file,
        file: path.relative(courseDir, outputPath),
        skipped: true
      })
      continue
    }

    const extracted = runPython(
      path.join(scriptsDir, 'extract_ppt.py'),
      ['--input', inputPath, '--output', outputPath],
      options
    )

    if (extracted.code === 0) {
      results.pptText.push({
        deck: deck.name || deck.raw_file,
        file: path.relative(courseDir, outputPath)
      })
      continue
    }

    if (extracted.code === 2) {
      results.pptNeedsOcr.push({
        deck: deck.name || deck.raw_file,
        raw_file: deck.raw_file,
        note: '纯图 PPT，默认不在网页端预处理阶段自动 OCR。'
      })
      continue
    }

    results.failures.push({
      step: 'ppt',
      deck: deck.name || deck.raw_file,
      error: extracted.stderr || extracted.stdout || 'PPT extraction failed'
    })
  }

  writeJson(path.join(workingDir, 'preprocess_result.json'), summarizeResult(results))
  appendChangelog(
    courseDir,
    'web-preprocess',
    results.failures.length ? 'failed' : 'done',
    `转录 ${results.transcripts.length}；分段 ${results.segments.length}；文字课件 ${results.pptText.length}；待 OCR ${results.pptNeedsOcr.length}；失败 ${results.failures.length}`
  )

  return summarizeResult(results)
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run course:worker:preprocess-local -- --dir /tmp/course-workdir',
      '',
      'Options:',
      '  --resume                 跳过已存在的 transcript / ppt_md',
      '  --lines 500              转录分段目标行数',
      '  --tolerance 50           分段容差',
      '  --min-segment 200        最小分段行数',
      '  --skill-dir <path>       haoke-notes skill 路径',
      '',
      'This reuses haoke-notes preprocessing scripts but does not call models.',
      'Pure-image PPTX files are marked as needs-OCR; OCR is intentionally not automatic here.'
    ].join('\n')
  )
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.dir) {
    printHelp()
    return
  }

  const result = preprocessLocalCourse({
    dir: args.dir,
    skillDir: args['skill-dir'],
    resume: Boolean(args.resume),
    lines: args.lines ? Number(args.lines) : 500,
    tolerance: args.tolerance ? Number(args.tolerance) : 50,
    minSegment: args['min-segment'] ? Number(args['min-segment']) : 200
  })

  console.log(JSON.stringify(result, null, 2))
}

main()
