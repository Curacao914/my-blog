import { addCalendarDays, calendarDateInTimeZone, calendarDateLabel } from '@/lib/domain/calendarDate'

describe('calendar date helpers', () => {
  it('adds natural days without the UTC offset moving the result backwards', () => {
    expect(addCalendarDays('2026-06-27', 1)).toBe('2026-06-28')
    expect(addCalendarDays('2026-06-27', 2)).toBe('2026-06-29')
  })

  it('handles month and year boundaries', () => {
    expect(addCalendarDays('2026-06-30', 1)).toBe('2026-07-01')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('labels tomorrow and the day after tomorrow from a calendar date', () => {
    expect(calendarDateLabel('2026-06-28', '2026-06-27')).toBe('明天')
    expect(calendarDateLabel('2026-06-29', '2026-06-27')).toBe('后天')
  })

  it('uses the requested timezone near midnight', () => {
    const date = new Date('2026-06-26T16:30:00.000Z')
    expect(calendarDateInTimeZone(date, 'Asia/Shanghai')).toBe('2026-06-27')
    expect(calendarDateInTimeZone(date, 'UTC')).toBe('2026-06-26')
  })
})
