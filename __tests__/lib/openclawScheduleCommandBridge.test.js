import {
  applyResolvedScheduleCommand,
  temporalFromScheduleItem
} from '@/lib/openclaw/scheduleCommandBridge'

describe('OpenClaw schedule command bridge', () => {
  it('overlays deterministic time fields after model parsing', () => {
    const parsed = applyResolvedScheduleCommand({
      mode: 'append',
      items: [{ title: '面试', contentType: 'action', date: 'none', time: '' }]
    }, {
      protocol: { v: 1, command: { domain: 'schedule', action: 'create' } },
      temporal: {
        timezone: 'Asia/Shanghai',
        startsAt: '2026-07-03T09:00:00+08:00'
      },
      reminders: [{
        enabled: true,
        mode: 'before',
        leadMinutes: 60,
        remindAt: '2026-07-03T00:00:00.000Z',
        channel: 'wechat'
      }]
    })

    expect(parsed.items[0]).toMatchObject({
      date: '2026-07-03',
      time: '09:00',
      reminder: {
        mode: 'before',
        leadMinutes: 60,
        channel: 'wechat'
      }
    })
    expect(parsed.items[0].aiTrace).toMatchObject({
      temporal: { startsAt: '2026-07-03T09:00:00+08:00' },
      commandProtocol: { v: 1 }
    })
  })

  it('forces a short follow-up onto the referenced object instead of a random item', () => {
    const parsed = applyResolvedScheduleCommand({
      mode: 'append',
      items: [{ title: '提前半小时提醒我', contentType: 'action' }]
    }, {
      protocol: {
        v: 1,
        command: { domain: 'schedule', action: 'update' },
        conversation: {
          mode: 'follow_up',
          referencedObjectId: 'target-1'
        }
      },
      context: {
        originalCommand: '提前半小时提醒我',
        followUp: true
      },
      temporal: {
        timezone: 'Asia/Shanghai',
        startsAt: '2026-07-03T15:00:00+08:00'
      },
      reminders: [{
        enabled: true,
        mode: 'before',
        leadMinutes: 30,
        remindAt: '2026-07-03T06:30:00.000Z',
        channel: 'wechat'
      }]
    }, [
      { id: 'other-1', title: '做接机方案', date: '2026-06-30', time: '09:00' },
      { id: 'target-1', title: '开会', date: '2026-07-03', time: '15:00' }
    ])

    expect(parsed.mode).toBe('replace')
    expect(parsed.items[0]).toMatchObject({
      id: 'target-1',
      title: '开会',
      date: '2026-07-03',
      time: '15:00',
      reminder: {
        leadMinutes: 30
      }
    })
  })

  it('keeps deadline metadata while using the due time for the current schedule UI', () => {
    const parsed = applyResolvedScheduleCommand({
      mode: 'append',
      items: [{ title: '提交论文', contentType: 'action', date: 'none', time: '' }]
    }, {
      temporal: {
        timezone: 'Asia/Shanghai',
        dueAt: '2026-07-03T17:00:00+08:00'
      }
    })
    expect(parsed.items[0].date).toBe('2026-07-03')
    expect(parsed.items[0].time).toBe('17:00')
    expect(parsed.items[0].temporal.dueAt).toBe('2026-07-03T17:00:00+08:00')
  })

  it('restores the stored temporal object for the next conversational turn', () => {
    expect(temporalFromScheduleItem({
      date: '2026-07-03',
      time: '09:00',
      temporal: { startsAt: '2026-07-03T09:00:00+08:00' },
      reminders: [{ leadMinutes: 60 }]
    })).toMatchObject({
      startsAt: '2026-07-03T09:00:00+08:00',
      date: '2026-07-03',
      time: '09:00',
      reminders: [{ leadMinutes: 60 }]
    })
  })
})
