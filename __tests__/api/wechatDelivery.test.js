const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('outbound WeChat delivery', () => {
  const claim = read('pages/api/messages/outbound/claim.js')
  const prepare = read('pages/api/messages/outbound/prepare.js')
  const reminder = read('pages/api/reminders/run.js')
  const poller = read('integrations/openclaw/law-tech-wechat-relay/src/outbound-poller.js')

  it('uses a durable queue and deterministic relay', () => {
    expect(claim).toContain('claimNextMessageDelivery')
    expect(prepare).toContain('daily-schedule')
    expect(poller).toContain('openclaw-weixin')
    expect(poller).not.toContain('chat/completions')
  })

  it('removes email sending from the active reminder runner', () => {
    expect(reminder).toContain("messages/outbound/prepare")
    expect(reminder).not.toContain('sendReminderEmail')
  })
})
