function htmlTitle(text = '') {
  const match = String(text).match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : ''
}

function excerpt(text = '', limit = 220) {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, limit)
}

export class CourseApiError extends Error {
  constructor(message, { status = 0, stage = '', requestId = '', body = '' } = {}) {
    super(message)
    this.name = 'CourseApiError'
    this.status = status
    this.stage = stage
    this.requestId = requestId
    this.body = body
  }
}

export async function readCourseJsonResponse(response, fallbackMessage = '课程服务请求失败') {
  const status = Number(response?.status || (response?.ok ? 200 : 0))
  const contentType = String(response?.headers?.get?.('content-type') || '').toLowerCase()
  let raw = ''
  let data = null

  if (typeof response?.text === 'function') {
    raw = await response.text()
    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        const looksHtml = contentType.includes('text/html') || /^\s*<!doctype\s+html|^\s*<html/i.test(raw)
        const pageTitle = looksHtml ? htmlTitle(raw) : ''
        const detail = pageTitle || excerpt(raw)
        throw new CourseApiError(
          `${fallbackMessage}${status ? `（HTTP ${status}）` : ''}${detail ? `：${detail}` : ''}`,
          { status, body: excerpt(raw, 500) }
        )
      }
    } else data = {}
  } else if (typeof response?.json === 'function') {
    try {
      data = await response.json()
    } catch {
      throw new CourseApiError(`${fallbackMessage}${status ? `（HTTP ${status}）` : ''}`, { status })
    }
  } else data = {}

  if (!response?.ok || data?.ok === false) {
    const message = data?.error || data?.detail || fallbackMessage
    throw new CourseApiError(
      `${message}${status && !String(message).includes(`HTTP ${status}`) ? `（HTTP ${status}）` : ''}`,
      {
        status,
        stage: data?.stage || '',
        requestId: data?.requestId || '',
        body: raw ? excerpt(raw, 500) : ''
      }
    )
  }

  return data || {}
}

export async function requestCourseJson(url, options = {}, fallbackMessage = '课程服务请求失败') {
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    throw new CourseApiError(`${fallbackMessage}：${error instanceof Error ? error.message : String(error)}`)
  }
  return readCourseJsonResponse(response, fallbackMessage)
}

export function formatCourseApiError(error, fallback = '课程处理失败') {
  if (!(error instanceof Error)) return fallback
  const parts = [error.message || fallback]
  if (error.stage && !parts[0].includes(error.stage)) parts.push(`阶段：${error.stage}`)
  if (error.requestId) parts.push(`请求编号：${error.requestId}`)
  return parts.join(' · ')
}
