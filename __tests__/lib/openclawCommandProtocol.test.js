import {
  buildSparseCommand,
  classifyCommandText,
  compactCommandValue,
  isFollowUpCommand
} from '@/lib/openclaw/commandProtocol'

describe('OpenClaw command protocol v1', () => {
  it('keeps simple commands sparse instead of emitting empty dimensions', () => {
    const command = buildSparseCommand({ text: '查看今天的基本状况' })
    expect(command).toEqual({
      v: 1,
      command: {
        domain: 'schedule',
        action: 'list',
        scope: 'today'
      }
    })
    expect(JSON.stringify(command)).not.toContain('null')
  })

  it('classifies current and future workspace capabilities consistently', () => {
    expect(classifyCommandText('数据库里有没有非法采矿的笔记')).toMatchObject({
      domain: 'content',
      action: 'search',
      operation: 'read'
    })
    expect(classifyCommandText('过去30天AI用了多少钱')).toMatchObject({
      domain: 'usage',
      action: 'list',
      operation: 'read'
    })
    expect(classifyCommandText('现在网站上有哪些用户')).toMatchObject({
      domain: 'workspace',
      action: 'list',
      operation: 'read'
    })
  })

  it('requires explicit confirmation for destructive operations', () => {
    expect(classifyCommandText('删除刚才那个事项')).toMatchObject({
      action: 'delete',
      operation: 'write',
      confirmation: 'explicit',
      followUp: true
    })
  })

  it('treats short reminder modifiers as updates to the last object', () => {
    expect(classifyCommandText('提前一小时提醒')).toMatchObject({
      domain: 'schedule',
      action: 'update',
      followUp: true
    })
    expect(classifyCommandText('明天上午9点面试，提前一小时提醒我')).toMatchObject({
      domain: 'schedule',
      action: 'create'
    })
  })

  it('recognizes transactional selection and confirmation language', () => {
    expect(classifyCommandText('第二个')).toMatchObject({ domain: 'conversation', action: 'select' })
    expect(classifyCommandText('确认')).toMatchObject({ domain: 'conversation', action: 'confirm' })
    expect(isFollowUpCommand('第二个')).toBe(true)
  })

  it('removes only absent values and preserves false and zero', () => {
    expect(compactCommandValue({ a: '', b: null, c: false, d: 0, e: [], f: {} })).toEqual({
      c: false,
      d: 0
    })
  })  // BEGIN LAWTECH INTENT REGRESSION 20260712
  it('keeps bug descriptions containing delete language inside a reminder create command', () => {
    const text = '明天上午十点提醒我阅读箱移动很慢，删除好像卡很久都不删除，还有设置的侧边栏太大'
    expect(classifyCommandText(text)).toMatchObject({
      domain: 'schedule',
      action: 'create',
      operation: 'write'
    })
  })

  it('treats adding bug text to the previous schedule as an update, not a delete', () => {
    const text = '还有前面识别错误命令的bug。把内容中的删除当做了删除命令。说明意图识别还需要改进，也加进刚刚的日程'
    expect(classifyCommandText(text)).toMatchObject({
      domain: 'schedule',
      action: 'update',
      operation: 'write',
      followUp: true
    })
  })

  it('still classifies real destructive commands as delete operations', () => {
    expect(classifyCommandText('删除刚才那个事项')).toMatchObject({
      action: 'delete',
      confirmation: 'explicit'
    })
    expect(classifyCommandText('把周五会议删除')).toMatchObject({
      action: 'delete',
      confirmation: 'explicit'
    })
  })
  // END LAWTECH INTENT REGRESSION 20260712


})
