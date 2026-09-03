import fs from 'node:fs'
import path from 'node:path'

const FORBIDDEN_KEY =
  /(password|passwd|pwd|secret|token|cookie|authorization|signed[_-]?url|access[_-]?key|private[_-]?key|watchHref)/i

function text(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitize(value, keyPath = '$', depth = 0) {
  if (depth > 7) {
    throw new Error(`${keyPath} is too deeply nested`)
  }
  if (
    value == null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value
  }
  if (typeof value === 'string') {
    if (/https?:\/\//i.test(value)) {
      return '<REDACTED_URL>'
    }
    if (
      /^Bearer\s+\S+/i.test(value) ||
      /^eyJ[A-Za-z0-9_-]{10,}\./.test(value)
    ) {
      return '<REDACTED_CREDENTIAL>'
    }
    return value.slice(0, 4000)
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 500)
      .map((item, index) =>
        sanitize(item, `${keyPath}[${index}]`, depth + 1)
      )
  }
  if (typeof value === 'object') {
    const result = {}
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) continue
      result[key] = sanitize(
        child,
        `${keyPath}.${key}`,
        depth + 1
      )
    }
    return result
  }
  return String(value)
}

export function flattenRegressionCandidates(discovery = {}) {
  return (discovery.courses || []).flatMap(course =>
    (course.recordings || []).map(recording => ({
      courseKey: course.courseKey,
      courseName: course.courseName,
      replayKey: recording.replayKey,
      title: recording.title,
      startsAtText: recording.startsAtText,
      teacher: recording.teacher
    }))
  )
}

export function selectRegressionCandidate(
  candidates,
  options = {}
) {
  const replayKey = text(options.replayKey)
  const courseName = text(options.courseName)
  const title = text(options.title)

  let matches = [...(candidates || [])]
  if (replayKey) {
    matches = matches.filter(
      item => item.replayKey === replayKey
    )
  }
  if (courseName) {
    matches = matches.filter(item =>
      text(item.courseName).includes(courseName)
    )
  }
  if (title) {
    matches = matches.filter(item =>
      text(item.title).includes(title)
    )
  }

  if (!replayKey && !courseName && !title) {
    throw new Error(
      'Specify --replay-key or both --course and --title'
    )
  }
  if (!matches.length) {
    throw new Error(
      'No replay matched the controlled regression selector'
    )
  }
  if (matches.length > 1) {
    throw new Error(
      `The selector matched ${matches.length} replays; make it more specific`
    )
  }
  return matches[0]
}

export function verifyRegressionCleanup(
  scratchRoot,
  task
) {
  const replayRoot = path.join(
    scratchRoot,
    'replays',
    String(task.replay_key)
  )
  const mediaPath = path.join(
    replayRoot,
    'output',
    'media.mp4'
  )
  const fragmentsPath = path.join(
    replayRoot,
    'fragments'
  )
  const transcriptPath = path.join(
    replayRoot,
    'transcript',
    'raw-transcript.md'
  )
  const textpackPath = path.join(
    replayRoot,
    'textpack',
    'course-textpack.json'
  )

  return {
    mediaDeleted: !fs.existsSync(mediaPath),
    fragmentsDeleted: !fs.existsSync(fragmentsPath),
    transcriptRetained: fs.existsSync(transcriptPath),
    textpackRetained: fs.existsSync(textpackPath)
  }
}

export function buildRegressionReport(input = {}) {
  return sanitize({
    schemaVersion: 1,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    workerId: input.workerId,
    candidate: input.candidate,
    stageTimeline: input.stageTimeline || [],
    finalTask: input.finalTask,
    cleanup: input.cleanup,
    preflight: input.preflight,
    success:
      input.finalTask?.stage === 'awaiting_llm_window' &&
      input.cleanup?.mediaDeleted === true &&
      input.cleanup?.fragmentsDeleted === true,
    error: input.error || null
  })
}

export function writeRegressionReport(
  reportDir,
  report
) {
  fs.mkdirSync(reportDir, {
    recursive: true
  })
  const jsonPath = path.join(
    reportDir,
    'report.json'
  )
  const markdownPath = path.join(
    reportDir,
    'report.md'
  )

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(report, null, 2) + '\n'
  )
  fs.writeFileSync(
    markdownPath,
    [
      '# Course Pipeline Real E2E Report',
      '',
      `- Success: ${report.success ? 'yes' : 'no'}`,
      `- Course: ${report.candidate?.courseName || ''}`,
      `- Lesson: ${report.candidate?.title || ''}`,
      `- Replay: ${report.candidate?.replayKey || ''}`,
      `- Final stage: ${report.finalTask?.stage || ''}`,
      `- Media deleted: ${report.cleanup?.mediaDeleted ? 'yes' : 'no'}`,
      `- Fragments deleted: ${report.cleanup?.fragmentsDeleted ? 'yes' : 'no'}`,
      `- Transcript retained: ${report.cleanup?.transcriptRetained ? 'yes' : 'no'}`,
      `- TextPack retained: ${report.cleanup?.textpackRetained ? 'yes' : 'no'}`,
      '',
      '## Stage timeline',
      '',
      ...(report.stageTimeline || []).map(
        item => `- ${item.at}: ${item.stage}`
      ),
      '',
      report.error
        ? `## Error\n\n${report.error.message || report.error}`
        : ''
    ].join('\n')
  )

  return {
    jsonPath,
    markdownPath
  }
}
