const DEFAULT_TIMEOUT_MS = 30_000

function trimSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function required(value, name) {
  const result = String(value || '').trim()
  if (!result) throw new Error(`${name} is required`)
  return result
}

function safeReplayKey(value) {
  const result = required(value, 'replayKey')
  if (!/^[A-Za-z0-9._:-]+$/.test(result)) {
    throw new Error('replayKey contains unsupported characters')
  }
  return result
}

function makeHeaders(secret, ownerId, body) {
  const headers = {
    authorization: `Bearer ${secret}`,
    accept: 'application/json'
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  if (ownerId) {
    headers['x-law-tech-owner-id'] = ownerId
  }
  return headers
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `Control plane returned non-JSON data (${response.status})`
    )
  }
}

export class CoursePipelineClientError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'CoursePipelineClientError'
    this.status = options.status || 0
    this.code = options.code || ''
    this.retryable = Boolean(options.retryable)
  }
}

export function createCoursePipelineClient(options = {}) {
  const baseUrl = trimSlash(
    options.baseUrl ||
      process.env.COURSE_CONTROL_PLANE_URL
  )
  const secret = required(
    options.secret ||
      process.env.COURSE_WORKER_SECRET,
    'COURSE_WORKER_SECRET'
  )
  const ownerId = String(
    options.ownerId ||
      process.env.COURSE_WORKER_OWNER_ID ||
      ''
  ).trim()
  const fetchImpl = options.fetchImpl || fetch
  const timeoutMs = Math.max(
    1_000,
    Number(
      options.timeoutMs ||
        process.env.COURSE_CONTROL_PLANE_TIMEOUT_MS ||
        DEFAULT_TIMEOUT_MS
    )
  )

  if (!baseUrl) {
    throw new Error('COURSE_CONTROL_PLANE_URL is required')
  }

  async function request(path, requestOptions = {}) {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs
    )

    try {
      const response = await fetchImpl(
        `${baseUrl}${path}`,
        {
          method: requestOptions.method || 'GET',
          headers: makeHeaders(
            secret,
            ownerId,
            requestOptions.body
          ),
          body:
            requestOptions.body === undefined
              ? undefined
              : JSON.stringify(requestOptions.body),
          signal: controller.signal
        }
      )
      const data = await readJson(response)
      if (!response.ok || data.ok === false) {
        const retryable =
          response.status === 429 ||
          response.status >= 500
        throw new CoursePipelineClientError(
          data.error ||
            `Control plane request failed (${response.status})`,
          {
            status: response.status,
            code: data.code || '',
            retryable
          }
        )
      }
      return data
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new CoursePipelineClientError(
          `Control plane request timed out after ${timeoutMs}ms`,
          {
            code: 'control_plane_timeout',
            retryable: true
          }
        )
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    baseUrl,
    hasExplicitOwnerId: Boolean(ownerId),

    async discover(replays) {
      if (!Array.isArray(replays) || !replays.length) {
        return {
          ok: true,
          received: 0,
          added: [],
          addedCount: 0
        }
      }
      return request('/api/courses/pipeline', {
        method: 'POST',
        body: { replays }
      })
    },

    async list(options = {}) {
      const params = new URLSearchParams()
      if (options.stage) {
        params.set('stage', String(options.stage))
      }
      if (options.limit) {
        params.set('limit', String(options.limit))
      }
      const query = params.toString()
      return request(
        `/api/courses/pipeline${query ? `?${query}` : ''}`
      )
    },

    async get(replayKey) {
      return request(
        `/api/courses/pipeline/${encodeURIComponent(
          safeReplayKey(replayKey)
        )}`
      )
    },

    async report(replayKey, patch) {
      return request(
        `/api/courses/pipeline/${encodeURIComponent(
          safeReplayKey(replayKey)
        )}`,
        {
          method: 'PATCH',
          body: patch || {}
        }
      )
    },

    async retry(replayKey, reason = 'worker-retry') {
      return request(
        `/api/courses/pipeline/${encodeURIComponent(
          safeReplayKey(replayKey)
        )}`,
        {
          method: 'POST',
          body: {
            action: 'retry',
            reason
          }
        }
      )
    }
  }
}
