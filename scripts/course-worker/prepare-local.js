#!/usr/bin/env node

const crypto = require('crypto')
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

function getConfig() {
  const localEnv = parseEnvFile(path.join(process.cwd(), '.env.local'))
  const supabaseUrl = process.env.SUPABASE_URL || localEnv.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    localEnv.SUPABASE_SECRET_KEY
  const storageBucket =
    process.env.SUPABASE_STORAGE_BUCKET ||
    localEnv.SUPABASE_STORAGE_BUCKET ||
    'course-assets'

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL and service-role/secret key.')
  }

  return {
    restBaseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    storageBaseUrl: `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object`,
    storageBucket,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    }
  }
}

async function request(pathname) {
  const config = getConfig()
  const response = await fetch(`${config.restBaseUrl}${pathname}`, {
    headers: config.headers
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed ${response.status}: ${text}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function fetchCourseBundle(jobId) {
  const encodedJobId = encodeURIComponent(jobId)
  const [jobs, assets, lessons] = await Promise.all([
    request(
      `/course_jobs?select=id,course_name,lesson,teacher,status,preferences,material_bundle_confirmed_at,preflight_confirmed_at&id=eq.${encodedJobId}&limit=1`
    ),
    request(
      `/course_assets?select=id,kind,role,original_name,mime_type,size_bytes,storage_path,checksum,lesson_order,lesson_key,metadata&job_id=eq.${encodedJobId}&order=role.asc&order=sort_order.asc&order=created_at.asc`
    ),
    request(
      `/course_lessons?select=id,lesson_order,lesson_key,title,status,transcript_asset_id,outline_json,outline_confirmed_at,previous_context&job_id=eq.${encodedJobId}&order=lesson_order.asc`
    )
  ])

  const job = jobs?.[0]
  if (!job) throw new Error('Course job not found.')

  return {
    job,
    assets: assets || [],
    lessons: lessons || []
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function safeName(value, fallback) {
  return String(value || fallback || 'asset')
    .normalize('NFKC')
    .replace(/[/:<>|?*\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

function assetFileName(asset, index) {
  const order = asset.lesson_order
    ? `L${String(asset.lesson_order).padStart(2, '0')}-`
    : ''
  const role = asset.role || 'supplement'
  return safeName(
    `${order}${role}-${asset.original_name || path.basename(asset.storage_path)}`,
    `${role}-${index + 1}`
  )
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function downloadAsset(asset, targetPath) {
  if (fs.existsSync(targetPath)) {
    return { skipped: true, path: targetPath }
  }

  const config = getConfig()
  const response = await fetch(
    `${config.storageBaseUrl}/${config.storageBucket}/${encodeURI(asset.storage_path)}`,
    {
      headers: {
        apikey: config.headers.apikey,
        Authorization: config.headers.Authorization
      }
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Storage download failed ${response.status} for ${asset.original_name || asset.storage_path}: ${text}`
    )
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (asset.checksum && hashBuffer(buffer) !== asset.checksum) {
    throw new Error(`Checksum mismatch for ${asset.original_name || asset.storage_path}`)
  }

  fs.writeFileSync(targetPath, buffer)
  return { downloaded: true, path: targetPath }
}

function makeLocalLayout(outDir) {
  const root = path.resolve(outDir)
  const layout = {
    root,
    raw: path.join(root, 'raw'),
    data: path.join(root, 'data'),
    working: path.join(root, 'working'),
    output: path.join(root, 'output')
  }

  Object.values(layout).forEach(ensureDir)
  ensureDir(path.join(layout.data, 'transcripts'))
  ensureDir(path.join(layout.data, 'ppt_md'))
  ensureDir(path.join(layout.data, 'segments'))
  return layout
}

function buildLessonMap(bundle, localAssets) {
  const transcriptById = new Map(
    localAssets
      .filter(item => item.asset.role === 'transcript')
      .map(item => [item.asset.id, item])
  )
  const slidePool = localAssets
    .filter(item => item.asset.role === 'slides')
    .map(item => ({
      asset_id: item.asset.id,
      name: item.asset.original_name,
      raw_file: item.relativePath,
      storage_path: item.asset.storage_path,
      checksum: item.asset.checksum
    }))

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    course: {
      id: bundle.job.id,
      name: bundle.job.course_name,
      lesson_range: bundle.job.lesson,
      teacher: bundle.job.teacher
    },
    strategy: {
      multiple_srt: true,
      multiple_pptx: true,
      slide_alignment: 'model-aligns-global-slide-pool-to-each-lesson',
      context_continuity: 'rolling-summary-concepts-provisions-cases-terms'
    },
    lessons: bundle.lessons.map((lesson, index) => {
      const transcript = transcriptById.get(lesson.transcript_asset_id)
      return {
        lesson_order: lesson.lesson_order,
        lesson_key: lesson.lesson_key,
        title: lesson.title || `第 ${lesson.lesson_order || index + 1} 课`,
        transcript: transcript
          ? {
              asset_id: transcript.asset.id,
              raw_file: transcript.relativePath,
              storage_path: transcript.asset.storage_path,
              checksum: transcript.asset.checksum
            }
          : null,
        slide_pool_mode: 'use-global-slide-pool',
        candidate_slide_decks: slidePool.map(item => item.asset_id),
        context_policy:
          index === 0
            ? 'first-lesson'
            : 'read-previous-lesson-rolling-context-before-writing',
        outline_confirmed: Boolean(lesson.outline_confirmed_at)
      }
    }),
    slide_pool: slidePool
  }
}

function buildPreferences(bundle) {
  return {
    ...(bundle.job.preferences || {}),
    web_adapter: {
      ...(bundle.job.preferences?.web_adapter || {}),
      prepared_by: 'scripts/course-worker/prepare-local.js',
      prepared_at: new Date().toISOString(),
      source_job_id: bundle.job.id
    }
  }
}

function assertReady(bundle) {
  const blockers = []
  if (!bundle.job.material_bundle_confirmed_at) blockers.push('材料包尚未确认')
  if (!bundle.job.preflight_confirmed_at) blockers.push('preflight 偏好尚未确认')
  if (!bundle.lessons.length) blockers.push('尚未准备课次映射')
  if (!bundle.assets.some(asset => asset.role === 'transcript')) {
    blockers.push('缺少 SRT 转录稿')
  }

  if (blockers.length) {
    throw new Error(`Course bundle is not ready: ${blockers.join('；')}`)
  }
}

async function prepareLocalCourse(bundle, options) {
  assertReady(bundle)

  const layout = makeLocalLayout(options.outDir)
  const localAssets = []

  for (const [index, asset] of bundle.assets.entries()) {
    const fileName = assetFileName(asset, index)
    const targetPath = path.join(layout.raw, fileName)
    const relativePath = path.relative(layout.root, targetPath)

    if (options.download) {
      await downloadAsset(asset, targetPath)
    }

    localAssets.push({
      asset,
      fileName,
      relativePath,
      downloaded: Boolean(options.download)
    })
  }

  writeJson(path.join(layout.working, 'preferences.json'), buildPreferences(bundle))
  writeJson(path.join(layout.working, 'lesson_map.json'), buildLessonMap(bundle, localAssets))
  writeJson(path.join(layout.working, 'asset_manifest.json'), {
    version: 1,
    generated_at: new Date().toISOString(),
    downloaded: Boolean(options.download),
    assets: localAssets.map(item => ({
      id: item.asset.id,
      role: item.asset.role,
      kind: item.asset.kind,
      name: item.asset.original_name,
      raw_file: item.relativePath,
      storage_path: item.asset.storage_path,
      checksum: item.asset.checksum
    }))
  })

  return {
    root: layout.root,
    downloaded: Boolean(options.download),
    assetCount: localAssets.length,
    lessonCount: bundle.lessons.length,
    files: [
      path.relative(layout.root, path.join(layout.working, 'preferences.json')),
      path.relative(layout.root, path.join(layout.working, 'lesson_map.json')),
      path.relative(layout.root, path.join(layout.working, 'asset_manifest.json'))
    ]
  }
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args['job-id'] || !args['out-dir']) {
    console.log(
      [
        'Usage:',
        '  npm run course:worker:prepare-local -- --job-id <course_job_id> --out-dir /tmp/course-workdir',
        '  npm run course:worker:prepare-local -- --job-id <course_job_id> --out-dir /tmp/course-workdir --download',
        '',
        'Without --download, this only creates the haoke-style directory structure and mapping files.',
        'With --download, it also downloads Supabase Storage assets into raw/.',
        'It does not call models, run OCR, or write back to the database.'
      ].join('\n')
    )
    return
  }

  const bundle = await fetchCourseBundle(args['job-id'])
  const result = await prepareLocalCourse(bundle, {
    outDir: args['out-dir'],
    download: Boolean(args.download)
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
