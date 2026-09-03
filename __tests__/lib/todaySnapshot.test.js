import { buildTodaySnapshot } from '@/lib/server/todaySnapshot'

describe('today snapshot', () => {
  it('uses one aggregation for schedule, reading and unread course briefs', () => {
    const snapshot = buildTodaySnapshot({
      now: new Date('2026-07-02T01:00:00.000Z'),
      items: [
        {
          id: 'overdue',
          title: '补交材料',
          date: '2026-07-01',
          contentType: 'action',
          status: 'active'
        },
        {
          id: 'today',
          title: '开会',
          date: '2026-07-02',
          time: '15:00',
          contentType: 'action',
          status: 'active'
        },
        {
          id: 'reading',
          title: '一篇文章',
          date: 'reading',
          contentType: 'reading',
          status: 'active'
        }
      ],
      courseBriefs: [
        { id: 'b1', title: '物权法 · 第一课', read: false, updatedAt: '2026-07-02T00:00:00Z' },
        { id: 'b2', title: '国际法 · 第一课', read: true, updatedAt: '2026-07-02T00:00:00Z' }
      ]
    })

    expect(snapshot.counts).toMatchObject({
      overdue: 1,
      today: 1,
      reading: 1,
      unreadCourseBriefs: 1
    })
    expect(snapshot.unreadCourseBriefs.map(item => item.id)).toEqual(['b1'])
  })
})
