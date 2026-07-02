import { resolveTemporalSemantics } from '@/lib/openclaw/temporalSemantics'

describe('OpenClaw temporal semantics', () => {
  it('resolves a bare same-day hour to the next plausible clock time', () => {
    const result = resolveTemporalSemantics('今天6点提醒我吃饭', {
      now: new Date('2026-07-02T07:00:00.000Z')
    })
    expect(result.startsAt).toBe('2026-07-02T18:00:00+08:00')
    expect(result.reminders[0]).toMatchObject({
      mode: 'at',
      channel: 'wechat',
      leadMinutes: 0,
      remindAt: '2026-07-02T10:00:00.000Z'
    })
  })

  it('asks for clarification instead of silently rolling an explicit past time', () => {
    const result = resolveTemporalSemantics('今天6点提醒我吃饭', {
      now: new Date('2026-07-02T12:00:00.000Z')
    })
    expect(result.needsClarification).toBe(true)
    expect(result.clarificationText).toContain('已经过去')
  })

  it('treats early-morning 明天早上 as the current waking day', () => {
    const result = resolveTemporalSemantics('明天早上9点提醒我去面试', {
      now: new Date('2026-07-02T16:03:00.000Z')
    })
    expect(result.startsAt).toBe('2026-07-03T09:00:00+08:00')
    expect(result.resolution).toContain('night-rollover')
  })

  it('does not apply the waking-day rule to 明天下午', () => {
    const result = resolveTemporalSemantics('明天下午3点提醒我开会', {
      now: new Date('2026-07-02T16:03:00.000Z')
    })
    expect(result.startsAt).toBe('2026-07-04T15:00:00+08:00')
  })

  it('separates task time from one or more advance reminders', () => {
    const result = resolveTemporalSemantics('明天上午9点去面试，提前一小时提醒我', {
      now: new Date('2026-07-02T07:00:00.000Z')
    })
    expect(result.startsAt).toBe('2026-07-03T09:00:00+08:00')
    expect(result.reminders[0]).toMatchObject({
      mode: 'before',
      leadMinutes: 60,
      remindAt: '2026-07-03T00:00:00.000Z'
    })

    const multiple = resolveTemporalSemantics('明天上午9点开会，提前一天和一小时提醒我', {
      now: new Date('2026-07-02T07:00:00.000Z')
    })
    expect(multiple.reminders.map(item => item.leadMinutes)).toEqual([1440, 60])
  })

  it('uses the previous object time for a short follow-up reminder command', () => {
    const result = resolveTemporalSemantics('提前一小时提醒', {
      now: new Date('2026-07-02T07:00:00.000Z'),
      baseTemporal: { startsAt: '2026-07-03T09:00:00+08:00' }
    })
    expect(result.startsAt).toBe('2026-07-03T09:00:00+08:00')
    expect(result.resolution).toContain('conversation-base')
    expect(result.reminders[0].remindAt).toBe('2026-07-03T00:00:00.000Z')
  })

  it('supports a separate absolute reminder time', () => {
    const result = resolveTemporalSemantics('明天上午9点面试，今晚10点提醒我准备材料', {
      now: new Date('2026-07-02T07:00:00.000Z')
    })
    expect(result.startsAt).toBe('2026-07-03T09:00:00+08:00')
    expect(result.reminders[0]).toMatchObject({
      mode: 'absolute',
      remindAt: '2026-07-02T14:00:00.000Z'
    })
  })

  it('supports recurrence limits, deadlines and duration metadata', () => {
    const recurring = resolveTemporalSemantics('每周一上午9点复盘，共重复三次，直到7月31日为止', {
      now: new Date('2026-07-02T07:00:00.000Z')
    })
    expect(recurring.recurrence).toMatchObject({
      rule: 'weekly',
      byWeekday: [1],
      count: 3,
      until: '2026-07-31'
    })

    const deadline = resolveTemporalSemantics('明天下午5点前提交论文，提前一小时提醒我', {
      now: new Date('2026-07-02T07:00:00.000Z')
    })
    expect(deadline.dueAt).toBe('2026-07-03T17:00:00+08:00')
    expect(deadline.startsAt).toBeUndefined()

    const duration = resolveTemporalSemantics('明天下午3点开会，持续两小时', {
      now: new Date('2026-07-02T07:00:00.000Z')
    })
    expect(duration.durationMinutes).toBe(120)
    expect(duration.endsAt).toBe('2026-07-03T17:00:00+08:00')
  })
})
