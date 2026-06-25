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

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL and service-role/secret key.')
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'))
}

function collectOutlineFiles(courseDir) {
  const workingDir = path.join(courseDir, 'working')
  if (!fs.existsSync(workingDir)) return []

  return fs
    .readdirSync(workingDir)
    .filter(name => /^第\d+课_outline\.json$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map(name => path.join(workingDir, name))
}

function extractLessonOrder(outline, filePath) {
  const fromJson = Number(outline.lesson_num || outline.lessonNum || outline.lesson_order)
  if (fromJson) return fromJson

  const match = path.basename(filePath).match(/^第(\d+)课_outline\.json$/)
  return match ? Number(match[1]) : null
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

async function reportOutlines(jobId, courseDir) {
  const lessons = await request(
    `/course_lessons?select=id,lesson_order,lesson_key,title,status&job_id=eq.${encodeURIComponent(jobId)}&order=lesson_order.asc`
  )
  const lessonByOrder = new Map((lessons || []).map(lesson => [lesson.lesson_order, lesson]))

  const outlineFiles = collectOutlineFiles(courseDir)
  if (!outlineFiles.length) {
    throw new Error(`No outline files found in ${path.join(courseDir, 'working')}`)
  }

  appendChangelog(courseDir, 'report-outlines', 'running', `准备回传 ${outlineFiles.length} 个大纲`)

  const reported = []
  const failures = []
  for (const filePath of outlineFiles) {
    try {
      const outline = readJson(filePath)
      const lessonOrder = extractLessonOrder(outline, filePath)
      const lesson = lessonByOrder.get(lessonOrder)
      if (!lesson) {
        throw new Error(`No course_lessons row for lesson ${lessonOrder}`)
      }

      const rows = await request(`/course_lessons?id=eq.${encodeURIComponent(lesson.id)}`, {
        method: 'PATCH',
        headers: {
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          outline_json: outline,
          status: 'outline-ready',
          updated_at: new Date().toISOString(),
          changelog: [
            {
              at: new Date().toISOString(),
              event: 'outline-reported',
              note: `本地大纲已回传：${path.basename(filePath)}`
            }
          ]
        })
      })

      reported.push({
        lesson: lessonOrder,
        lessonId: lesson.id,
        file: path.relative(courseDir, filePath),
        status: rows?.[0]?.status || 'outline-ready'
      })
    } catch (error) {
      failures.push({
        file: path.relative(courseDir, filePath),
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  appendChangelog(
    courseDir,
    'report-outlines',
    failures.length ? 'failed' : 'done',
    `回传 ${reported.length} 个；失败 ${failures.length} 个`
  )

  return { reported, failures }
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args['job-id'] || !args.dir) {
    console.log(
      [
        'Usage:',
        '  npm run course:worker:report-outlines -- --job-id <course_job_id> --dir /tmp/course-workdir',
        '',
        'Reads working/第N课_outline.json files and reports them to course_lessons.',
        'It does not confirm outlines; confirmation still happens in the workbench.'
      ].join('\n')
    )
    return
  }

  const result = await reportOutlines(args['job-id'], path.resolve(args.dir))
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
