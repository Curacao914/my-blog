import {
  buildDailyDigestSections,
  buildWeeklyReview,
  dateKeyInTimeZone,
  isMondayInTimeZone
} from '@/lib/domain/reminderDigest'
import { buildDigestEmail } from '@/lib/server/reminderDigest'

const now = new Date('2026-06-29T01:00:00.000Z') // Monday 09:00 in Asia/Shanghai

const items = [
  { id: 'overdue', title: '补交材料', date: '2026-06-28', status: 'active', priority: 'high' },
  { id: 'today', title: '今天的课', date: 'today', time: '10:00', status: 'active' },
  { id: 'tomorrow', title: '明天开会', date: '2026-06-30', status: 'active' },
  { id: 'upcoming', title: '周内提交', date: '2026-07-03', status: 'active' },
  { id: 'reading', title: '待读论文', date: 'reading', contentType: 'reading', status: 'active' },
  { id: 'done', title: '已经完成', date: '2026-06-27', status: 'done', updatedAt: '2026-06-28T08:00:00.000Z' }
]

describe('reminder digest planning', () => {
  it('classifies daily work in the configured Beijing calendar', () => {
    expect(dateKeyInTimeZone(now)).toBe('2026-06-29')
    expect(isMondayInTimeZone(now)).toBe(true)

    const sections = buildDailyDigestSections(items, now)
    expect(sections.overdue.map(item => item.id)).toEqual(['overdue'])
    expect(sections.today.map(item => item.id)).toEqual(['today'])
    expect(sections.tomorrow.map(item => item.id)).toEqual(['tomorrow'])
    expect(sections.upcoming.map(item => item.id)).toEqual(['upcoming'])
    expect(sections.reading.map(item => item.id)).toEqual(['reading'])
  })

  it('builds the Monday review from real completion timestamps', () => {
    const review = buildWeeklyReview(items, now)
    expect(review.completed.map(item => item.id)).toEqual(['done'])
    expect(review.nextSevenDays.map(item => item.id)).toEqual(['today', 'tomorrow', 'upcoming'])
  })

  it('escapes email content and does not repeat a reminder already present in the schedule', () => {
    const email = buildDigestEmail({
      items: [...items, { id: 'unsafe', title: '<script>喝水</script>', date: '2026-06-29', status: 'active' }],
      reminders: [
        { schedule_item_id: 'today', payload: { title: '今天的课' } },
        { schedule_item_id: 'external', payload: { title: '单独提醒' } }
      ],
      now,
      weeklyEnabled: true,
      siteUrl: 'https://law-tech.dev/'
    })

    expect(email.subject).toContain('2026-06-29')
    expect(email.text).toContain('看到我记得喝口水。')
    expect(email.html).toContain('&lt;script&gt;喝水&lt;/script&gt;')
    expect(email.html).not.toContain('<script>喝水</script>')
    expect(email.text.match(/今天的课/g)).toHaveLength(1)
    expect(email.text).toContain('单独提醒')
    expect(email.html).toContain('https://law-tech.dev/desk/today')
  })
})
