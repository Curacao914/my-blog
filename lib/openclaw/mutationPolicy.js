import { classifyCommandText } from './commandProtocol'

const MAX_INTENT_INPUT_LENGTH = 4000

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

const COLLECTION_WORDS = [
  '未读',
  '待读',
  '课程简报',
  '课程笔记',
  '待办',
  '事项',
  '日程',
  '提醒',
  '任务',
  '阅读',
  '消息',
  '内容'
]

const COMPLETION_WORDS = [
  '标记为已读',
  '标记已读',
  '标记读过',
  '读完',
  '看完',
  '完成',
  '处理完',
  '办完',
  '结束',
  '清空',
  '取消'
]

const QUANTIFIER_WORDS = [
  '全部',
  '所有',
  '全都',
  '都已经',
  '已经都',
  '都'
]

const ABSENCE_WORDS = [
  '目前没有',
  '现在没有',
  '已经没有',
  '没有',
  '暂无',
  '为空'
]

const SYSTEM_PREFIXES = [
  '系统',
  '同步',
  '定时任务',
  '每日提醒',
  '课程任务',
  '机器人',
  'ClawBot'
]

const STATUS_ENDINGS = [
  '成功',
  '完成',
  '失败',
  '结束',
  '已处理',
  '为空',
  '无待办',
  '无未读'
]

const POLITE_PREFIXES = [
  '麻烦你帮我',
  '请你帮我',
  '能不能帮我',
  '可以帮我',
  '麻烦帮我',
  '请帮我',
  '能帮我',
  '帮我',
  '帮忙',
  '麻烦你',
  '请你',
  '麻烦',
  '请'
]

const TARGET_PREFIXES = [
  '我已经',
  '我刚刚',
  '我刚才',
  '已经',
  '刚刚',
  '刚才',
  '全部',
  '全都',
  '都',
  '把',
  '将',
  '我'
]

const TARGET_SUFFIXES = [
  '标记为已读',
  '标记已读',
  '标记读过',
  '调整到',
  '读完了',
  '看完了',
  '完成了',
  '做完了',
  '办完了',
  '改成',
  '改到',
  '延期',
  '延后',
  '提前',
  '推迟',
  '取消',
  '删除',
  '删掉',
  '修改',
  '提醒我',
  '提醒',
  '读完',
  '看完',
  '完成',
  '做完',
  '办完',
  '了',
  '啦',
  '吧',
  '呢'
]

const MUTATION_MARKERS = [
  '标记为已读',
  '标记已读',
  '标记读过',
  '调整到',
  '改成',
  '改到',
  '修改',
  '延期',
  '延后',
  '提前',
  '推迟',
  '完成',
  '取消',
  '删除',
  '删掉',
  '读完',
  '看完'
]

const GENERIC_TARGETS = new Set([
  '',
  '时间',
  '日期',
  '提醒',
  '提醒一下',
  '提醒我一下',
  '改一下',
  '修改一下',
  '调整一下',
  '事项',
  '日程',
  '这个',
  '那个',
  '这条',
  '这篇',
  '它',
  '不用',
  '算了',
  '改到明天',
  '改成明天',
  '调整到明天'
])

const EXPLICIT_CREATE_WORDS = [
  '添加',
  '新增',
  '创建',
  '保存',
  '加入',
  '记下',
  '记一笔',
  '帮我记',
  '放进',
  '列入',
  '安排',
  '设置',
  '设个',
  '提醒我',
  '记得提醒',
  '到时提醒',
  '别忘了',
  '不要忘了',
  '存一下',
  '收藏一下'
]

const CREATE_REQUEST_PREFIXES = [
  '不要忘了',
  '别忘了',
  '记得提醒',
  '到时提醒',
  '收藏一下',
  '存一下',
  '提醒我',
  '记一笔',
  '添加',
  '新增',
  '创建',
  '保存',
  '加入',
  '记下',
  '放进',
  '列入',
  '安排',
  '设置',
  '设个',
  '提醒',
  '收藏',
  '记'
]

const CREATE_REQUEST_FILLERS = [
  '我一下',
  '一下',
  '一个',
  '一项',
  '我',
  '下'
]

const GENERIC_CREATE_DETAILS = new Set([
  '',
  '这个',
  '那个',
  '这条',
  '这篇',
  '一项',
  '一个',
  '事项',
  '日程',
  '提醒',
  '阅读',
  '内容'
])

const PLAN_WORDS = [
  '我想去',
  '我想做',
  '我想完成',
  '我想提交',
  '我想处理',
  '我想参加',
  '我想开',
  '我想写',
  '我想读',
  '我想看',
  '我想买',
  '我想联系',
  '我想回复',
  '我想整理',
  '我想复习',
  '准备去',
  '准备做',
  '准备完成',
  '准备提交',
  '准备参加',
  '计划去',
  '计划做',
  '计划完成',
  '计划提交',
  '计划参加',
  '打算去',
  '打算做',
  '打算完成',
  '打算提交',
  '打算参加',
  '需要去',
  '需要做',
  '需要完成',
  '需要提交',
  '需要处理',
  '需要参加',
  '需要联系',
  '需要回复',
  '得去',
  '得做',
  '得完成',
  '得提交',
  '得处理'
]

const TEMPORAL_WORDS = [
  '今天',
  '今晚',
  '明天',
  '明早',
  '明晚',
  '后天',
  '本周',
  '下周',
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
  '周日',
  '周天',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
  '星期日',
  '星期天'
]

const EVENT_WORDS = [
  '会议',
  '开会',
  '活动',
  '面试',
  '打卡',
  '吃饭',
  '提交',
  '截止',
  '作业',
  '复习',
  '考试',
  '出发',
  '航班',
  '预约',
  '缴费',
  '付款',
  '联系',
  '回复',
  '写作',
  '整理',
  '处理',
  '参加',
  '报名'
]

const STANDALONE_ACTION_PREFIXES = [
  '打电话',
  '发邮件',
  '联系',
  '回复',
  '准备',
  '整理',
  '复习',
  '提交',
  '打印',
  '预约',
  '缴费',
  '支付',
  '处理',
  '阅读',
  '买',
  '写',
  '交',
  '做',
  '背',
  '取',
  '寄',
  '读',
  '看'
]

const READING_INTENT_WORDS = [
  '加入阅读',
  '加入待读',
  '添加阅读',
  '添加待读',
  '保存到阅读',
  '保存到待读',
  '放进阅读',
  '放进待读',
  '列入阅读',
  '列入待读',
  '待读',
  '稍后读',
  '以后读',
  '有空读',
  '读一下',
  '阅读一下',
  '看一下',
  '稍后看',
  '以后看',
  '有空看',
  '读这篇',
  '看这篇',
  '阅读文章',
  '阅读论文',
  '阅读材料'
]

const NEGATIVE_PREFIXES = [
  '我不需要',
  '我不想',
  '不需要',
  '没必要',
  '不要',
  '不用',
  '无需',
  '不必',
  '别再',
  '别'
]

const NEGATIVE_PHRASES = [
  '不用保存',
  '不需要保存',
  '不要保存',
  '别保存',
  '不用提醒',
  '不需要提醒',
  '不要提醒',
  '别提醒',
  '不用添加',
  '不需要添加',
  '不要添加',
  '别添加'
]

const PUNCTUATION = new Set([
  '《', '》', '“', '”', '"', "'",
  '，', '。', '！', '？', '、', ',', ':', '：', '；', ';',
  '（', '）', '(', ')', '【', '】', '[', ']', ' '
])

function clean(value) {
  return String(value || '')
    .slice(0, MAX_INTENT_INPUT_LENGTH)
    .replace(/\s+/g, ' ')
    .trim()
}

function containsAny(text, values) {
  return values.some(value => text.includes(value))
}

function startsWithAny(text, values) {
  return values.some(value => text.startsWith(value))
}

function endsWithAny(text, values) {
  return values.some(value => text.endsWith(value))
}

function stripLeadingValues(value, values) {
  let result = value
  for (let pass = 0; pass < 8; pass += 1) {
    const prefix = values.find(item => result.startsWith(item))
    if (!prefix) break
    result = result.slice(prefix.length).trim()
  }
  return result
}

function stripTrailingValues(value, values) {
  let result = value
  for (let pass = 0; pass < 8; pass += 1) {
    const suffix = values.find(item => result.endsWith(item))
    if (!suffix) break
    result = result.slice(0, -suffix.length).trim()
  }
  return result
}

function withoutPunctuation(value) {
  let result = ''
  for (const char of value) {
    if (!PUNCTUATION.has(char)) result += char
  }
  return result
}

function earliestMarkerIndex(text, markers) {
  let result = -1
  for (const marker of markers) {
    const index = text.indexOf(marker)
    if (index > 0 && (result < 0 || index < result)) result = index
  }
  return result
}

function hasUrl(text) {
  return text.includes('https://') || text.includes('http://')
}

function hasClockExpression(text) {
  const arabicDigits = '0123456789'
  const chineseDigits = '一二两三四五六七八九十'

  for (let index = 0; index < text.length; index += 1) {
    if (arabicDigits.includes(text[index])) {
      let cursor = index
      while (
        cursor < text.length &&
        arabicDigits.includes(text[cursor]) &&
        cursor - index < 4
      ) {
        cursor += 1
      }
      if (['点', ':', '：'].includes(text[cursor])) return true
    }

    if (chineseDigits.includes(text[index])) {
      let cursor = index
      while (
        cursor < text.length &&
        chineseDigits.includes(text[cursor]) &&
        cursor - index < 4
      ) {
        cursor += 1
      }
      if (text[cursor] === '点') return true
    }
  }

  return false
}

function stripPolitePrefix(text) {
  return stripLeadingValues(text, POLITE_PREFIXES)
}

function createRequestDetails(input) {
  const actionable = stripPolitePrefix(clean(input))

  for (const prefix of CREATE_REQUEST_PREFIXES) {
    if (!actionable.startsWith(prefix)) continue

    const rawDetails = actionable
      .slice(prefix.length)
      .trim()
    const details = withoutPunctuation(
      stripLeadingValues(
        rawDetails,
        CREATE_REQUEST_FILLERS
      )
    )

    return {
      matched: true,
      details,
      hasDetails: !GENERIC_CREATE_DETAILS.has(details)
    }
  }

  return {
    matched: false,
    details: '',
    hasDetails: false
  }
}

function classificationAsCreate(command = {}) {
  return {
    ...command,
    action: 'create',
    operation: 'write',
    confirmation: 'none'
  }
}

function compactTarget(value) {
  const compact = withoutPunctuation(clean(value))
  const withoutPrefixes = stripLeadingValues(compact, TARGET_PREFIXES)
  return stripTrailingValues(withoutPrefixes, TARGET_SUFFIXES)
}

function hasBookTitle(text) {
  const start = text.indexOf('《')
  if (start < 0) return false
  const end = text.indexOf('》', start + 1)
  return end > start + 1 && end - start <= 101
}

export function looksLikeNegativeInstruction(input) {
  const text = stripPolitePrefix(clean(input))
  if (!text) return false
  if (startsWithAny(text, ['别忘了', '不要忘了'])) return false
  return startsWithAny(text, NEGATIVE_PREFIXES) ||
    containsAny(text, NEGATIVE_PHRASES)
}

export function looksLikeAggregateStatus(input) {
  const text = clean(input)
  if (!text) return false

  const actionable = stripPolitePrefix(text)
  if (startsWithAny(actionable, ['把', '将'])) return false

  const hasCollection = containsAny(text, COLLECTION_WORDS)
  const hasCompletion = containsAny(text, COMPLETION_WORDS)
  const hasQuantifier = containsAny(text, QUANTIFIER_WORDS)
  const hasAbsence = containsAny(text, ABSENCE_WORDS)
  const hasStatusMarker =
    text.includes('已') ||
    text.includes('已经') ||
    text.includes('目前') ||
    text.includes('现在') ||
    text.endsWith('了')

  const systemStatus =
    startsWithAny(text, SYSTEM_PREFIXES) &&
    (hasCompletion || endsWithAny(text, STATUS_ENDINGS))

  return systemStatus ||
    (hasCollection && (
      hasAbsence ||
      (hasCompletion && (hasQuantifier || hasStatusMarker))
    ))
}

export function hasNamedMutationTarget(input) {
  const text = clean(input)
  if (!text || looksLikeAggregateStatus(text)) return false
  if (hasBookTitle(text)) return true

  const actionable = stripPolitePrefix(text)
  if (startsWithAny(actionable, ['改到', '改成', '调整到', '延期到', '延后到', '提前到', '推迟到'])) {
    return false
  }

  if (startsWithAny(actionable, ['把', '将'])) {
    const body = actionable.slice(1).trim()
    const markerIndex = earliestMarkerIndex(body, MUTATION_MARKERS)
    if (markerIndex < 1) return false
    return !GENERIC_TARGETS.has(compactTarget(body.slice(0, markerIndex)))
  }

  return !GENERIC_TARGETS.has(compactTarget(actionable))
}

function isStandaloneActionPhrase(text) {
  const value = text.startsWith('去') ? text.slice(1) : text
  if (value.length < 2 || value.length > 80) return false
  if (startsWithAny(value, ['读完', '看完', '做完', '办完', '完成'])) return false
  return startsWithAny(value, STANDALONE_ACTION_PREFIXES)
}

export function hasExplicitReadingIntent(input) {
  const text = clean(input)
  if (!text || looksLikeAggregateStatus(text) || looksLikeNegativeInstruction(text)) {
    return false
  }
  return hasUrl(text) || containsAny(text, READING_INTENT_WORDS)
}

export function hasExplicitCreateIntent(input, classification = {}) {
  const text = clean(input)
  if (!text || looksLikeAggregateStatus(text) || looksLikeNegativeInstruction(text)) {
    return false
  }

  const createRequest = createRequestDetails(text)
  if (createRequest.matched) return createRequest.hasDetails

  if (hasUrl(text)) return true
  if (containsAny(text, EXPLICIT_CREATE_WORDS)) return true
  if (containsAny(text, PLAN_WORDS)) return true

  const temporalAction = temporalActionRemainder(text)
  if (temporalAction.length >= 2) return true

  const hasTemporal = containsAny(text, TEMPORAL_WORDS) || hasClockExpression(text)
  const hasEvent = containsAny(text, EVENT_WORDS)
  if (hasTemporal && hasEvent) return true
  if (isStandaloneActionPhrase(text)) return true

  return hasExplicitReadingIntent(text)
}

function temporalActionRemainder(text) {
  for (const temporalWord of TEMPORAL_WORDS) {
    if (!text.startsWith(temporalWord)) continue

    const remainder = text
      .slice(temporalWord.length)
      .trim()

    if (!remainder) return ''

    const actionable = remainder.startsWith('去')
      ? remainder.slice(1).trim()
      : remainder

    if (startsWithAny(actionable, STANDALONE_ACTION_PREFIXES)) {
      return actionable
    }
  }

  return ''
}

function hasWeakActionSignal(text) {
  const hasTemporal =
    containsAny(text, TEMPORAL_WORDS) ||
    hasClockExpression(text)
  const hasEvent = containsAny(text, EVENT_WORDS)
  const temporalAction = temporalActionRemainder(text)

  return containsAny(text, EXPLICIT_CREATE_WORDS) ||
    containsAny(text, PLAN_WORDS) ||
    hasClockExpression(text) ||
    Boolean(temporalAction) ||
    (hasTemporal && hasEvent)
}

function assessUnknownIntent(normalizedText, command) {
  if (hasExplicitCreateIntent(normalizedText, command)) {
    return {
      decision: 'allow',
      reason: 'explicit_write_intent',
      classification: classificationAsCreate(command)
    }
  }

  if (normalizedText.length >= 120) {
    return {
      decision: 'allow',
      reason: 'rich_content_for_model',
      classification: command
    }
  }

  if (hasWeakActionSignal(normalizedText)) {
    return {
      decision: 'clarify',
      reason: 'ambiguous_intent',
      replyText:
        '我不确定你是想记录一项内容，还是只是在陈述情况。请补充明确动作或时间。',
      classification: command
    }
  }

  return {
    decision: 'ignore',
    reason: 'non_actionable_statement',
    silent: true,
    classification: command
  }
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
  const rawText = String(text || '')
  const normalizedText = clean(rawText)
  const command = classification || classifyCommandText(normalizedText)

  if (rawText.length > MAX_INTENT_INPUT_LENGTH) {
    return {
      decision: 'clarify',
      reason: 'input_too_long',
      replyText: '这条内容过长，我没有执行写入。请拆成较短的事项或材料后再发送。',
      classification: command
    }
  }
  const action = command?.action || 'unknown'

  if (looksLikeAggregateStatus(normalizedText)) {
    return {
      decision: 'ignore',
      reason: 'aggregate_or_system_status',
      silent: true,
      classification: command
    }
  }

  if (looksLikeNegativeInstruction(normalizedText)) {
    return {
      decision: 'ignore',
      reason: 'negative_instruction',
      silent: true,
      classification: command
    }
  }

  const createRequest = createRequestDetails(normalizedText)

  if (createRequest.matched) {
    if (!createRequest.hasDetails) {
      return {
        decision: 'clarify',
        reason: 'missing_create_details',
        replyText:
          '我知道你想新增或设置一项内容，但还缺少具体事项。请补充要记录、提醒或保存的内容。',
        classification: command
      }
    }

    return {
      decision: 'allow',
      reason: 'explicit_write_intent',
      classification: classificationAsCreate(command)
    }
  }

  if (action === 'unknown') {
    return assessUnknownIntent(normalizedText, command)
  }

  if (!WRITE_ACTIONS.has(action)) {
    return {
      decision: 'allow',
      reason: 'read_or_non_mutation',
      classification: command
    }
  }

  if (action === 'create' && !hasExplicitCreateIntent(normalizedText, command)) {
    if (!hasWeakActionSignal(normalizedText)) {
      return {
        decision: 'ignore',
        reason: 'non_actionable_statement',
        silent: true,
        classification: command
      }
    }

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

  return {
    decision: 'allow',
    reason: 'explicit_write_intent',
    classification: command
  }
}

export function assessCaptureIntent({ text, classification } = {}) {
  const rawText = String(text || '')

  if (rawText.length > MAX_INTENT_INPUT_LENGTH) {
    return {
      decision: 'clarify',
      reason: 'input_too_long',
      replyText: '这条内容过长，我没有执行写入。请拆成较短的事项或材料后再发送。',
      classification: classification || { action: 'unknown', confidence: 'low' }
    }
  }

  const normalizedText = clean(rawText)
  const command = classification || classifyCommandText(normalizedText)

  if (looksLikeAggregateStatus(normalizedText)) {
    return {
      decision: 'ignore',
      reason: 'aggregate_or_system_status',
      silent: true,
      classification: command
    }
  }

  if (looksLikeNegativeInstruction(normalizedText)) {
    return {
      decision: 'ignore',
      reason: 'negative_instruction',
      silent: true,
      classification: command
    }
  }

  if (command?.action === 'unknown') {
    return assessUnknownIntent(normalizedText, command)
  }

  if (
    [
      'noop',
      'help',
      'list',
      'search',
      'get',
      'status',
      'answer',
      'select',
      'confirm'
    ].includes(command?.action)
  ) {
    return {
      decision: 'ignore',
      reason: 'non_capture_action',
      silent: true,
      classification: command
    }
  }

  return assessOpenClawMutation({
    text: normalizedText,
    classification: command
  })
}
