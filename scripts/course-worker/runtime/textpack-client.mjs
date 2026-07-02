function trimSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

export function createWorkerTextPackClient(options = {}) {
  const baseUrl = trimSlash(options.baseUrl || process.env.COURSE_CONTROL_PLANE_URL)
  const secret = String(options.secret || process.env.COURSE_WORKER_SECRET || '').trim()
  const ownerId = String(options.ownerId || process.env.COURSE_WORKER_OWNER_ID || '').trim()
  const fetchImpl = options.fetchImpl || fetch
  if (!baseUrl) throw new Error('COURSE_CONTROL_PLANE_URL is required')
  if (!secret) throw new Error('COURSE_WORKER_SECRET is required')

  return {
    async importTextPack(textPack, input = {}) {
      const headers = {
        authorization: `Bearer ${secret}`,
        accept: 'application/json',
        'content-type': 'application/json'
      }
      if (ownerId) headers['x-law-tech-owner-id'] = ownerId
      const response = await fetchImpl(`${baseUrl}/api/courses/pipeline/textpack`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          textPack,
          autoStart: input.autoStart !== false,
          courseSpec: input.courseSpec || {}
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.ok === false) {
        const error = new Error(data.error || `TextPack import failed (${response.status})`)
        error.status = response.status
        error.code = data.code || ''
        error.retryable = response.status === 429 || response.status >= 500
        throw error
      }
      return data
    }
  }
}
