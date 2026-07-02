const fs = require('fs')
const path = require('path')

describe('Today reminder UI', () => {
  const component = fs.readFileSync(
    path.join(process.cwd(), 'components/TodayBoard.js'),
    'utf8'
  )
  const styles = fs.readFileSync(
    path.join(process.cwd(), 'components/LawTechDeskStyles.js'),
    'utf8'
  )

  it('keeps reminder metadata when schedule items are normalized', () => {
    expect(component).toContain('reminders: normalizedReminders')
    expect(component).toContain('reminder: normalizedReminders[0]')
    expect(component).toContain('temporal: item.temporal')
  })

  it('shows and edits one or more reminder times', () => {
    expect(component).toContain('today-reminder-meta')
    expect(component).toContain('添加提醒')
    expect(component).toContain('删除提醒')
    expect(component).toContain('type="datetime-local"')
    expect(styles).toContain('.reminder-editor')
    expect(styles).toContain('.today-reminder-meta')
  })
})
