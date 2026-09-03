import { getConfiguredCaptureOwner } from '@/lib/auth/scheduleOwner'
import {
  parseIncomingTaskPayload,
  toPublicTask
} from '@/lib/taskInboxAdapters'
import { createTaskFromCapture } from '@/lib/tasksRepository'

function isScheduleChannel(channel) {
  const value = Array.isArray(channel) ? channel[0] : channel
  return ['wechat', 'weixin', 'wx', 'wecom', 'work-wechat', 'qywx'].includes(
    String(value || '').toLowerCase()
  )
}

function requestOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

async function forwardToScheduleCapture(req, parsed) {
  const token = process.env.WECHAT_CAPTURE_TOKEN || process.env.TASK_CAPTURE_TOKEN
  if (!token) {
    return {
      status: 500,
      payload: {
        ok: false,
        error: 'Capture token is not configured',
        replyText: '这条内容尚未添加成功，请稍后重试。'
      }
    }
  }

  const response = await fetch(`${requestOrigin(req)}/api/schedule/capture`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'idempotency-key': parsed.context.sourceMessageId
        ? `${parsed.context.source}:${parsed.context.sourceUser || 'unknown'}:${parsed.context.sourceMessageId}`
        : ''
    },
    body: JSON.stringify({
      command: parsed.rawText,
      source: parsed.context.source === 'wechat' ? 'wechat-clawbot' : parsed.context.source,
      senderId: parsed.context.sourceUser || '',
      messageId: parsed.context.sourceMessageId || '',
      attachments: parsed.context.attachments || []
    })
  })

  const payload = await response.json().catch(() => ({
    ok: false,
    error: 'Invalid schedule capture response',
    replyText: '这条内容尚未添加成功，请稍后重试。'
  }))

  return { status: response.status, payload }
}

export const config = {
  api: {
    bodyParser: false
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const owner = await getConfiguredCaptureOwner(req)
  if (!owner.ok) {
    return res.status(owner.status).json({ ok: false, error: owner.error })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const rawBody = await readRawBody(req)
    const parsed = parseIncomingTaskPayload({
      channel: req.query.channel,
      contentType: req.headers['content-type'] || '',
      rawBody
    })

    if (isScheduleChannel(req.query.channel)) {
      const result = await forwardToScheduleCapture(req, parsed)
      return res.status(result.status).json(result.payload)
    }

    const task = await createTaskFromCapture(owner.profile.id, parsed.rawText, parsed.context)

    return res.status(200).json({
      ok: true,
      channel: parsed.context.source,
      task: toPublicTask(task)
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid request'
    })
  }
}
