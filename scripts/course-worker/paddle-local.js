#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const DEFAULT_HAOKE_SKILL_DIR = '/Users/curacao/.agents/skills/haoke-notes'
const DEFAULT_PADDLE_SKILL_DIR = '/Users/curacao/.claude/skills/paddleocr'

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

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`)
  }
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    stdio: options.stdio || 'pipe'
  })
}

function safeStem(value, fallback = 'deck') {
  return String(value || fallback)
    .normalize('NFKC')
    .replace(/\.[^.]+$/, '')
    .replace(/[/:<>|?*\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
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

function imagesToPdf(imageDir, outputPdf) {
  const code = String.raw`
import sys
from pathlib import Path
from PIL import Image

image_dir = Path(sys.argv[1])
output_pdf = Path(sys.argv[2])
images = sorted(
    [p for p in image_dir.iterdir() if p.suffix.lower() in {'.png', '.jpg', '.jpeg'}],
    key=lambda p: p.name
)
if not images:
    raise SystemExit(f'No slide images found in {image_dir}')

pages = []
for image_path in images:
    with Image.open(image_path) as im:
        page = im.convert('RGB')
        pages.append(page.copy())

output_pdf.parent.mkdir(parents=True, exist_ok=True)
first, rest = pages[0], pages[1:]
first.save(output_pdf, save_all=True, append_images=rest)
print(f'{len(pages)} images -> {output_pdf}')
`

  const result = run('python3', ['-c', code, imageDir, outputPdf])
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Failed to compose PDF')
  }
  return result.stdout.trim()
}

function loadPreprocess(courseDir) {
  const filePath = path.join(courseDir, 'working', 'preprocess_result.json')
  requireFile(filePath, 'preprocess_result.json')
  return readJson(filePath)
}

function savePreprocess(courseDir, result) {
  writeJson(path.join(courseDir, 'working', 'preprocess_result.json'), result)
}

function preparePaddleInput(options) {
  const courseDir = path.resolve(options.dir)
  const haokeSkillDir = path.resolve(options.haokeSkillDir || DEFAULT_HAOKE_SKILL_DIR)
  const extractSlides = path.join(haokeSkillDir, 'scripts', 'extract_slides.py')
  requireFile(extractSlides, 'extract_slides.py')

  const preprocess = loadPreprocess(courseDir)
  const needsOcr = Array.isArray(preprocess.pptNeedsOcr)
    ? preprocess.pptNeedsOcr
    : []
  const inputDir = path.join(courseDir, 'data', 'paddleocr_input')
  const imageRoot = path.join(courseDir, 'data', 'ppt_images')
  fs.mkdirSync(inputDir, { recursive: true })
  fs.mkdirSync(imageRoot, { recursive: true })

  appendChangelog(courseDir, 'paddle-prepare', 'running', `准备 ${needsOcr.length} 份待 OCR 课件`)

  const prepared = []
  const failures = []

  for (const [index, deck] of needsOcr.entries()) {
    const rawFile = deck.raw_file
    if (!rawFile) {
      failures.push({ deck: deck.deck || `deck-${index + 1}`, error: '缺少 raw_file' })
      continue
    }

    const rawPath = path.join(courseDir, rawFile)
    const stem = safeStem(deck.deck || rawFile, `deck-${index + 1}`)
    const imageDir = path.join(
      imageRoot,
      `paddle-${String(index + 1).padStart(2, '0')}-${stem}`
    )
    const pdfPath = path.join(inputDir, `${stem}.pdf`)

    try {
      if (!fs.existsSync(pdfPath) || options.force) {
        const extracted = run('python3', [
          extractSlides,
          '--input',
          rawPath,
          '--output',
          imageDir
        ])
        if (extracted.status !== 0) {
          throw new Error(extracted.stderr || extracted.stdout || 'extract_slides failed')
        }
        imagesToPdf(imageDir, pdfPath)
      }

      prepared.push({
        deck: deck.deck || rawFile,
        raw_file: rawFile,
        image_dir: path.relative(courseDir, imageDir),
        pdf: path.relative(courseDir, pdfPath)
      })
    } catch (error) {
      failures.push({
        deck: deck.deck || rawFile,
        raw_file: rawFile,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const state = {
    preparedAt: new Date().toISOString(),
    inputDir: path.relative(courseDir, inputDir),
    prepared,
    failures
  }
  writeJson(path.join(courseDir, 'working', 'paddleocr_prepare.json'), state)
  appendChangelog(
    courseDir,
    'paddle-prepare',
    failures.length ? 'failed' : 'done',
    `已准备 ${prepared.length} 份 PDF；失败 ${failures.length}`
  )
  return state
}

function runPaddle(options) {
  const courseDir = path.resolve(options.dir)
  const paddleSkillDir = path.resolve(options.paddleSkillDir || DEFAULT_PADDLE_SKILL_DIR)
  const pipeline = path.join(paddleSkillDir, 'scripts', 'paddleocr_pipeline.py')
  requireFile(pipeline, 'paddleocr_pipeline.py')

  const prepareStatePath = path.join(courseDir, 'working', 'paddleocr_prepare.json')
  requireFile(prepareStatePath, 'paddleocr_prepare.json')
  const prepareState = readJson(prepareStatePath)
  const inputDir = path.join(courseDir, prepareState.inputDir)
  const outputDir = path.join(courseDir, 'data', 'paddleocr_output')

  appendChangelog(courseDir, 'paddle-run', 'running', '开始 PaddleOCR 识别')
  const result = run(
    'uv',
    [
      'run',
      pipeline,
      inputDir,
      '--output-dir',
      outputDir,
      '--concurrency',
      String(options.concurrency || 5),
      ...(options.force ? ['--force'] : [])
    ],
    { stdio: 'inherit' }
  )

  if (result.status !== 0) {
    appendChangelog(courseDir, 'paddle-run', 'failed', 'PaddleOCR 识别失败')
    throw new Error('PaddleOCR run failed')
  }

  appendChangelog(courseDir, 'paddle-run', 'done', 'PaddleOCR 识别完成')
  return {
    outputDir: path.relative(courseDir, outputDir),
    manifest: path.relative(courseDir, path.join(outputDir, 'manifest.json'))
  }
}

function importPaddleResult(options) {
  const courseDir = path.resolve(options.dir)
  const outputDir = path.join(courseDir, 'data', 'paddleocr_output')
  const manifestPath = path.join(outputDir, 'manifest.json')
  requireFile(manifestPath, 'PaddleOCR manifest.json')

  const manifest = readJson(manifestPath)
  const pptMdDir = path.join(courseDir, 'data', 'ppt_md')
  fs.mkdirSync(pptMdDir, { recursive: true })

  const imported = []
  for (const file of manifest.files || []) {
    const sourceMd = path.join(outputDir, file.markdown)
    if (!fs.existsSync(sourceMd)) continue

    const targetName = `PaddleOCR-${safeStem(file.id, 'deck')}.md`
    const targetPath = path.join(pptMdDir, targetName)
    const content = fs.readFileSync(sourceMd, 'utf8')
    fs.writeFileSync(
      targetPath,
      [`# ${file.id}`, '', '<!-- source: PaddleOCR-VL-1.5 -->', '', content].join('\n')
    )
    imported.push({
      deck: file.id,
      file: path.relative(courseDir, targetPath),
      pages: file.pages,
      charCount: file.char_count
    })
  }

  const preprocess = loadPreprocess(courseDir)
  preprocess.pptText = [...(preprocess.pptText || []), ...imported]
  preprocess.pptNeedsOcr = []
  preprocess.ok = (preprocess.failures || []).length === 0
  preprocess.next = 'PaddleOCR 结果已导入，可以进入逐课大纲生成准备。'
  preprocess.ocr = {
    engine: 'PaddleOCR-VL-1.5',
    importedAt: new Date().toISOString(),
    manifest: path.relative(courseDir, manifestPath),
    files: imported
  }
  savePreprocess(courseDir, preprocess)

  appendChangelog(courseDir, 'paddle-import', 'done', `导入 ${imported.length} 份 OCR Markdown`)
  return {
    imported,
    preprocessResult: path.relative(
      courseDir,
      path.join(courseDir, 'working', 'preprocess_result.json')
    )
  }
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run course:worker:paddle-local -- --dir /tmp/course --prepare',
      '  npm run course:worker:paddle-local -- --dir /tmp/course --run',
      '  npm run course:worker:paddle-local -- --dir /tmp/course --import',
      '',
      'Notes:',
      '  --prepare extracts pure-image PPTX slides and composes PDF files for PaddleOCR.',
      '  --run calls the PaddleOCR API and requires PADDLEOCR_ACCESS_TOKEN.',
      '  --import copies PaddleOCR Markdown into data/ppt_md and updates preprocess_result.json.'
    ].join('\n')
  )
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.dir || (!args.prepare && !args.run && !args.import)) {
    printHelp()
    return
  }

  const options = {
    dir: args.dir,
    haokeSkillDir: args['haoke-skill-dir'],
    paddleSkillDir: args['paddle-skill-dir'],
    force: Boolean(args.force),
    concurrency: args.concurrency ? Number(args.concurrency) : 5
  }

  const result = {}
  if (args.prepare) result.prepare = preparePaddleInput(options)
  if (args.run) result.run = runPaddle(options)
  if (args.import) result.import = importPaddleResult(options)
  console.log(JSON.stringify(result, null, 2))
}

main()
