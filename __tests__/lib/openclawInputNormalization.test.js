import { classifyCommandText } from '@/lib/openclaw/commandProtocol'
import { normalizeOpenClawInput } from '@/lib/openclaw/inputNormalization'
import { resolveTemporalSemantics } from '@/lib/openclaw/temporalSemantics'

describe('OpenClaw input normalization hotfix', () => {
  const now = new Date('2026-07-02T14:51:00.000Z')

  it('turns relative reminders into an explicit Shanghai time', () => {
    const normalized = normalizeOpenClawInput('三分钟后提醒我喝水', { now })
    expect(normalized.text).toBe('2026年7月2日22:54提醒我喝水')

    const temporal = resolveTemporalSemantics(normalized.text, { now })
    expect(temporal.startsAt).toBe('2026-07-02T22:54:00+08:00')
    expect(temporal.reminders[0]).toMatchObject({
      mode: 'at',
      channel: 'wechat',
      leadMinutes: 0
    })
  })

  it('normalizes time-edit phrasing into a deterministic follow-up', () => {
    const normalized = normalizeOpenClawInput('时间改到晚上10:35', { now })
    expect(normalized.text).toBe('改到晚上10:35')
    expect(classifyCommandText(normalized.text)).toMatchObject({
      action: 'update',
      followUp: true
    })
  })

  it('repairs common voice-input variants for reading queries', () => {
    const reading = normalizeOpenClawInput('查看全部带读', { now })
    expect(reading.text).toBe('查看全部待读')
    expect(classifyCommandText(reading.text)).toMatchObject({
      domain: 'reading',
      action: 'list',
      scope: 'all'
    })

    const unread = normalizeOpenClawInput(
      '查看所有还没有读的课程简报',
      { now }
    )
    expect(unread.text).toBe('查看未读课程简报')
    expect(classifyCommandText(unread.text)).toMatchObject({
      domain: 'course',
      action: 'list',
      scope: 'unread'
    })
  })
})
