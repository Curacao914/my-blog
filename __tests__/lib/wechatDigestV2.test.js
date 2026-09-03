import { buildWechatScheduleDigest } from '@/lib/server/wechatDigest'
import { buildTodaySnapshot } from '@/lib/server/todaySnapshot'

describe('WeChat digest v2', () => {
  it('uses readable blocks instead of pipe-separated metadata', () => {
    const snapshot = buildTodaySnapshot({
      now: new Date('2026-07-02T01:00:00.000Z'),
      items: [{
        title: '做接机方案',
        date: '2026-06-30',
        time: '09:00',
        place: '办公室',
        contentType: 'action',
        status: 'active'
      }],
      courseBriefs: [{
        id: 'b1',
        title: '国际法 · 国家责任',
        mainLine: '归责与违法性',
        url: '/desk/briefs/a/b',
        read: false
      }]
    })
    const digest = buildWechatScheduleDigest({
      snapshot,
      siteUrl: 'https://law-tech.dev'
    })
    expect(digest.bodyText).toContain('1. 做接机方案')
    expect(digest.bodyText).toContain('6月30日 09:00 · 办公室 · 已逾期2天')
    expect(digest.bodyText).toContain('未读课程简报')
    expect(digest.bodyText).not.toContain('｜')
  })
})
