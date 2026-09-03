const DEFAULT_FAILURE = '这条内容尚未添加成功，请稍后重试。'

function getConfig(config = {}) {
  const captureUrl = config.captureUrl || process.env.LAW_TECH_CAPTURE_URL
  const token = config.token || process.env.WECHAT_CAPTURE_TOKEN
  if (!captureUrl) throw new Error('LAW_TECH_CAPTURE_URL is not configured')
  if (!token) throw new Error('WECHAT_CAPTURE_TOKEN is not configured')
  return { captureUrl, token }
}

export async function sendToLawTech(message, config = {}) {
  const { captureUrl, token } = getConfig(config)
  const controller = new AbortController()
  const timeoutMs = config.timeoutMs || 90_000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'idempotency-key': message.messageId ? `wechat:${message.senderId || 'unknown'}:${message.messageId}` : ''
      },
      body: JSON.stringify({
        command: message.command,
        source: 'wechat-clawbot',
        senderId: message.senderId,
        messageId: message.messageId,
        threadId: message.threadId
      }),
      signal: controller.signal
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (
      !response.ok ||
      !payload?.ok ||
      (!payload?.replyText && !payload?.silent)
    ) {
      return {
        ok: false,
        replyText: payload?.replyText || DEFAULT_FAILURE,
        status: response.status
      }
    }

    return {
      ok: true,
      replyText: payload.silent ? '' : payload.replyText,
      silent: Boolean(payload.silent),
      payload
    }
  } catch {
    return {
      ok: false,
      replyText: DEFAULT_FAILURE
    }
  } finally {
    clearTimeout(timer)
  }
}
