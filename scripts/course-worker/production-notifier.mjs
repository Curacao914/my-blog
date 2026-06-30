function safeText(value) {
  return String(value || '')
    .replace(
      /https?:\/\/[^\s"'<>]+/gi,
      '<REDACTED_URL>'
    )
    .replace(
      /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?/g,
      '<REDACTED_TOKEN>'
    )
    .slice(0, 1000)
}

export function notificationPayload(
  summary
) {
  return {
    event:
      'course_worker_cycle',
    status:
      safeText(summary.status),
    startedAt:
      safeText(summary.startedAt),
    finishedAt:
      safeText(summary.finishedAt),
    workerId:
      safeText(summary.workerId),
    discovery:
      summary.discovery,
    counts:
      summary.counts,
    tasks:
      (summary.tasks || [])
        .slice(0, 20)
        .map(task => ({
          courseName:
            safeText(
              task.courseName
            ),
          title:
            safeText(task.title),
          stage:
            safeText(task.stage),
          reason:
            safeText(task.reason)
        }))
  }
}

export async function sendCycleNotification(
  summary,
  options = {}
) {
  const url = String(
    options.url ||
    process.env
      .COURSE_NOTIFY_WEBHOOK_URL ||
    ''
  ).trim()
  if (!url) {
    return {
      sent: false,
      reason: 'not-configured'
    }
  }

  const controller =
    new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(
      1_000,
      Number(
        options.timeoutMs ||
        15_000
      )
    )
  )
  const headers = {
    accept: 'application/json',
    'content-type':
      'application/json'
  }
  const bearer = String(
    options.bearer ||
    process.env
      .COURSE_NOTIFY_WEBHOOK_BEARER ||
    ''
  ).trim()
  if (bearer) {
    headers.authorization =
      `Bearer ${bearer}`
  }

  try {
    const response = await fetch(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(
          notificationPayload(
            summary
          )
        ),
        signal:
          controller.signal
      }
    )
    if (!response.ok) {
      throw new Error(
        `notification HTTP ${response.status}`
      )
    }
    return {
      sent: true,
      reason: ''
    }
  } catch (error) {
    return {
      sent: false,
      reason:
        error instanceof Error
          ? error.message
          : String(error)
    }
  } finally {
    clearTimeout(timeout)
  }
}
