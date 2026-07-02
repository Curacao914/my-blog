function text(value, max = 240) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function identifier(value) {
  return text(value, 180)
}

function courseRows(catalog = {}) {
  if (Array.isArray(catalog)) return catalog
  if (Array.isArray(catalog.courses)) return catalog.courses
  if (Array.isArray(catalog.catalog)) return catalog.catalog
  return []
}

export function collectPipelineReplays(
  catalog,
  options = {}
) {
  const includeAll = Boolean(options.includeAll)
  const unique = new Map()

  for (const course of courseRows(catalog)) {
    const courseKey = identifier(
      course.courseKey || course.course_key
    )
    const courseName = text(
      course.name ||
        course.courseName ||
        course.course_name,
      240
    )

    for (const recording of course.recordings || []) {
      if (!includeAll && recording.isNew !== true) {
        continue
      }

      const replayKey = identifier(
        recording.replayKey ||
          recording.replay_key
      )
      if (!courseKey || !courseName || !replayKey) {
        continue
      }

      unique.set(replayKey, {
        replayKey,
        courseKey,
        courseName,
        title: text(recording.title, 240),
        startsAtText: text(
          recording.startsAtText ||
            recording.starts_at_text,
          120
        ),
        teacher: text(recording.teacher, 160)
      })
    }
  }

  return [...unique.values()]
}

export function assertCatalogBridgeSafe(replays = []) {
  const serialized = JSON.stringify(replays)
  if (
    /https?:\/\//i.test(serialized) ||
    /(authorization|cookie|bearer|password|token|watchHref)/i.test(
      serialized
    )
  ) {
    throw new Error(
      'Catalog bridge output contains a URL or credential field'
    )
  }
  return true
}
