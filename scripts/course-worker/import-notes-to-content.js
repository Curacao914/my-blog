#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const { computeSnapshotChecksum } = require('../content-snapshot/schema')

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

function getConfig() {
  const localEnv = parseEnvFile(path.join(process.cwd(), '.env.local'))
  const supabaseUrl = process.env.SUPABASE_URL || localEnv.SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    localEnv.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL and service-role/secret key.')
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  }
}

async function request(pathname, options = {}) {
  const config = getConfig()
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...config.headers,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed ${response.status}: ${text}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function hashShort(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 10)
}

function slugify(value, fallback) {
  const slug = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

function getTitle(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : fallback
}

function listNoteFiles(courseDir, lessonFilter) {
  const notesDir = path.join(courseDir, 'output', 'notes')
  if (!fs.existsSync(notesDir)) return []

  return fs
    .readdirSync(notesDir)
    .filter(name => /^第\d+课\.md$/.test(name))
    .filter(name => {
      if (!lessonFilter) return true
      const lesson = Number(name.match(/^第(\d+)课\.md$/)?.[1])
      return lessonFilter.includes(lesson)
    })
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map(name => path.join(notesDir, name))
}

function parseLessonFilter(value) {
  if (!value) return null
  return String(value)
    .split(',')
    .map(item => Number(item.trim()))
    .filter(Boolean)
}

function buildSnapshot(courseDir, noteFile, options) {
  const preferences = readJson(path.join(courseDir, 'working', 'preferences.json'), {})
  const lessonMap = readJson(path.join(courseDir, 'working', 'lesson_map.json'), {})
  const bodyMarkdown = readText(noteFile)
  const lessonOrder = Number(path.basename(noteFile).match(/^第(\d+)课\.md$/)?.[1])
  const lesson =
    (lessonMap.lessons || []).find(item => Number(item.lesson_order) === lessonOrder) || {}
  const courseName =
    options.courseName ||
    lessonMap.course?.name ||
    preferences.course_name ||
    preferences.courseName ||
    '未命名课程'
  const teacher =
    options.teacher ||
    lessonMap.course?.teacher ||
    preferences.teacher ||
    lesson.teacher ||
    ''
  const courseSlug = slugify(courseName, `course-${hashShort(courseName)}`)
  const slug = options.slugPrefix
    ? `${options.slugPrefix.replace(/\/$/, '')}/lesson-${lessonOrder}`
    : `courses/${courseSlug}/lesson-${lessonOrder}`
  const now = new Date().toISOString()

  const snapshot = {
    id: `course-note-${hashShort(`${slug}:${lessonOrder}`)}`,
    slug,
    title: getTitle(bodyMarkdown, `${courseName} 第${lessonOrder}课`),
    type: 'course-note',
    visibility: options.public ? 'public' : 'private',
    status: options.status || 'draft',
    summary: lesson.title || `${courseName} 第${lessonOrder}课课程笔记`,
    tags: ['课程笔记', courseName].filter(Boolean),
    category: options.category || '遇事不决',
    date: lesson.date || undefined,
    updatedAt: now,
    source: 'course-worker',
    sourceId: `${options.jobId || 'local'}:${lessonOrder}`,
    bodyMarkdown,
    assets: [],
    access: {
      mode: options.public ? 'public' : 'private',
      allowIndexing: Boolean(options.public),
      allowRss: Boolean(options.public),
      allowSitemap: Boolean(options.public)
    },
    display: {
      category: options.category || '遇事不决',
      tags: ['课程笔记', courseName].filter(Boolean),
      pinned: false,
      showInRecent: Boolean(options.public)
    },
    course: {
      name: courseName,
      lesson: `第${lessonOrder}课`,
      teacher,
      date: lesson.date || undefined
    },
    folder: {
      path: [options.category || '遇事不决', courseName]
    },
    checksum: ''
  }

  snapshot.checksum = computeSnapshotChecksum(snapshot)
  return snapshot
}

function toContentItem(snapshot) {
  return {
    slug: snapshot.slug,
    title: snapshot.title,
    type: snapshot.type,
    status: snapshot.status,
    source: snapshot.source,
    source_id: snapshot.sourceId,
    summary: snapshot.summary,
    updated_at: snapshot.updatedAt
  }
}

function toContentAccess(snapshot, itemId) {
  return {
    item_id: itemId,
    mode: snapshot.access.mode,
    password_hash: null,
    expires_at: null,
    allow_indexing: snapshot.access.allowIndexing,
    allow_rss: snapshot.access.allowRss,
    allow_sitemap: snapshot.access.allowSitemap
  }
}

function toContentDisplay(snapshot, itemId) {
  return {
    item_id: itemId,
    category: snapshot.display.category,
    tags: snapshot.display.tags,
    folder_path: snapshot.folder.path,
    course_name: snapshot.course.name,
    course_lesson: snapshot.course.lesson,
    course_teacher: snapshot.course.teacher || null,
    course_date: snapshot.course.date || null,
    pinned: snapshot.display.pinned,
    show_in_recent: snapshot.display.showInRecent
  }
}

async function upsertContent(snapshot) {
  const [item] = await request('/content_items?on_conflict=slug', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(toContentItem(snapshot))
  })

  await request('/content_versions?on_conflict=item_id,version', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      item_id: item.id,
      version: 1,
      body_markdown: snapshot.bodyMarkdown,
      checksum: snapshot.checksum,
      is_published: snapshot.status === 'published'
    })
  })

  await request('/content_access?on_conflict=item_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(toContentAccess(snapshot, item.id))
  })

  await request('/content_display?on_conflict=item_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(toContentDisplay(snapshot, item.id))
  })

  return item
}

async function updateLessonContentId(jobId, lessonOrder, contentItemId) {
  if (!jobId) return
  await request(
    `/course_lessons?job_id=eq.${encodeURIComponent(jobId)}&lesson_order=eq.${lessonOrder}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        output_content_item_id: contentItemId,
        status: 'done',
        updated_at: new Date().toISOString()
      })
    }
  )
}

async function importNotes(options) {
  const courseDir = path.resolve(options.dir)
  const lessonFilter = parseLessonFilter(options.lessons)
  const noteFiles = listNoteFiles(courseDir, lessonFilter)
  if (!noteFiles.length) throw new Error('No output/notes/第N课.md files found.')

  const snapshots = noteFiles.map(file => buildSnapshot(courseDir, file, options))
  if (options.dryRun) {
    return {
      dryRun: true,
      count: snapshots.length,
      items: snapshots.map(snapshot => ({
        slug: snapshot.slug,
        title: snapshot.title,
        status: snapshot.status,
        access: snapshot.access.mode,
        folder: snapshot.folder.path
      }))
    }
  }

  const imported = []
  for (const snapshot of snapshots) {
    const item = await upsertContent(snapshot)
    const lessonOrder = Number(snapshot.course.lesson.match(/\d+/)?.[0])
    await updateLessonContentId(options.jobId, lessonOrder, item.id)
    imported.push({ slug: snapshot.slug, id: item.id })
  }

  return {
    dryRun: false,
    imported
  }
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  npm run course:worker:import-notes -- --dir /tmp/course --job-id <uuid>',
      '  npm run course:worker:import-notes -- --dir /tmp/course --dry-run',
      '',
      'Options:',
      '  --lessons 1,2              Import selected lessons',
      '  --status draft|published   Default: draft',
      '  --public                   Mark imported notes public; default is private',
      '  --category <name>          Default: 遇事不决',
      '  --slug-prefix <prefix>     Default: courses/<course-slug>',
      '',
      'This imports output/notes/第N课.md into content_items/content_versions.',
      'Imported notes are private drafts unless --public and/or --status published are provided.'
    ].join('\n')
  )
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.dir) {
    printHelp()
    return
  }

  const result = await importNotes({
    dir: args.dir,
    jobId: args['job-id'],
    lessons: args.lessons,
    status: args.status || 'draft',
    public: Boolean(args.public),
    category: args.category,
    slugPrefix: args['slug-prefix'],
    courseName: args['course-name'],
    teacher: args.teacher,
    dryRun: Boolean(args['dry-run'])
  })
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
