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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'))
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
    throw new Error(
      'Missing SUPABASE_URL and service-role/secret key. Use --manifest first for offline dry-run.'
    )
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

async function request(pathname) {
  const config = getConfig()
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    headers: config.headers
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed ${response.status}: ${text}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function byId(items = []) {
  return new Map(items.map(item => [item.id, item]))
}

async function fetchManifest(jobId) {
  const encodedJobId = encodeURIComponent(jobId)
  const [jobs, assets, lessons] = await Promise.all([
    request(
      `/course_jobs?select=id,course_name,lesson,teacher,status,preferences,material_bundle_confirmed_at,preflight_confirmed_at&id=eq.${encodedJobId}&limit=1`
    ),
    request(
      `/course_assets?select=id,kind,role,original_name,storage_path,checksum,lesson_order,lesson_key&job_id=eq.${encodedJobId}&order=role.asc&order=sort_order.asc&order=created_at.asc`
    ),
    request(
      `/course_lessons?select=id,lesson_order,lesson_key,title,status,transcript_asset_id,outline_confirmed_at&job_id=eq.${encodedJobId}&order=lesson_order.asc`
    )
  ])

  const job = jobs?.[0]
  if (!job) throw new Error('Course job not found.')

  const assetsByRole = (assets || []).reduce((acc, asset) => {
    const role = asset.role || 'supplement'
    acc[role] = [...(acc[role] || []), asset]
    return acc
  }, {})
  const transcriptById = byId(assetsByRole.transcript || [])

  return {
    version: 1,
    job: {
      id: job.id,
      courseName: job.course_name,
      lessonRange: job.lesson,
      teacher: job.teacher,
      status: job.status,
      preferences: job.preferences || {}
    },
    gates: {
      materialBundleConfirmed: Boolean(job.material_bundle_confirmed_at),
      preflightConfirmed: Boolean(job.preflight_confirmed_at),
      lessonsPrepared: Boolean(lessons?.length),
      outlinesConfirmed: (lessons || []).every(lesson =>
        Boolean(lesson.outline_confirmed_at)
      )
    },
    materialBundle: {
      transcriptCount: assetsByRole.transcript?.length || 0,
      slideDeckCount: assetsByRole.slides?.length || 0,
      readingCount: assetsByRole.reading?.length || 0,
      supplementCount: assetsByRole.supplement?.length || 0,
      slidePool: (assetsByRole.slides || []).map(asset => ({
        id: asset.id,
        name: asset.original_name,
        storagePath: asset.storage_path,
        checksum: asset.checksum
      }))
    },
    lessons: (lessons || []).map((lesson, index) => {
      const transcript = transcriptById.get(lesson.transcript_asset_id)
      return {
        id: lesson.id,
        order: lesson.lesson_order,
        key: lesson.lesson_key,
        title: lesson.title,
        status: lesson.status,
        transcript: transcript
          ? {
              id: transcript.id,
              name: transcript.original_name,
              storagePath: transcript.storage_path,
              checksum: transcript.checksum
            }
          : null,
        contextPolicy:
          index === 0
            ? 'first-lesson'
            : 'use-rolling-course-context-not-full-history',
        outlineConfirmed: Boolean(lesson.outline_confirmed_at)
      }
    })
  }
}

function buildDryRunPlan(manifest) {
  const gates = manifest.gates || {}
  const blockers = []
  if (!gates.materialBundleConfirmed) blockers.push('材料包尚未确认')
  if (!gates.preflightConfirmed) blockers.push('preflight 偏好尚未确认')
  if (!gates.lessonsPrepared) blockers.push('尚未准备课次映射')

  const lessons = manifest.lessons || []
  const lessonsWithoutTranscript = lessons.filter(lesson => !lesson.transcript)
  if (lessonsWithoutTranscript.length) {
    blockers.push(`${lessonsWithoutTranscript.length} 个课次缺少对应 SRT`)
  }

  const outlineReady = gates.outlinesConfirmed
  const nextAction = blockers.length
    ? 'fix-blockers-before-worker'
    : outlineReady
      ? 'ready-for-node-generation'
      : 'ready-for-outline-generation-or-confirmation'

  return {
    ok: blockers.length === 0,
    nextAction,
    blockers,
    course: manifest.job?.courseName,
    materialSummary: {
      transcripts: manifest.materialBundle?.transcriptCount || 0,
      slideDecks: manifest.materialBundle?.slideDeckCount || 0,
      readings: manifest.materialBundle?.readingCount || 0,
      supplements: manifest.materialBundle?.supplementCount || 0
    },
    lessonPlan: lessons.map(lesson => ({
      order: lesson.order,
      title: lesson.title || lesson.key,
      transcript: lesson.transcript?.name || null,
      contextPolicy: lesson.contextPolicy,
      outlineConfirmed: Boolean(lesson.outlineConfirmed)
    })),
    workerSteps: [
      '下载材料到临时课程目录/raw',
      '提取 PPTX 文本并建立课件池索引',
      '让模型按每份 SRT 匹配可能相关的 PPTX 片段',
      '逐课生成或刷新大纲',
      '等待用户确认大纲',
      '按课次顺序生成节点级笔记并维护 rolling context',
      '校验 Markdown',
      '写回内容快照/数据库'
    ]
  }
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || (!args.manifest && !args['job-id'])) {
    console.log(
      [
        'Usage:',
        '  node scripts/course-worker/dry-run.js --manifest ./manifest.json',
        '  node scripts/course-worker/dry-run.js --job-id <course_job_id>',
        '',
        'This is a dry-run only: it does not download files, call models, or write to the database.'
      ].join('\n')
    )
    return
  }

  const manifest = args.manifest
    ? readJson(args.manifest)
    : await fetchManifest(args['job-id'])

  console.log(JSON.stringify(buildDryRunPlan(manifest), null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
