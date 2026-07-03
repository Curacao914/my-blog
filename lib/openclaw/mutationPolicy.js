import { classifyCommandText } from './commandProtocol'

const WRITE_ACTIONS = new Set([
  'create',
  'update',
  'complete',
  'mark_read',
  'cancel',
  'delete',
  'snooze'
])

const REFERENCE_ACTIONS = new Set([
  'update',
  'complete',
  'mark_read',
  'cancel',
  'delete',
  'snooze'
])

const URL_PATTERN = /https?:\/\/[^\s，。；、]+/i

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function compactTarget(value) {
  return clean(value)
    .replace(/[《》“”"'，。！？、,:：；;（）()【】[\]\s]/g, '')
    .replace(
      /^(?:我|已经|已|刚刚|刚才|都|全部|全都|一下|请|帮我|麻烦|把|将)+/,
      ''
    )
    .replace(
      /(?:标记为已读|标记已读|标记读过|读完了?|看完了?|完成了?|做完了?|办完了?|取消|删除|删掉|修改|改到|改成|调整到|延期|延后|提前|推迟|提醒我?|了|啦|吧|呢)+$/g,
      ''
    )
}

export function looksLikeAggregateStatus(input) {
  const text = clean(input)
  if (!text) return false
  if (/^(?:请|帮我|麻烦)?(?:把|将)/.test(text)) return false

  const hasCollection =
    /未读|待读|课程简报|课程笔记|待办|事项|日程|提醒|任务|阅读|消息|内容/.test(
      text
    )
  const terminalStatus =
    /(?:已|已经|都|全部|全都|目前|现在).{0,18}(?:读完|看完|完成|处理完|办完|结束|清空|取消|没有|为空)|(?:全部|所有).{0,18}(?:已|都)?(?:读完|看完|完成|处理完|办完)|(?:没有|暂无|没(?:有)?).{0,12}(?:待办|事项|日程|提醒|任务|未读|待读|课程简报)/.test(
      text
    )
  const systemStatus =
    /^(?:系统|同步|定时任务|每日提醒|课程任务).{0,30}(?:成功|完成|失败|结束|已处理)$/.test(
      text
    )

  return systemStatus || (hasCollection && terminalStatus)
}

export function hasNamedMutationTarget(input) {
  const text = clean(input)
  if (!text) return false
  if (/《[^》]{1,100}》/.test(text)) return true

  const objectFirst = text.match(
    /^(?:请|帮我|麻烦)?(?:把|将)(.+?)(?:标记|改|调整|完成|取消|删除|删掉|读完|看完|延期|延后|提前|推迟)/
  )
  if (objectFirst?.[1]) {
    const target = compactTarget(objectFirst[1])
    return Boolean(
      target &&
      !/^(?:时间|日期|提醒|事项|日程|这个|那个|这条|这篇|它)$/.test(target)
    )
  }

  const target = compactTarget(text)
  return Boolean(
    target.length >= 2 &&
    !/^(?:时间|日期|提醒|事项|日程|这个|那个|这条|这篇|它|不用|算了)$/.test(
      target
    )
  )
}

export function hasExplicitCreateIntent(input, classification = {}) {
  const text = clean(input)
  if (!text || looksLikeAggregateStatus(text)) return false
  if (/^(?:不|不用|无需|不必|没必要)(?:要|再|继续)?/.test(text)) return false
  if (URL_PATTERN.test(text)) return true

  if (
    /添加|新增|创建|保存|加入|记下|记一笔|帮我记|放进|列入|安排|设置|设个|提醒我|记得提醒|到时提醒|别忘了|存一下|收藏一下/.test(
      text
    )
  ) {
    return true
  }

  if (
    /(?:我|咱们)?(?:想|准备|计划|打算|要|需要|得)(?:去|做|完成|提交|处理|参加|开|写|读|看|买|联系|回复|整理|复习)/.test(
      text
    )
  ) {
    return true
  }

  const hasTemporal =
    /今天|今晚|明天|明早|明晚|后天|本周|下周|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[点:：]|[一二两三四五六七八九十]+点/.test(
      text
    )
  const hasEvent =
    /会议|开会|活动|面试|打卡|吃饭|提交|截止|作业|复习|考试|出发|航班|预约|缴费|付款|联系|回复|写作|整理|处理|参加|报名/.test(
      text
    )
  if (hasTemporal && hasEvent) return true

  if (
    /^(?:去)?(?:买|写|交|做|处理|联系|回复|准备|整理|复习|背|提交|打印|取|寄|预约|缴费|支付|打电话|发邮件|阅读|读(?!完)|看(?!完)).{1,50}$/.test(
      text
    )
  ) {
    return true
  }

  if (
    classification.domain === 'reading' &&
    /待读|稍后读|以后读|有空读|读一下|看一下|稍后看|以后看|有空看/.test(
      text
    )
  ) {
    return true
  }

  return false
}

function clarificationFor(action) {
  if (action === 'mark_read') {
    return '我知道你在说“读完”，但还不能确定具体是哪一份。请直接说标题，例如“《国际法笔记》读完了”，或先查询后选择。'
  }
  if (action === 'complete') {
    return '我知道你在说“完成”，但还不能确定具体是哪一项。请补充事项名称，或先查询后选择。'
  }
  if (action === 'cancel' || action === 'delete') {
    return '我还不能确定要处理哪一项。请补充事项名称，或先查询后选择。'
  }
  if (action === 'update' || action === 'snooze') {
    return '我知道你想修改安排，但还不能确定具体对象。请补充事项名称，或先查询后选择。'
  }
  return '我不确定你是想新建一项记录，还是只是在陈述情况。请加上“添加、提醒我、加入待读”等动作，或给出明确时间安排。'
}

export function assessOpenClawMutation({
  text,
  classification,
  referenceObject = null,
  pendingAction = null,
  confirmedPending = false
} = {}) {
  const normalizedText = clean(text)
  const command = classification || classifyCommandText(normalizedText)
  const action = command?.action || 'unknown'

  if (!WRITE_ACTIONS.has(action)) {
    return { decision: 'allow', reason: 'read_or_non_mutation', classification: command }
  }

  if (looksLikeAggregateStatus(normalizedText)) {
    return {
      decision: 'ignore',
      reason: 'aggregate_or_system_status',
      silent: true,
      classification: command
    }
  }

  if (action === 'create' && !hasExplicitCreateIntent(normalizedText, command)) {
    return {
      decision: 'clarify',
      reason: 'ambiguous_create_intent',
      replyText: clarificationFor(action),
      classification: command
    }
  }

  if (
    REFERENCE_ACTIONS.has(action) &&
    !referenceObject &&
    !pendingAction &&
    !confirmedPending &&
    !hasNamedMutationTarget(normalizedText)
  ) {
    return {
      decision: 'clarify',
      reason: 'missing_mutation_target',
      replyText: clarificationFor(action),
      classification: command
    }
  }

  return { decision: 'allow', reason: 'explicit_write_intent', classification: command }
}

export function assessCaptureIntent({ text, classification } = {}) {
  const command = classification || classifyCommandText(text)

  if (command?.action === 'unknown') {
    return {
      decision: 'clarify',
      reason: 'ambiguous_intent',
      replyText:
        '我不确定你是想记录一项内容，还是只是在陈述情况。请加上“添加、提醒我、加入待读”等动作，或给出明确的行动和时间。',
      classification: command
    }
  }

  if (
    ['noop', 'help', 'list', 'search', 'get', 'status', 'answer', 'select', 'confirm']
      .includes(command?.action)
  ) {
    return {
      decision: 'ignore',
      reason: 'non_capture_action',
      silent: true,
      classification: command
    }
  }

  return assessOpenClawMutation({
    text,
    classification: command
  })
}
