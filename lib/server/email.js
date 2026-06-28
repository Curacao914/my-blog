function emailConfig() {
  return {
    apiKey: String(process.env.RESEND_API_KEY || '').trim(),
    from: String(process.env.REMINDER_FROM || 'Law-Tech <onboarding@resend.dev>').trim()
  }
}

function recipientEmail(value) {
  const email = String(value || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

export function isReminderEmailConfigured() {
  const config = emailConfig()
  return Boolean(config.apiKey && config.from)
}

export async function sendReminderEmail({ to, subject, text, html }) {
  const config = emailConfig()
  const recipient = recipientEmail(to)
  if (!config.apiKey) throw new Error('RESEND_API_KEY is not configured')
  if (!recipient) throw new Error('Reminder recipient is invalid')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: config.from,
      to: [recipient],
      subject,
      text,
      html
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || `Resend failed with ${response.status}`)
  return data
}
