import { classifyCommandText } from '@/lib/openclaw/commandProtocol'
import {
  assessCaptureIntent,
  assessOpenClawMutation,
  hasExplicitCreateIntent,
  hasExplicitReadingIntent,
  hasNamedMutationTarget,
  looksLikeAggregateStatus,
  looksLikeNegativeInstruction
} from '@/lib/openclaw/mutationPolicy'

describe('OpenClaw semantic mutation policy', () => {
  it.each([
    '未读课程简报已全部读完',
    '所有课程简报都看完了',
    '今天没有待办了',
    '目前没有未读课程简报',
    '系统同步完成',
    '每日提醒发送失败'
  ])('silently ignores aggregate or system status: %s', text => {
    expect(looksLikeAggregateStatus(text)).toBe(true)
    expect(assessCaptureIntent({ text })).toMatchObject({
      decision: 'ignore',
      silent: true
    })
  })

  it.each([
    '明天下午三点和张老师开会',
    '帮我记一下周五交作业',
    '买牛奶',
    '有空读这篇论文',
    '别忘了提醒我周五交材料',
    'https://mp.weixin.qq.com/s/example'
  ])('accepts flexible but explicit create phrasing: %s', text => {
    const classification = classifyCommandText(text)
    expect(classification.action).toBe('create')
    expect(hasExplicitCreateIntent(text, classification)).toBe(true)
    expect(assessCaptureIntent({ text })).toMatchObject({
      decision: 'allow'
    })
  })

  it.each([
    '《国际法笔记》读完了',
    '国际法笔记读完了',
    '把周五会议改到下午三点',
    '取消周五会议',
    '删除重复阅读项'
  ])('allows a named mutation without forcing a prior selection: %s', text => {
    expect(hasNamedMutationTarget(text)).toBe(true)
    expect(assessCaptureIntent({ text })).toMatchObject({
      decision: 'allow'
    })
  })

  it.each([
    '不要提醒我周五交作业',
    '这条不用保存',
    '我不需要添加这个',
    '别保存这句话'
  ])('silently ignores negative instructions: %s', text => {
    expect(looksLikeNegativeInstruction(text)).toBe(true)
    expect(assessCaptureIntent({ text })).toMatchObject({
      decision: 'ignore',
      reason: 'negative_instruction',
      silent: true
    })
  })

  it('does not treat ordinary preferences as database writes', () => {
    expect(assessCaptureIntent({ text: '我喜欢读论文' })).toMatchObject({
      decision: 'ignore',
      reason: 'non_actionable_statement',
      silent: true
    })
  })

  it.each([
    '读完了',
    '改到明天',
    '时间改到',
    '取消'
  ])('clarifies a mutation without a target: %s', text => {
    expect(
      assessOpenClawMutation({
        text,
        classification: classifyCommandText(text)
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

  it('preserves long pasted content for model-level interpretation', () => {
    const text = `这是一段准备稍后整理的材料。${'法学研究材料与论证线索。'.repeat(20)}`
    expect(text.length).toBeGreaterThan(120)
    expect(assessCaptureIntent({ text })).toMatchObject({
      decision: 'allow',
      reason: 'rich_content_for_model'
    })
  })

  it('rejects hostile repeated input before truncation can change meaning', () => {
    const text = `${'提前'.repeat(5000)}我喜欢读论文`
    const result = assessCaptureIntent({ text })
    expect(result).toMatchObject({
      decision: 'clarify',
      reason: 'input_too_long'
    })
  })

  it('does not require the classifier to call a reading request reading-domain', () => {
    const text = '有空读这篇论文'
    const classification = classifyCommandText(text)
    expect(classification).toMatchObject({
      action: 'create',
      domain: 'content'
    })
    expect(hasExplicitCreateIntent(text, classification)).toBe(true)
  })

  it('keeps reading intent separate from reading-status statements', () => {
    expect(hasExplicitReadingIntent('有空读这篇论文')).toBe(true)
    expect(hasExplicitReadingIntent('未读课程简报已全部读完')).toBe(false)
  })
})
