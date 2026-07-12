const fs = require('fs')
const path = require('path')

describe('Reading Library fast path and bulk operations', () => {
  const component = fs.readFileSync(
    path.join(process.cwd(), 'components/ReadingBox.js'),
    'utf8'
  )
  const endpoint = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/reading/items.js'),
    'utf8'
  )

  it('uses the dedicated reading endpoint and sends only diffs', () => {
    expect(component).toContain("fetch('/api/reading/items'")
    expect(component).toContain('buildReadingMutation')
    expect(endpoint).toContain("req.method === 'PATCH'")
    expect(endpoint).not.toContain('syncRemindersForScheduleItems')
    expect(endpoint).not.toContain('cancelScheduleReminderDeliveries')
  })

  it('contains multi-select move, archive, status and delete flows', () => {
    expect(component).toContain('selectedIds')
    expect(component).toContain("type: 'move-items'")
    expect(component).toContain("type: 'delete-items'")
    expect(component).toContain('markSelectedDone')
    expect(component).toContain('archiveSelected')
    expect(component).toContain("className='reading-select-control'")
  })

  it('keeps schedule creation outside the reading collection', () => {
    expect(component).toContain('/api/schedule/items')
    expect(component).toContain("method: 'PUT'")
    expect(component).toContain('writeScheduleItemsCache(profileId, payload.items)')
    expect(component).not.toContain("persist([...items, action], [], '已加入日程')")
  })

  it('guards the reading endpoint against cross-owner ID replacement', () => {
    expect(endpoint).toContain('listScheduleRowsByIds')
    expect(endpoint).toContain("row.owner_id !== profile.id")
    expect(endpoint).toContain("status(409)")
  })
})
