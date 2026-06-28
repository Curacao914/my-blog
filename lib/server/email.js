function globalEmailConfig() {
  return {
    apiKey: String(process.env.RESEND_API_KEY || '').trim(),
    from: String(process.env.REMINDER_FROM || 'Law-Tech <onboarding@resend.dev>').trim()
  }
}

export async function sendReminderEmail({ to, subject, text, html, config }) {
  const resolved = config?.apiKey ? config : globalEmailConfig()
  if (!resolved.apiKey) throw new Error('Email provider is not configured for this workspace')
  if (!resolved.from) throw new Error('Email sender is not configured for this workspace')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resolved.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: resolved.from,
      to: [to],
      subject,
      text,
      html
    })
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || `Email delivery failed (${response.status})`)
  }
  return payload
}
