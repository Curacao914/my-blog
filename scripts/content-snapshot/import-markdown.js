#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const {
  normalizeSnapshot,
  validateContentSnapshot
} = require('./schema')

const ROOT = process.cwd()

function parseArgs(argv) {
  const args = {
    input: 'content/markdown',
    out: 'data/content-snapshots/staging',
    dryRun: false
  }

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--dry-run') {
      args.dryRun = true
    } else if (current === '--input' && next) {
      args.input = next
      index += 1
    } else if (current === '--out' && next) {
      args.out = next
      index += 1
    } else if (current === '--help') {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${current}`)
    }
  }

  return args
}

function resolveFromRoot(target) {
  return path.isAbsolute(target) ? target : path.join(ROOT, target)
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return []

  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listMarkdownFiles(fullPath))
    } else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
      results.push(fullPath)
    }
  }
  return results.sort((a, b) => a.localeCompare(b))
}

function splitFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: text }
  return {
    meta: parseFrontmatter(match[1]),
    body: match[2]
  }
}

function parseScalar(value) {
  const trimmed = String(value || '').trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null

  const quoted = trimmed.match(/^['"]([\s\S]*)['"]$/)
  if (quoted) return quoted[1]

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }

  return trimmed
}

function parseFrontmatter(source) {
  const meta = {}
  const lines = source.split(/\r?\n/)
  let currentKey = null

  for (const line of lines) {
    if (!line.trim()) continue

    const listMatch = line.match(/^\s*-\s+(.+)$/)
    if (listMatch && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = []
      meta[currentKey].push(parseScalar(listMatch[1]))
      continue
    }

    const pair = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/)
    if (!pair) continue

    currentKey = pair[1]
    meta[currentKey] = pair[2] ? parseScalar(pair[2]) : []
  }

  return meta
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '')
}

function titleFromMarkdown(body, fallback) {
  const heading = body.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : fallback
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

function objectFromPrefixed(meta, prefix) {
  const result = {}
  Object.entries(meta).forEach(([key, value]) => {
    if (key.startsWith(`${prefix}.`)) {
      result[key.slice(prefix.length + 1)] = value
    }
  })
  return result
}

function relativeSlug(inputDir, filePath) {
  return slugify(
    path
      .relative(inputDir, filePath)
      .replace(/\.[^.]+$/, '')
      .split(path.sep)
      .join('/')
  )
}

function buildSnapshot(inputDir, filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const { meta, body } = splitFrontmatter(raw)
  const slug = slugify(meta.slug || relativeSlug(inputDir, filePath))
  const now = new Date().toISOString()
  const accessMode = meta.access || meta.accessMode || meta.visibility || 'private'
  const displayTags = arrayFrom(meta.tags)
  const course = objectFromPrefixed(meta, 'course')
  const folderPath = arrayFrom(meta.folder || meta.folderPath)

  const snapshot = {
    id: String(meta.id || `markdown-${slug.replace(/[/_]/g, '-')}`),
    slug,
    title: String(meta.title || titleFromMarkdown(body, slug)),
    type: meta.type || 'article',
    visibility: meta.visibility === 'public' ? 'public' : meta.visibility === 'shared' ? 'shared' : 'private',
    status: meta.status || 'draft',
    summary: meta.summary || undefined,
    tags: displayTags,
    category: meta.category || undefined,
    date: meta.date || undefined,
    updatedAt: meta.updatedAt || now,
    source: 'markdown',
    sourceId: path.relative(ROOT, filePath),
    bodyMarkdown: body.trim(),
    assets: [],
    access: {
      mode: accessMode === 'public' ? 'public' : accessMode === 'password' ? 'password' : 'private',
      password: meta.password || undefined,
      expiresAt: meta.expiresAt || undefined,
      allowIndexing: Boolean(meta.allowIndexing),
      allowRss: Boolean(meta.allowRss),
      allowSitemap: Boolean(meta.allowSitemap)
    },
    display: {
      category: meta.category || '法律之上',
      tags: displayTags,
      pinned: Boolean(meta.pinned),
      showInRecent: meta.showInRecent !== false
    },
    folder: {
      path: folderPath.length ? folderPath : ['未归档']
    },
    checksum: ''
  }

  if (Object.keys(course).length) {
    snapshot.course = {
      name: course.name || '',
      lesson: course.lesson || '',
      teacher: course.teacher || '',
      date: course.date || undefined
    }
  }

  if (snapshot.access.mode !== 'public') {
    snapshot.access.allowIndexing = false
    snapshot.access.allowRss = false
    snapshot.access.allowSitemap = false
  }

  return normalizeSnapshot(snapshot)
}

function safeFileName(slug) {
  return `${slug.replace(/[/_]/g, '--')}.json`
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`)
  fs.renameSync(`${filePath}.tmp`, filePath)
}

function importMarkdown(args) {
  const inputDir = resolveFromRoot(args.input)
  const outDir = resolveFromRoot(args.out)
  const files = listMarkdownFiles(inputDir)
  if (!files.length) {
    throw new Error(`No Markdown files found in ${inputDir}`)
  }

  const imported = []
  const errors = []

  for (const filePath of files) {
    const snapshot = buildSnapshot(inputDir, filePath)
    const validation = validateContentSnapshot(snapshot)
    const relativePath = path.relative(ROOT, filePath)

    if (!validation.valid) {
      errors.push({ file: relativePath, errors: validation.errors })
      continue
    }

    imported.push({
      file: relativePath,
      slug: snapshot.slug,
      out: path.join(args.out, safeFileName(snapshot.slug)),
      snapshot
    })
  }

  if (errors.length) {
    return { status: 'failed', imported: [], errors }
  }

  if (!args.dryRun) {
    imported.forEach(item => {
      writeJson(resolveFromRoot(item.out), item.snapshot)
    })
  }

  return {
    status: args.dryRun ? 'validated' : 'imported',
    count: imported.length,
    imported: imported.map(({ file, slug, out }) => ({ file, slug, out })),
    errors: []
  }
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run content:markdown:import -- --input content/markdown',
      '  npm run content:markdown:import -- --input content/markdown --dry-run',
      '',
      'Markdown frontmatter supports:',
      '  title, slug, type, status, visibility, access, category, tags, summary, date',
      '  folder: 学习/课程/刑诉',
      '  course.name, course.lesson, course.teacher, course.date',
      '',
      'Default output is data/content-snapshots/staging.',
      'Run content:snapshot:promote afterwards to validate and promote live snapshots.'
    ].join('\n')
  )
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    printHelp()
    return
  }

  const result = importMarkdown(args)
  console.log(JSON.stringify(result, null, 2))
  if (result.errors?.length) process.exit(1)
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
