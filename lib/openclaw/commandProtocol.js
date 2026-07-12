export const COMMAND_PROTOCOL_VERSION = 1

const MAX_COMMAND_TEXT_LENGTH = 4000

const QUERY_WORDS = /查看|查询|查一下|列出|有哪些|有没有|多少|是否|状态|进度|找一下|搜索|给我看|给我发|在哪里|哪一份|哪篇/
const DELETE_WORDS = /删除|删掉|彻底删除|移除/
const COMPLETE_WORDS = /完成了?|做完了?|办完了?|已完成|打卡了?/
const CANCEL_WORDS = /取消|不用了|作废/
const MARK_READ_WORDS = /读完了?|看完了?|标记已读|标记读过|读过了?/
const UPDATE_WORDS = /修改|改到|改成|换到|延期|延后|推迟|提前到|挪到|调整|改一下/
const REMINDER_WORDS = /提醒我|记得提醒|到时提醒|提前.+提醒|别忘了/
const CREATE_WORDS = /添加|新增|记下|安排|保存|创建|加入|要去|需要|记得|提醒/
const APPEND_WORDS = /(?:也|再)?(?:加进|加入|补充到|追加到|写进).*(?:刚才|刚刚|上一条|上一个|这个|那个|日程|事项|提醒)|(?:刚才|刚刚|上一条|上一个|这个|那个).*(?:加上|加入|补充|追加)/
const TOP_LEVEL_CREATE = /^(?:麻烦你帮我|请你帮我|能不能帮我|可以帮我|麻烦帮我|请帮我|帮我|麻烦|请)?(?:添加|新增|创建|设置|安排|记下|保存|加入)(?:日程|事项|提醒|待办|阅读)?(?:[，,:：\s]|$)/
const FOLLOW_UP_WORDS = /^(第?[一二三四五六七八九十\d]+个|这个|那个|这条|上一条|刚才那个|刚刚那个|是的|对|确认|不用了|取消|完成了|读完了|看完了|改到|改成|提前|延后|推迟|延期|提醒|稍后)/
const REFERENCE_WORDS = /刚才|刚刚|上一条|上一个|这个|那个|这条|这篇|第?[一二三四五六七八九十\d]+个/
const ORDINAL_ONLY = /^第?([一二三四五六七八九十\d]+)个$/
const SNOOZE_WORDS = /稍后提醒|过会儿提醒|延后提醒|贪睡|snooze/i
const CONFIRM_WORDS = /^(是的|对|确认|就这样|可以|没错)$/

const DOMAIN_RULES = [
  ['usage', /AI.{0,12}(?:花费|成本|用量|多少钱)|token|调用次数|缓存命中/i],
  ['workspace', /网站.*用户|用户|成员|账号|邀请|权限|管理员/],
  ['course', /课程|课次|课堂|简报|课程笔记|讲义/],
  ['reading', /待读|阅读|读完|看完|已读|读过/],
  ['content', /文章|笔记|材料|文档|论文|帖子|内容/],
  ['system', /系统|服务|服务器|Relay|OpenClaw|模型状态|当前模型|帮助|怎么用/i],
  ['schedule', /日程|安排|事项|待办|待处理|逾期|未完成|基本状况|今日概况|会议|活动|面试|打卡|吃饭|提醒|今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[点:：]/]
]

function cleanText(value) {
  return String(value || '')
    .slice(0, MAX_COMMAND_TEXT_LENGTH)
    .replace(/\s+/g, ' ')
    .trim()
}

export function compactCommandValue(value) {
  if (Array.isArray(value)) {
    const list = value.map(compactCommandValue).filter(item => item !== undefined)
    return list.length ? list : undefined
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, compactCommandValue(child)])
      .filter(([, child]) => child !== undefined)
    return entries.length ? Object.fromEntries(entries) : undefined
  }
  if (value === undefined || value === null || value === '') return undefined
  return value
}

function inferDomain(text) {
  if (ORDINAL_ONLY.test(text) || CONFIRM_WORDS.test(text)) return 'conversation'
  if (text.includes('https://') || text.includes('http://')) return 'reading'
  for (const [domain, pattern] of DOMAIN_RULES) {
    if (pattern.test(text)) return domain
  }
  return 'unknown'
}

function inferScope(text) {
  if (/逾期|过期|没做完|未完成/.test(text)) return 'overdue'
  if (/今天|今日|当天/.test(text)) return 'today'
  if (/明天|明日/.test(text)) return 'tomorrow'
  if (/本周|这周|未来七天|近七天/.test(text)) return 'week'
  if (/未读|没看|没有看/.test(text)) return 'unread'
  if (/全部|所有/.test(text)) return 'all'
  return ''
}

function isStandaloneCreate(text) {
  return /(?:今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[点:：]|[一二两三四五六七八九十]+点).*(?:会议|活动|面试|打卡|吃饭|提交|完成|提醒)|(?:会议|活动|面试|打卡|吃饭|提交).*(?:今天|明天|后天|周|星期|\d{1,2}[点:：])/.test(text)
}

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

const NATURAL_READING_CREATE_WORDS = [
  '稍后读',
  '以后读',
  '有空读',
  '读一下',
  '阅读一下',
  '看一下',
  '稍后看',
  '以后看',
  '有空看'
]

function startsWithAny(text, values) {
  return values.some(value => text.startsWith(value))
}

function isStandaloneActionPhrase(text) {
  const value = text.startsWith('去') ? text.slice(1) : text
  if (value.length < 2 || value.length > 80) return false
  if (startsWithAny(value, ['读完', '看完', '做完', '办完', '完成'])) {
    return false
  }
  return startsWithAny(value, STANDALONE_ACTION_PREFIXES)
}

function isNaturalReadingCreate(text) {
  return NATURAL_READING_CREATE_WORDS.some(value => text.includes(value))
}

function stripCommandPoliteness(text) {
  return String(text || '').replace(
    /^(?:麻烦你帮我|请你帮我|能不能帮我|可以帮我|麻烦帮我|请帮我|能帮我|帮我|麻烦你|请你|麻烦|请)\s*/,
    ''
  )
}

function isDeleteCommand(text) {
  const actionable = stripCommandPoliteness(text)
  if (!actionable || TOP_LEVEL_CREATE.test(actionable) || APPEND_WORDS.test(actionable)) {
    return false
  }

  const contentMarker = actionable.search(/(?:内容|标题|备注|说明)(?:是|为|：|:)/)
  const deleteMarker = actionable.search(DELETE_WORDS)
  if (contentMarker >= 0 && deleteMarker > contentMarker) return false

  return (
    /^(?:删除|删掉|彻底删除|移除)/.test(actionable) ||
    /^(?:把|将).{1,180}(?:删除|删掉|彻底删除|移除)(?:掉)?(?:了|吧)?[。！!？?]?$/.test(actionable) ||
    /(?:删除|删掉|彻底删除|移除)(?:掉)?(?:刚才|刚刚|上一条|上一个|这个|那个|这条|事项|日程|提醒|阅读项|文章|笔记)/.test(actionable)
  )
}

function inferAction(text, domain) {
  if (!text || /^(hi|hello|你好|在吗|测试|test|ok|嗯+|啊+|收到|谢谢)$/i.test(text)) return 'noop'
  if (/帮助|怎么用|使用说明/.test(text)) return 'help'
  if (ORDINAL_ONLY.test(text)) return 'select'
  if (CONFIRM_WORDS.test(text)) return 'confirm'
  if (SNOOZE_WORDS.test(text)) return 'snooze'
  if (APPEND_WORDS.test(text)) return 'update'
  if (TOP_LEVEL_CREATE.test(text)) return 'create'
  if (isDeleteCommand(text)) return 'delete'
  if (MARK_READ_WORDS.test(text)) return 'mark_read'
  if (COMPLETE_WORDS.test(text)) return 'complete'
  if (CANCEL_WORDS.test(text)) return 'cancel'
  if (UPDATE_WORDS.test(text)) return 'update'
  if (startsWithAny(text, ['提前', '延后', '推迟', '改到', '改成', '提醒'])) {
    return 'update'
  }
  if (QUERY_WORDS.test(text)) return domain === 'content' ? 'search' : 'list'
  if (text.includes('https://') || text.includes('http://')) return 'create'
  if (isNaturalReadingCreate(text)) return 'create'
  if (
    REMINDER_WORDS.test(text) ||
    CREATE_WORDS.test(text) ||
    isStandaloneCreate(text) ||
    isStandaloneActionPhrase(text)
  ) return 'create'
  if (domain === 'schedule' && /今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[点:：]|[一二两三四五六七八九十]+点/.test(text)) return 'create'
  if (/是什么|为什么|怎么理解|如何理解|请解释|请回答/.test(text)) return 'answer'
  return 'unknown'
}

function operationFor(action) {
  if (['list', 'search', 'get', 'status', 'help', 'answer', 'noop', 'select', 'confirm'].includes(action)) return 'read'
  if (action === 'unknown') return 'none'
  return 'write'
}

function confirmationFor(domain, action) {
  if (action === 'delete') return 'explicit'
  if (domain === 'workspace' && ['create', 'update', 'cancel'].includes(action)) return 'explicit'
  return 'none'
}

export function classifyCommandText(input) {
  const text = cleanText(input)
  let domain = inferDomain(text)
  const action = inferAction(text, domain)
  if (
    ['create', 'update'].includes(action) &&
    /日程|事项|待办|提醒我|记得提醒|到时提醒|今天|今晚|明天|明早|明晚|后天|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[点:：]/.test(text)
  ) {
    domain = 'schedule'
  }
  if (action === 'answer' && domain === 'unknown') domain = 'knowledge'
  if (['select', 'confirm'].includes(action)) domain = 'conversation'
  const scope = inferScope(text)
  const operation = operationFor(action)
  const confirmation = confirmationFor(domain, action)
  return compactCommandValue({
    domain,
    action,
    scope,
    operation,
    confirmation,
    followUp: FOLLOW_UP_WORDS.test(text) || REFERENCE_WORDS.test(text),
    confidence: action === 'unknown' || domain === 'unknown' ? 'low' : 'high'
  })
}

export function isFollowUpCommand(input) {
  const text = cleanText(input)
  return FOLLOW_UP_WORDS.test(text) || REFERENCE_WORDS.test(text)
}

export function buildSparseCommand({
  text,
  classification,
  entity,
  temporal,
  reminders,
  recurrence,
  conversation,
  execution
} = {}) {
  const command = classification || classifyCommandText(text)
  const inferredExecution = execution || (
    command.confirmation && command.confirmation !== 'none'
      ? { confirmation: command.confirmation }
      : undefined
  )
  return compactCommandValue({
    v: COMMAND_PROTOCOL_VERSION,
    command: {
      domain: command.domain,
      action: command.action,
      scope: command.scope
    },
    entity,
    temporal,
    reminders,
    recurrence,
    conversation,
    execution: inferredExecution
  })
}
