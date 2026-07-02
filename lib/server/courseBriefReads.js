import crypto from 'crypto'

import { getSupabaseRestConfig } from '@/lib/db/client'

const TABLE = 'course_brief_reads'

function clean(value) {
  return String(value || '').trim()
}

async function supabaseRequest(pathname, options = {}) {
  const { baseUrl, headers } = getSupabaseRestConfig()
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  })
  const text = await response.text()
  if (!response.ok) {
    const error = new Error(`Supabase request failed ${response.status}: ${text}`)
    error.status = response.status
    error.body = text
    throw error
  }
  return text ? JSON.parse(text) : null
}

function missingReadTable(error) {
  const message = `${error?.message || ''} ${error?.body || ''}`
  return error?.status === 404 || /course_brief_reads|PGRST205|42P01/i.test(message)
}

function workflowFromJob(job = {}) {
  return job.preprocess_result?.workflow || {}
}

function readableSnippet(markdown = '', limit = 160) {
  return clean(markdown)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

export function courseBriefFingerprint(entry = {}) {
  return crypto
    .createHash('sha256')
    .update([
      clean(entry.markdown),
      clean(entry.updatedAt),
      clean(entry.mainLine)
    ].join('\n'))
    .digest('hex')
}

function briefEntry(job = {}, lesson = {}) {
  const brief = lesson.brief || null
  if (!brief?.markdown || brief.stale) return null

  const courseName =
    clean(job.course_name) ||
    clean(workflowFromJob(job).courseSpec?.courseName) ||
    '未命名课程'
  const lessonTitle = clean(lesson.title) || '未命名课次'
  const updatedAt =
    clean(brief.updatedAt) ||
    clean(lesson.updatedAt) ||
    clean(job.updated_at)
  const mainLine =
    clean(brief.mainLine || brief.summary) ||
    readableSnippet(brief.markdown)

  const entry = {
    id: `${job.id}:${lesson.key}`,
    type: 'course_brief',
    jobId: job.id,
    lessonKey: lesson.key,
    courseName,
    teacher: clean(job.teacher || workflowFromJob(job).courseSpec?.teacher),
    lessonTitle,
    title: `${courseName} · ${lessonTitle}`,
    mainLine,
    markdown: brief.markdown,
    updatedAt,
    url: `/desk/briefs/${encodeURIComponent(job.id)}/${encodeURIComponent(lesson.key)}`,
    noteUrl: lesson.finalNote?.markdown
      ? `/desk/materials/${encodeURIComponent(job.id)}/${encodeURIComponent(lesson.key)}`
      : ''
  }

  return {
    ...entry,
    fingerprint: courseBriefFingerprint(entry)
  }
}

export function courseBriefEntriesFromJobs(jobs = []) {
  return (jobs || [])
    .flatMap(job => {
      const workflow = workflowFromJob(job)
      return (workflow.lessons || [])
        .map(lesson => briefEntry(job, lesson))
        .filter(Boolean)
    })
    .sort((left, right) =>
      Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0)
    )
}

export async function listCourseBriefEntries(ownerId, { limit = 80 } = {}) {
  if (!ownerId) throw new Error('ownerId is required')
  const rows = await supabaseRequest(
    `/course_jobs?select=id,owner_id,course_name,teacher,preprocess_result,updated_at&owner_id=eq.${encodeURIComponent(ownerId)}&order=updated_at.desc&limit=${Math.min(Math.max(Number(limit) || 80, 1), 120)}`
  )
  return courseBriefEntriesFromJobs(rows || [])
}

export async function listCourseBriefReadRows(ownerId) {
  if (!ownerId) throw new Error('ownerId is required')
  try {
    const rows = await supabaseRequest(
      `/${TABLE}?select=owner_id,course_job_id,lesson_key,brief_fingerprint,read_at,updated_at&owner_id=eq.${encodeURIComponent(ownerId)}`
    )
    return {
      rows: rows || [],
      migrationMissing: false
    }
  } catch (error) {
    if (missingReadTable(error)) {
      return {
        rows: [],
        migrationMissing: true
      }
    }
    throw error
  }
}

export function applyCourseBriefReadState(entries = [], readRows = []) {
  const byKey = new Map(
    (readRows || []).map(row => [
      `${row.course_job_id}:${row.lesson_key}`,
      row
    ])
  )

  return (entries || []).map(entry => {
    const row = byKey.get(`${entry.jobId}:${entry.lessonKey}`)
    const read = Boolean(
      row?.read_at &&
      row.brief_fingerprint === entry.fingerprint
    )
    return {
      ...entry,
      read,
      readAt: read ? row.read_at : ''
    }
  })
}

export async function listCourseBriefsWithReadState(ownerId) {
  const [entries, readState] = await Promise.all([
    listCourseBriefEntries(ownerId),
    listCourseBriefReadRows(ownerId)
  ])
  return {
    entries: applyCourseBriefReadState(entries, readState.rows),
    migrationMissing: readState.migrationMissing
  }
}

export async function getCourseBriefForOwner(ownerId, jobId, lessonKey) {
  if (!ownerId || !jobId || !lessonKey) return null
  const rows = await supabaseRequest(
    `/course_jobs?select=id,owner_id,course_name,teacher,preprocess_result,updated_at&id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`
  )
  const job = rows?.[0]
  if (!job) return null
  const lesson = (workflowFromJob(job).lessons || [])
    .find(item => item.key === lessonKey)
  return lesson ? briefEntry(job, lesson) : null
}

export async function getCourseBriefReadState(ownerId, jobId, lessonKey) {
  const entry = await getCourseBriefForOwner(ownerId, jobId, lessonKey)
  if (!entry) return { entry: null, migrationMissing: false }
  const state = await listCourseBriefReadRows(ownerId)
  return {
    entry: applyCourseBriefReadState([entry], state.rows)[0],
    migrationMissing: state.migrationMissing
  }
}

export async function setCourseBriefRead({
  ownerId,
  jobId,
  lessonKey,
  read = true
}) {
  const entry = await getCourseBriefForOwner(ownerId, jobId, lessonKey)
  if (!entry) throw new Error('Course brief not found')

  if (!read) {
    try {
      await supabaseRequest(
        `/${TABLE}?owner_id=eq.${encodeURIComponent(ownerId)}&course_job_id=eq.${encodeURIComponent(jobId)}&lesson_key=eq.${encodeURIComponent(lessonKey)}`,
        { method: 'DELETE' }
      )
    } catch (error) {
      if (missingReadTable(error)) {
        const missing = new Error('COURSE_BRIEF_READ_MIGRATION_REQUIRED')
        missing.code = 'COURSE_BRIEF_READ_MIGRATION_REQUIRED'
        throw missing
      }
      throw error
    }
    return { ...entry, read: false, readAt: '' }
  }

  try {
    const now = new Date().toISOString()
    const rows = await supabaseRequest(
      `/${TABLE}?on_conflict=owner_id,course_job_id,lesson_key`,
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          owner_id: ownerId,
          course_job_id: jobId,
          lesson_key: lessonKey,
          brief_fingerprint: entry.fingerprint,
          read_at: now,
          updated_at: now
        })
      }
    )
    return {
      ...entry,
      read: true,
      readAt: rows?.[0]?.read_at || now
    }
  } catch (error) {
    if (missingReadTable(error)) {
      const missing = new Error('COURSE_BRIEF_READ_MIGRATION_REQUIRED')
      missing.code = 'COURSE_BRIEF_READ_MIGRATION_REQUIRED'
      throw missing
    }
    throw error
  }
}
