import { buildWechatScheduleDigest } from '@/lib/server/wechatDigest'

describe('WeChat daily digest', () => {
  test('deduplicates readings and emits compact Markdown links', () => {
    const digest = buildWechatScheduleDigest({
      now: new Date('2026-07-01T01:00:00.000Z'),
      items: [
        {
          title: '刚刚，Claude 5局部解禁！',
          date: 'reading',
          contentType: 'reading',
          links: ['https://example.com/claude']
        },
        {
          title: '刚刚，Claude 5局部解禁！',
          date: 'reading',
          contentType: 'reading',
          links: ['https://example.com/duplicate']
        },
        {
          title: '公众号文章',
          date: 'reading',
          contentType: 'reading'
        },
        {
          title: '写规划',
          date: '2026-06-30',
          time: '16:00',
          contentType: 'action'
        }
      ],
      siteUrl: 'https://law-tech.dev'
    })

    expect(digest.bodyText).toContain(
      '[打开今日工作台](https://law-tech.dev/desk/today)'
    )
    expect(digest.bodyText).toContain(
      '[刚刚，Claude 5局部解禁！](https://example.com/claude)'
    )
    expect(
      digest.bodyText.match(/Claude 5局部解禁/g)
    ).toHaveLength(1)
    expect(digest.bodyText).not.toContain('· reading')
    expect(digest.bodyText).not.toContain('公众号文章')
    expect(digest.bodyText).toContain('6月30日 16:00')
  })
})
