import path from 'node:path'

function text(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseAllowlist(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
        .split(/[\n,|;]+/)

  return [...new Set(
    source
      .map(item => text(item))
      .filter(Boolean)
  )]
}

function parseCourseDate(value) {
  const normalized = text(value)
    .replace(
      /^(\d{4}-\d{2}-\d{2})\s+/,
      '$1T'
    )
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp)
    ? timestamp
    : 0
}

function courseAllowed(course, allowlist) {
  const key = text(course.courseKey)
  const name = text(course.courseName)
  const normalizedName = text(
    course.normalizedName
  )
  return allowlist.some(item => {
    const target = text(item)
    return (
      target === key ||
      target === name ||
      target === normalizedName
    )
  })
}

export function collectAllowedReplays(
  discovery,
  options = {}
) {
  const allowlist = parseAllowlist(
    options.allowlist
  )
  const allowAll = Boolean(options.allowAll)
  if (!allowAll && !allowlist.length) {
    throw new Error(
      'COURSE_PIPELINE_ALLOWLIST is required unless --all is used'
    )
  }

  const nowMs = Number(
    options.nowMs || Date.now()
  )
  const sinceDays = Math.max(
    0,
    Number(options.sinceDays ?? 35)
  )
  const cutoff = sinceDays
    ? nowMs -
      sinceDays *
        24 * 60 * 60 * 1000
    : 0

  const byReplay = new Map()
  for (
    const course of
    discovery?.courses || []
  ) {
    if (
      !allowAll &&
      !courseAllowed(course, allowlist)
    ) {
      continue
    }

    for (
      const recording of
      course.recordings || []
    ) {
      const replayKey = text(
        recording.replayKey
      )
      if (!replayKey) continue

      const startsAtMs =
        parseCourseDate(
          recording.startsAtText
        )
      if (
        cutoff &&
        startsAtMs &&
        startsAtMs < cutoff
      ) {
        continue
      }

      byReplay.set(replayKey, {
        courseKey:
          text(course.courseKey),
        courseName:
          text(course.courseName),
        replayKey,
        title:
          text(recording.title),
        startsAtText:
          text(recording.startsAtText),
        teacher:
          text(recording.teacher)
      })
    }
  }

  return [...byReplay.values()]
    .sort((left, right) =>
      left.startsAtText.localeCompare(
        right.startsAtText
      )
    )
}

const ACTIONABLE_STAGES = new Set([
  'queued',
  'failed',
  'downloading',
  'downloaded',
  'transcribing',
  'transcript_ready',
  'building_textpack',
  'textpack_ready',
  'uploading',
  'uploaded',
  'cleanup'
])

export function selectActionableTasks(
  tasks,
  options = {}
) {
  const allowlist = parseAllowlist(
    options.allowlist
  )
  const allowAll = Boolean(options.allowAll)
  const maximum = Math.max(
    1,
    Number(options.maximum || 4)
  )

  return [...(tasks || [])]
    .filter(task =>
      ACTIONABLE_STAGES.has(
        String(task.stage || '')
      )
    )
    .filter(task => {
      if (allowAll) return true
      return allowlist.some(item => {
        const target = text(item)
        return (
          target === text(task.course_key) ||
          target === text(task.course_name)
        )
      })
    })
    .sort((left, right) => {
      const leftDate =
        parseCourseDate(
          left.starts_at_text
        )
      const rightDate =
        parseCourseDate(
          right.starts_at_text
        )
      return leftDate - rightDate
    })
    .slice(0, maximum)
}

export function buildCycleSummary(
  input = {}
) {
  const results = input.results || []
  const counts = {
    processed: results.length,
    completed: 0,
    queued: 0,
    failed: 0,
    needsAttention: 0,
    other: 0
  }

  for (const result of results) {
    const stage = String(
      result.task?.stage ||
      result.status ||
      ''
    )
    if (
      stage === 'awaiting_llm_window'
    ) {
      counts.completed += 1
    } else if (stage === 'queued') {
      counts.queued += 1
    } else if (stage === 'failed') {
      counts.failed += 1
    } else if (
      stage === 'needs_attention'
    ) {
      counts.needsAttention += 1
    } else {
      counts.other += 1
    }
  }

  const status =
    counts.needsAttention > 0 ||
    counts.failed > 0
      ? 'attention'
      : counts.queued > 0
        ? 'partial'
        : 'ok'

  return {
    schemaVersion: 1,
    status,
    startedAt:
      input.startedAt || '',
    finishedAt:
      input.finishedAt || '',
    workerId:
      text(input.workerId),
    loginMode:
      text(input.loginMode),
    allowlist:
      parseAllowlist(input.allowlist),
    discovery: {
      scannedCourses:
        Number(
          input.scannedCourses || 0
        ),
      selectedReplays:
        Number(
          input.selectedReplays || 0
        ),
      newlyAdded:
        Number(
          input.newlyAdded || 0
        )
    },
    counts,
    tasks: results.map(result => ({
      replayKey:
        text(result.task?.replay_key),
      courseName:
        text(result.task?.course_name),
      title:
        text(result.task?.title),
      stage:
        text(
          result.task?.stage ||
          result.status
        ),
      reason:
        text(result.reason)
          .slice(0, 300)
    }))
  }
}

export function cycleExitCode(summary) {
  if (
    summary?.counts?.needsAttention > 0
  ) {
    return 2
  }
  if (
    summary?.counts?.failed > 0
  ) {
    return 1
  }
  return 0
}

export function safeRunDirectoryName(
  startedAt = new Date().toISOString()
) {
  return `cycle-${String(startedAt)
    .replace(/[:.]/g, '-')
    .replace(/[^A-Za-z0-9_-]/g, '')}`
}

export function markdownCycleSummary(
  summary
) {
  const lines = [
    '# Course Worker Production Cycle',
    '',
    `- Status: ${summary.status}`,
    `- Started: ${summary.startedAt}`,
    `- Finished: ${summary.finishedAt}`,
    `- Worker: ${summary.workerId}`,
    `- Login: ${summary.loginMode || 'n/a'}`,
    `- Replays selected: ${summary.discovery.selectedReplays}`,
    `- Newly added: ${summary.discovery.newlyAdded}`,
    `- Processed: ${summary.counts.processed}`,
    `- Completed: ${summary.counts.completed}`,
    `- Queued: ${summary.counts.queued}`,
    `- Failed: ${summary.counts.failed}`,
    `- Needs attention: ${summary.counts.needsAttention}`,
    '',
    '## Tasks',
    ''
  ]

  if (!summary.tasks.length) {
    lines.push('- Queue idle.')
  } else {
    for (const task of summary.tasks) {
      lines.push(
        `- ${task.courseName} · ${task.title} · ${task.stage}` +
        (
          task.reason
            ? ` · ${task.reason}`
            : ''
        )
      )
    }
  }

  return lines.join('\n') + '\n'
}
