const fs = require('fs')
const path = require('path')

describe('/api/reminders/run compatibility route', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/reminders/run.js'),
    'utf8'
  )

  it('delegates to the WeChat preparation route and cannot send email', () => {
    expect(source).toContain("messages/outbound/prepare")
    expect(source).not.toContain('sendReminderEmail')
    expect(source).not.toContain('resolveUserEmailConfig')
  })
})
