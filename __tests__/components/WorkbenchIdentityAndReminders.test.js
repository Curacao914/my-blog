const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('workbench identity and date-digest settings', () => {
  const shell = read('components/DeskShell.js')
  const identity = read('components/DeskIdentityCard.js')
  const wechat = read('components/WechatSettings.js')
  const system = read('components/SystemDesk.js')

  it('replaces the ornamental brand block with the pixel avatar and useful live status', () => {
    expect(shell).toContain('DeskIdentityCard')
    expect(shell.toLowerCase()).not.toContain('personal workspace')
    expect(identity).toContain('src={avatar}')
    expect(identity).toContain("'/curacao-avatar.png'")
    expect(identity).toContain('看到我记得喝口水')
    expect(identity).toContain("{ label: '今日'")
    expect(identity).toContain("{ label: '待办'")
    expect(identity).toContain("{ label: '草稿'")
    expect(identity).not.toContain('weather')
  })

  it('keeps one active daily digest surface and does not reactivate exact task reminders', () => {
    expect(system).toContain('WechatSettings')
    expect(system).not.toContain('ReminderSettings')
    expect(wechat).toContain('发送每日安排')
    expect(wechat).toContain('每日安排时间')
    expect(wechat).toContain('站内消息队列 → OpenClaw Relay')
    expect(wechat).not.toContain('未来 24 小时提醒')
  })
})
