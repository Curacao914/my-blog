const fs = require('fs')
const path = require('path')

describe('Today and Reading separation', () => {
  const today = fs.readFileSync(path.join(process.cwd(), 'components/TodayBoard.js'), 'utf8')
  const reading = fs.readFileSync(path.join(process.cwd(), 'components/ReadingBox.js'), 'utf8')

  it('keeps reading materials out of Today views', () => {
    expect(today).not.toContain("{ key: 'reading', label: '今日阅读' }")
    expect(today).toContain("items.filter((item) => !isReadingItem(item))")
  })

  it('lets Reading create a linked schedule action', () => {
    expect(reading).toContain('安排阅读')
    expect(reading).toContain("contentType: 'action'")
    expect(reading).toContain('linkedReadingId')
  })
})
