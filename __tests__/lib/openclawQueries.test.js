import { buildOpenClawQueryResult } from '@/lib/server/openclawQueries'
import { buildTodaySnapshot } from '@/lib/server/todaySnapshot'

describe('OpenClaw workbench queries', () => {
  const snapshot = buildTodaySnapshot({
    now: new Date('2026-07-02T01:00:00.000Z'),
    items: [
      {
        id: 'task-1',
        title: '写规划',
        date: '2026-06-30',
        time: '16:00',
        contentType: 'action',
        status: 'active'
      },
      {
        id: 'reading-1',
        title: 'Token不经济',
        date: 'reading',
        contentType: 'reading',
        status: 'active',
        links: [{ url: 'https://example.com/token' }]
      }
    ],
    courseBriefs: [{
      id: 'job-1:lesson-1',
      type: 'course_brief',
      jobId: 'job-1',
      lessonKey: 'lesson-1',
      fingerprint: 'abc',
      title: '物权法 · 善意取得',
      mainLine: '交易安全与权利保护',
      updatedAt: '2026-07-02T01:00:00Z',
      url: '/desk/briefs/job-1/lesson-1',
      read: false
    }]
  })

  it('returns a useful today overview instead of a recognition placeholder', () => {
    const result = buildOpenClawQueryResult({
      classification: {
        domain: 'schedule',
        action: 'list',
        scope: 'today'
      },
      snapshot,
      siteUrl: 'https://law-tech.dev'
    })
    expect(result.replyText).toContain('今日概况')
    expect(result.replyText).toContain('写规划')
    expect(result.replyText).toContain('Token不经济')
    expect(result.replyText).toContain('物权法 · 善意取得')
    expect(result.candidates.length).toBeGreaterThan(0)
  })

  it('returns unread course briefs as selectable candidates', () => {
    const result = buildOpenClawQueryResult({
      classification: {
        domain: 'course',
        action: 'list',
        scope: 'unread'
      },
      snapshot,
      siteUrl: 'https://law-tech.dev'
    })
    expect(result.candidates[0]).toMatchObject({
      type: 'course_brief',
      jobId: 'job-1',
      lessonKey: 'lesson-1'
    })
    expect(result.replyText).toContain('回复序号')
  })
})
