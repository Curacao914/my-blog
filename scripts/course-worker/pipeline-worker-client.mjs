import {
  CoursePipelineClientError,
  createCoursePipelineClient
} from './pipeline-client.mjs'

function trimSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function required(value, name) {
  const result = String(value || '').trim()
  if (!result) throw new Error(`${name} is required`)
  return result
}

function cleanWorkerId(value) {
  const result = required(value, 'workerId')
  if (!/^[A-Za-z0-9._:-]+$/.test(result)) {
    throw new Error('workerId contains unsupported characters')
  }
  return result
}

function cleanReplayKey(value) {
  const result = required(value, 'replayKey')
  if (!/^[A-Za-z0-9._:-]+$/.test(result)) {
    throw new Error('replayKey contains unsupported characters')
  }
  return result
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

export function createCoursePipelineWorkerClient(
  options = {}
) {
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
        30_000
    )
  )
  const base = createCoursePipelineClient({
    baseUrl,
    secret,
    ownerId,
    fetchImpl,
    timeoutMs
  })

  async function request(path, body) {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs
    )

    const headers = {
      authorization: `Bearer ${secret}`,
      accept: 'application/json',
      'content-type': 'application/json'
    }
    if (ownerId) {
      headers['x-law-tech-owner-id'] = ownerId
    }

    try {
      const response = await fetchImpl(
        `${baseUrl}${path}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(body || {}),
          signal: controller.signal
        }
      )
      const data = await readJson(response)
      if (!response.ok || data.ok === false) {
        throw new CoursePipelineClientError(
          data.error ||
            `Control plane request failed (${response.status})`,
          {
            status: response.status,
            code: data.code || '',
            retryable:
              response.status === 429 ||
              response.status >= 500
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
    ...base,

    async claim(input = {}) {
      return request(
        '/api/courses/pipeline/claim',
        {
          workerId: cleanWorkerId(input.workerId),
          leaseSeconds: input.leaseSeconds
        }
      )
    },

    async claimSpecific(replayKey, input = {}) {
      return request(
        `/api/courses/pipeline/${encodeURIComponent(
          cleanReplayKey(replayKey)
        )}/claim`,
        {
          workerId: cleanWorkerId(input.workerId),
          leaseSeconds: input.leaseSeconds
        }
      )
    },

    async heartbeat(replayKey, input = {}) {
      return request(
        `/api/courses/pipeline/${encodeURIComponent(
          cleanReplayKey(replayKey)
        )}/heartbeat`,
        {
          workerId: cleanWorkerId(input.workerId),
          leaseSeconds: input.leaseSeconds
        }
      )
    }
  }
}
