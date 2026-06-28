const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('workbench identity and reminder settings', () => {
  const shell = read('components/DeskShell.js')
  const identity = read('components/DeskIdentityCard.js')
  const settings = read('components/ReminderSettings.js')
  const system = read('components/SystemDesk.js')
  const vercel = JSON.parse(read('vercel.json'))

  it('replaces the ornamental brand block with the pixel avatar and useful live status', () => {
    expect(shell).toContain('DeskIdentityCard')
    expect(shell.toLowerCase()).not.toContain('personal workspace')
    expect(identity).toContain("src='/curacao-avatar.png'")
    expect(identity).toContain('看到我记得喝口水')
    expect(identity).toContain("{ label: '今日'")
    expect(identity).toContain("{ label: '待办'")
    expect(identity).toContain("{ label: '草稿'")
    expect(identity).not.toContain('weather')
  })

  it('exposes one administrator reminder settings surface with a daily production cron', () => {
    expect(system).toContain('ReminderSettings')
    expect(settings).toContain('每日安排')
    expect(settings).toContain('未来 24 小时提醒')
    expect(settings).toContain('周一回顾')
    expect(settings).toContain('/api/reminders/test')
    expect(vercel.crons).toContainEqual({ path: '/api/reminders/run', schedule: '0 1 * * *' })
  })
})
