import { classifyCommandText } from '@/lib/openclaw/commandProtocol'
import {
  assessCaptureIntent,
  assessOpenClawMutation,
  hasExplicitCreateIntent,
  hasNamedMutationTarget,
  looksLikeAggregateStatus
} from '@/lib/openclaw/mutationPolicy'

describe('OpenClaw semantic mutation policy', () => {
  it('silently ignores aggregate and system status statements', () => {
    for (const text of [
      '未读课程简报已全部读完',
      '今天没有待办了',
      '系统同步完成'
    ]) {
      expect(looksLikeAggregateStatus(text)).toBe(true)
      expect(assessCaptureIntent({ text })).toMatchObject({
        decision: 'ignore',
        silent: true
      })
    }
  })

  it('accepts flexible but explicit create phrasing', () => {
    for (const text of [
      '明天下午三点和张老师开会',
      '帮我记一下周五交作业',
      '买牛奶',
      'https://mp.weixin.qq.com/s/example'
    ]) {
      const classification = classifyCommandText(text)
      expect(classification.action).toBe('create')
      expect(hasExplicitCreateIntent(text, classification)).toBe(true)
      expect(assessCaptureIntent({ text })).toMatchObject({
        decision: 'allow'
      })
    }
  })

  it('allows a named mutation without forcing a prior selection', () => {
    for (const text of [
      '《国际法笔记》读完了',
      '国际法笔记读完了',
      '把周五会议改到下午三点'
    ]) {
      expect(hasNamedMutationTarget(text)).toBe(true)
      expect(assessCaptureIntent({ text })).toMatchObject({
        decision: 'allow'
      })
    }
  })

  it('clarifies ambiguous writes instead of inventing records', () => {
    expect(assessCaptureIntent({ text: '我喜欢读论文' })).not.toMatchObject({
      decision: 'allow'
    })

    expect(
      assessOpenClawMutation({
        text: '读完了',
        classification: classifyCommandText('读完了')
      })
    ).toMatchObject({
      decision: 'clarify',
      reason: 'missing_mutation_target'
    })
  })

  it('uses an existing conversation reference when available', () => {
    expect(
      assessOpenClawMutation({
        text: '读完了',
        classification: classifyCommandText('读完了'),
        referenceObject: { id: 'brief-1', title: '国际法简报' }
      })
    ).toMatchObject({
      decision: 'allow'
    })
  })
})
