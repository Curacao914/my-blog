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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'))
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

function normalizeResult(result, reportedBy) {
  return {
    ok: Boolean(result.ok),
    next: String(result.next || ''),
    transcripts: Array.isArray(result.transcripts) ? result.transcripts : [],
    segments: Array.isArray(result.segments) ? result.segments : [],
    pptText: Array.isArray(result.pptText) ? result.pptText : [],
    pptNeedsOcr: Array.isArray(result.pptNeedsOcr) ? result.pptNeedsOcr : [],
    failures: Array.isArray(result.failures) ? result.failures : [],
    reportedBy,
    reportedAt: new Date().toISOString()
  }
}

async function reportPreprocess(jobId, resultPath, localWorkdir) {
  const result = normalizeResult(
    readJson(resultPath),
    'scripts/course-worker/report-preprocess.js'
  )
  const hasFailures = result.failures.length > 0
  const needsOcr = result.pptNeedsOcr.length > 0

  const [job] = await request(
    `/course_jobs?select=id,changelog&id=eq.${encodeURIComponent(jobId)}&limit=1`
  )
  if (!job) throw new Error('Course job not found.')

  const changelog = [
    ...(Array.isArray(job.changelog) ? job.changelog : []),
    {
      at: result.reportedAt,
      event: 'preprocess-result-reported',
      note: `本地预处理回传：转录 ${result.transcripts.length}，分段 ${result.segments.length}，文字课件 ${result.pptText.length}，待 OCR ${result.pptNeedsOcr.length}，失败 ${result.failures.length}。`
    }
  ]

  const rows = await request(`/course_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      status: hasFailures ? 'failed' : 'preprocessing',
      current_node: hasFailures
        ? 'preprocess-failed'
        : needsOcr
          ? 'preprocess-needs-ocr'
          : 'preprocess-complete',
      preprocess_result: result,
      preprocess_reported_at: result.reportedAt,
      local_workdir: localWorkdir || path.dirname(path.dirname(resultPath)),
      updated_at: new Date().toISOString(),
      changelog
    })
  })

  return rows?.[0] || null
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args['job-id'] || !args.result) {
    console.log(
      [
        'Usage:',
        '  npm run course:worker:report-preprocess -- --job-id <course_job_id> --result /tmp/course/working/preprocess_result.json',
        '',
        'Optional:',
        '  --workdir /tmp/course',
        '',
        'This only reports summary metadata to Supabase. It does not upload course files.'
      ].join('\n')
    )
    return
  }

  const job = await reportPreprocess(args['job-id'], args.result, args.workdir)
  console.log(
    JSON.stringify(
      {
        ok: true,
        jobId: job.id,
        currentNode: job.current_node,
        reportedAt: job.preprocess_reported_at
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
