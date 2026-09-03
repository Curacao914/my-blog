#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const {
  normalizeSnapshot,
  toPublicMetadata,
  validateContentSnapshot
} = require('./schema')

const ROOT = process.cwd()
const DEFAULT_STAGING = 'data/content-snapshots/staging'
const DEFAULT_LIVE = 'data/content-snapshots/live'
const DEFAULT_ERRORS = 'data/content-snapshots/errors'

function readArgs(argv) {
  const args = {
    staging: DEFAULT_STAGING,
    live: DEFAULT_LIVE,
    errors: DEFAULT_ERRORS,
    dryRun: false
  }

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--dry-run') {
      args.dryRun = true
    } else if (current === '--staging' && next) {
      args.staging = next
      index += 1
    } else if (current === '--live' && next) {
      args.live = next
      index += 1
    } else if (current === '--errors' && next) {
      args.errors = next
      index += 1
    } else {
      throw new Error(`Unknown argument: ${current}`)
    }
  }

  return args
}

function resolveFromRoot(target) {
  return path.isAbsolute(target) ? target : path.join(ROOT, target)
}

function listSnapshotFiles(stagingDir) {
  if (!fs.existsSync(stagingDir)) {
    throw new Error(`Staging directory does not exist: ${stagingDir}`)
  }

  return fs
    .readdirSync(stagingDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => path.join(stagingDir, file))
}

function readSnapshot(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    return {
      __readError: `Cannot read JSON: ${error.message}`
    }
  }
}

async function validateMarkdownRender(snapshot) {
  try {
    const React = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const ReactMarkdown = await import('react-markdown')

    renderToStaticMarkup(
      React.createElement(ReactMarkdown.default, null, snapshot.bodyMarkdown)
    )

    return []
  } catch (error) {
    return [`bodyMarkdown cannot be rendered: ${error.message}`]
  }
}

async function collectSnapshots(files) {
  const snapshots = []
  const errors = []
  const ids = new Set()
  const slugs = new Set()

  for (const filePath of files) {
    const raw = readSnapshot(filePath)
    const relativePath = path.relative(ROOT, filePath)

    if (raw.__readError) {
      errors.push({ file: relativePath, errors: [raw.__readError] })
      continue
    }

    const validation = validateContentSnapshot(raw)

    if (validation.valid) {
      if (ids.has(raw.id)) {
        validation.errors.push(`duplicate id: ${raw.id}`)
      }
      if (slugs.has(raw.slug)) {
        validation.errors.push(`duplicate slug: ${raw.slug}`)
      }
    }

    if (validation.errors.length > 0) {
      errors.push({ file: relativePath, errors: validation.errors })
      continue
    }

    const markdownErrors = await validateMarkdownRender(raw)
    if (markdownErrors.length > 0) {
      errors.push({ file: relativePath, errors: markdownErrors })
      continue
    }

    ids.add(raw.id)
    slugs.add(raw.slug)
    snapshots.push(normalizeSnapshot(raw))
  }

  return { snapshots, errors }
}

function safeFileName(slug) {
  return `${slug.replace(/[/_]/g, '--')}.json`
}

function emptyDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true })

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    fs.rmSync(fullPath, { recursive: true, force: true })
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`)
  fs.renameSync(`${filePath}.tmp`, filePath)
}

function writeLiveSnapshots(liveDir, snapshots) {
  const publicSnapshots = snapshots.filter(
    snapshot =>
      snapshot.access.mode !== 'private' && snapshot.status === 'published'
  )

  emptyDirectory(liveDir)

  publicSnapshots.forEach(snapshot => {
    writeJson(path.join(liveDir, safeFileName(snapshot.slug)), snapshot)
  })

  writeJson(
    path.join(liveDir, 'index.json'),
    publicSnapshots.map(toPublicMetadata)
  )
}

function writeErrorReport(errorsDir, result) {
  fs.mkdirSync(errorsDir, { recursive: true })
  writeJson(path.join(errorsDir, 'last-error.json'), {
    at: new Date().toISOString(),
    ...result
  })
}

function clearErrorReport(errorsDir) {
  const filePath = path.join(errorsDir, 'last-error.json')
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath)
  }
}

async function main() {
  const args = readArgs(process.argv)
  const stagingDir = resolveFromRoot(args.staging)
  const liveDir = resolveFromRoot(args.live)
  const errorsDir = resolveFromRoot(args.errors)
  const files = listSnapshotFiles(stagingDir)

  if (files.length === 0) {
    throw new Error(`No JSON snapshots found in ${stagingDir}`)
  }

  const { snapshots, errors } = await collectSnapshots(files)

  if (errors.length > 0) {
    writeErrorReport(errorsDir, {
      status: 'failed',
      files: files.length,
      errors
    })
    console.error(
      `Content snapshot validation failed. Live snapshots were not changed.`
    )
    console.error(JSON.stringify(errors, null, 2))
    process.exit(1)
  }

  if (!args.dryRun) {
    writeLiveSnapshots(liveDir, snapshots)
    clearErrorReport(errorsDir)
  }

  console.log(
    JSON.stringify(
      {
        status: args.dryRun ? 'validated' : 'promoted',
        stagingFiles: files.length,
        liveFiles: snapshots.filter(
          snapshot =>
            snapshot.access.mode !== 'private' &&
            snapshot.status === 'published'
        ).length
      },
      null,
      2
    )
  )
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}
