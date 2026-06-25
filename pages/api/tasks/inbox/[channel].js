import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  parseIncomingTaskPayload,
  toPublicTask
} from '@/lib/taskInboxAdapters'
import { createTaskFromCapture } from '@/lib/tasksRepository'

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
  const auth = await requireAdminRequest(req, { allowCaptureToken: true })
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error })
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
    const task = await createTaskFromCapture(parsed.rawText, parsed.context)

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
