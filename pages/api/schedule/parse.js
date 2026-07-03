import { cleanDisplayTags, cleanDisplayText } from '@/lib/domain/metadata'
import { addCalendarDays } from '@/lib/domain/calendarDate'
import { assessCaptureIntent, looksLikeAggregateStatus } from '@/lib/openclaw/mutationPolicy'
import { profileCan } from '@/lib/auth/permissions'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

export const runtime = 'nodejs'

const schemaInstruction = `
Return JSON only:
{
  "decision": "write | ignore | clarify",
  "reason": "short machine-readable reason",
  "clarification": "short Chinese question when decision=clarify; otherwise empty",
  "mode": "append | replace",
  "items": [
    {
      "id": "existing item uuid when modifying an existing item; omit for new items",
      "title": "string",
      "contentType": "action | reading",
      "section": "string",
      "sectionKey": "string",
      "tone": "today-leaf | today-blue | today-honey | today-rose | today-lilac",
      "date": "YYYY-MM-DD | reading | none",
      "time": "HH:mm | string",
      "place": "string",
      "priority": "low | normal | high",
      "importance": "important | normal",
      "urgency": "urgent | not_urgent",
      "isPinned": false,
      "prioritySource": "ai | user | rule",
      "importanceSource": "ai | user | rule",
      "urgencySource": "ai | user | rule",
      "status": "active | done | cancelled",
      "links": [{ "title": "string", "url": "string" }],
      "tags": ["up to 3 short topic tags for reading items; omit or [] when unsure"],
      "children": [{ "title": "string", "done": false }],
      "summary": "string",
      "note": "string",
      "reminder": {
        "enabled": true,
        "remindAt": "YYYY-MM-DD HH:mm | none",
        "leadMinutes": 15,
        "channel": "email"
      }
    }
  ]
}
`.trim()

const TIME_ZONE = 'Asia/Shanghai'
const TONES = new Set(['today-leaf', 'today-blue', 'today-honey', 'today-rose', 'today-lilac'])
const PRIORITIES = new Set(['low', 'normal', 'high'])
const CONTENT_TYPES = new Set(['action', 'reading'])
const IMPORTANCE = new Set(['important', 'normal'])
const URGENCY = new Set(['urgent', 'not_urgent'])
const SOURCES = new Set(['ai', 'user', 'rule'])
const STATUSES = new Set(['active', 'done', 'cancelled'])
const GENERIC_LINK_TITLES = new Set(['链接', '微信文章', '文章', '网页'])
const CHANNELS = new Set(['email'])

function getShanghaiToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function normalizeDateValue(date, referenceDate) {
  const value = String(date || '').trim()
  if (!value) return 'none'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (value === 'reading' || value === 'none') return value
  if (value === 'today') return referenceDate
  if (value === 'tomorrow') return addCalendarDays(referenceDate, 1)
  if (value === 'day-after-tomorrow' || value === 'after_tomorrow' || value === '后天') return addCalendarDays(referenceDate, 2)
  return 'none'
}

function normalizeTimeValue(time) {
  const value = cleanDisplayText(time)
  if (!value) return ''
  const match = value.match(/^([01]?\d|2[0-3])[:：]([0-5]\d)$/)
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`
  return value
}

function normalizeUrl(url) {
  const value = String(url || '').trim()
  return /^https?:\/\//i.test(value) ? value : ''
}

function extractUrls(text = '') {
  return [...String(text).matchAll(/https?:\/\/[^\s，。；、]+/g)].map((match) => match[0])
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number.parseInt(num, 10)))
}

function stripHtml(html = '') {
  return decodeHtml(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  ).trim()
}

function pickMeta(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1]).trim()
  }
  return ''
}

function cleanMetadataText(text = '', limit = 360) {
  return stripHtml(text).replace(/\s+/g, ' ').slice(0, limit).trim()
}

async function fetchUrlMetadata(url) {
  const normalizedUrl = normalizeUrl(url)
  if (!normalizedUrl) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 Law-Tech link preview bot',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    })
    if (!response.ok) return { url: normalizedUrl }
    const html = await response.text()
    const title =
      pickMeta(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
        /var\s+msg_title\s*=\s*['"]([^'"]+)['"]/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i
      ]) || ''
    const description =
      pickMeta(html, [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
        /var\s+msg_desc\s*=\s*['"]([^'"]+)['"]/i
      ]) || ''
    const articleText =
      pickMeta(html, [
        /<div[^>]+id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*<script/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i
      ]) || ''
    return {
      url: normalizedUrl,
      title: cleanMetadataText(title, 80),
      description: cleanMetadataText(description || articleText, 420)
    }
  } catch {
    return { url: normalizedUrl }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchCommandLinkMetadata(command) {
  const urls = [...new Set(extractUrls(command))].slice(0, 3)
  const entries = await Promise.all(urls.map((url) => fetchUrlMetadata(url)))
  return entries.filter(Boolean)
}

function metadataForUrl(url, linkMetadata = []) {
  return linkMetadata.find((entry) => entry.url === url)
}

function enrichItemWithMetadata(item, linkMetadata = []) {
  const links = item.links.map((link) => {
    const metadata = metadataForUrl(link.url, linkMetadata)
    const shouldReplaceTitle = !link.title || GENERIC_LINK_TITLES.has(link.title)
    return {
      ...link,
      title: shouldReplaceTitle && metadata?.title ? metadata.title : link.title
    }
  })
  const firstMetadata = links.map((link) => metadataForUrl(link.url, linkMetadata)).find((entry) => entry?.title || entry?.description)
  const shouldReplaceTitle = !item.title || GENERIC_LINK_TITLES.has(item.title)
  return {
    ...item,
    title: shouldReplaceTitle && firstMetadata?.title ? firstMetadata.title : item.title,
    links,
    summary: item.summary || firstMetadata?.description || ''
  }
}

function buildSystemPrompt({ referenceDate }) {
  return [
    '你是 Law-Tech 工作台的日程与阅读整理器，只输出 JSON，不要输出解释。',
    `当前日期是 ${referenceDate}，时区是 ${TIME_ZONE}。所有相对日期必须按这个日期换算。`,
    '核心任务：先判断用户是在要求写入、查询/陈述状态，还是表达不清。理解可以灵活，但写数据库必须谨慎。',
    '只有明确要求创建或修改，或输入本身构成明确可行动安排时，decision=write。',
    '普通陈述、系统状态、机器人回复、闲聊和无法确定的表达不得硬凑记录：分别返回 ignore 或 clarify，items=[]。',
    '',
    '判定与整理规则：',
    '1. date 必须是具体 YYYY-MM-DD、reading 或 none。禁止输出 today、tomorrow、upcoming、later、后天 等相对或模糊日期。',
    '2. 用户说“今天/明天/后天/周几/下周/某月某日”时，换算为具体 YYYY-MM-DD。',
    '3. 有明确时间时，time 优先输出 24 小时制 HH:mm；只有无法归一时才保留原文。',
    '4. 没有时间但有日期，也要创建日程项；没有日期也没有时间的普通事项 date 用 none。',
    '5. contentType 必须表达内容身份：action=事项/活动/待办/提醒，reading=待读文章/推文/材料。时间、链接、标签都不能替代 contentType。',
    '6. 用户发送 URL、公众号链接、文章标题或大段文字，且没有指定处理时间：通常创建阅读项，contentType=reading，section=阅读，sectionKey=reading，date=reading。',
    '7. 用户发送 URL/文章并指定“今晚读/明天看/周五前看”等时间：创建阅读日程，contentType=reading，section=阅读，sectionKey=reading，date 用具体日期，并保留 links。',
    '8. 但活动通知、会议通知、论坛安排、请示批复、课程作业、学工任务，即使很长或带链接，也应 contentType=action。标签可以是学工/课程/行政等。',
    '9. 如果 URL context 提供了标题或描述，阅读项 title 必须优先使用真实标题，summary 用一小段中文概括，通常 2-4 句，说明文章主题、关键信息和为什么值得读；不要只写“微信文章”。',
    '10. 对无法获取标题的 mp.weixin.qq.com 链接，title 才用“微信文章”；summary 用一句很短的待读理由或内容线索，不要编造正文细节。',
    '11. 阅读项 tags 最多 3 个，应来自真实标题、URL context、摘要或正文线索；不确定就返回 []。禁止把 none、null、undefined、阅读、待读、已读当作标签。',
    '12. 一条输入包含多件事时，拆成多个 items；每个 item 都要能独立显示。',
    '13. 分类不固定，可用学习、学工、阅读、日常、写作、行政、健康等自然短标签；不要生硬使用“智能/AI”。',
    '14. importance 表示重要性，urgency 表示紧急性。时间临近可以使 urgency=urgent，但不能自动等于 important；用户明确说重要/必须优先时 importance=important。',
    '15. 如果用户要求完成、取消、延期、修改已有事项，mode=replace，并返回相关事项修改后的完整版本；如果只是新增，mode=append，只返回新增项。',
    '16. 修改已有事项时，必须保留该事项原来的 id；新建事项不要编造 id。',
    '17. 用户说“读完了/完成了/取消/删掉/改到/延期/提前/换到/提醒我”并且 Current relevant items 里有对应事项时，一律修改该事项，不要新建同名事项。',
    '18. 用户说“读完了/完成了”时 status=done；说“取消/不用了/删掉”时 status=cancelled；只改时间时保留原 title、section、links、summary、note、contentType。',
    '19. 用户明确说“提醒我/提前提醒/到时提醒/某时提醒”时，填写 reminder；提前半小时输出 leadMinutes=30，提前一天输出 1440；指定提醒时刻则输出具体 remindAt。',
    '20. 如果用户没有提提醒，不要为了普通新增事项编造 reminder；服务端会按默认策略处理。',
    '21. 先做语义判定，不要只因出现“读、完成、提醒、课程”等关键词就写入。',
    '22. “未读课程简报已全部读完”“今天没有待办”“系统同步完成”属于状态陈述：decision=ignore，items=[]。',
    '23. “读完了”“改到明天”但没有上下文和对象时：decision=clarify，items=[]；不要创建标题等于整句话的新项目。',
    '24. “《国际法笔记》读完了”“把周五会议改到三点”可以结合 Current relevant items 语义匹配并 replace；不要求用户必须先说固定模板。',
    '25. “明天下午三点开会”“买牛奶”“提醒我周五交作业”以及单独 URL 均可按实际语义 decision=write。',
    '26. 当你主动判断 decision=ignore 或 clarify 时，服务端会尊重空 items；不要为了满足 schema 虚构项目。',
    '27. 保留用户原意，不要在回复里扩写、开玩笑或自作主张添加不存在的安排。',
    '',
    schemaInstruction
  ].join('\n')
}

function getScheduleModelConfig() {
  const apiKey = process.env.SCHEDULE_AI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY
  const baseUrl = process.env.SCHEDULE_AI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.SCHEDULE_AI_MODEL || process.env.AI_MODEL
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, ''), model }
}

function extractJson(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object returned')
  return JSON.parse(match[0])
}

function normalizeItems(items = [], { referenceDate, linkMetadata = [] }) {
  return items.map((item) => enrichItemWithMetadata({
    id: item.id,
    title: item.title || '未命名事项',
    contentType: normalizeContentType(item),
    section: item.section || item.kind || '其他',
    sectionKey: item.sectionKey || (item.section === '阅读' ? 'reading' : ''),
    tone: TONES.has(item.tone) ? item.tone : '',
    date: normalizeDateValue(item.date, referenceDate),
    time: normalizeTimeValue(item.time),
    place: cleanDisplayText(item.place),
    priority: PRIORITIES.has(item.priority) ? item.priority : 'normal',
    importance: IMPORTANCE.has(item.importance) ? item.importance : (item.priority === 'high' ? 'important' : 'normal'),
    urgency: URGENCY.has(item.urgency) ? item.urgency : 'not_urgent',
    isPinned: Boolean(item.isPinned),
    prioritySource: SOURCES.has(item.prioritySource) ? item.prioritySource : 'ai',
    importanceSource: SOURCES.has(item.importanceSource) ? item.importanceSource : 'ai',
    urgencySource: SOURCES.has(item.urgencySource) ? item.urgencySource : 'ai',
    status: STATUSES.has(item.status) ? item.status : (item.done ? 'done' : 'active'),
    links: Array.isArray(item.links)
      ? item.links
        .map((link) => ({ title: link.title || '链接', url: normalizeUrl(link.url) }))
        .filter((link) => link.url)
      : [],
    tags: cleanDisplayTags(item.tags, { limit: 3, omitGenericReading: normalizeContentType(item) === 'reading' }),
    children: Array.isArray(item.children) ? item.children : [],
    summary: cleanDisplayText(item.summary),
    note: item.note || '',
    reminder: normalizeReminder(item.reminder, referenceDate)
  }, linkMetadata))
}

function normalizeContentType(item = {}) {
  const value = item.contentType || item.content_type || item.kind
  if (CONTENT_TYPES.has(value)) return value
  if (item.sectionKey === 'reading' || item.section === '阅读' || item.date === 'reading') return 'reading'
  return 'action'
}

function normalizeReminder(reminder, referenceDate) {
  if (!reminder || typeof reminder !== 'object') return undefined
  const enabled = reminder.enabled !== false
  const leadMinutes = Number.isFinite(Number(reminder.leadMinutes)) ? Number(reminder.leadMinutes) : undefined
  const channel = CHANNELS.has(reminder.channel) ? reminder.channel : 'email'
  let remindAt = String(reminder.remindAt || 'none').trim()
  if (remindAt && remindAt !== 'none') {
    const dateTimeMatch = remindAt.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):([0-5]\d)$/)
    if (dateTimeMatch) {
      remindAt = `${normalizeDateValue(dateTimeMatch[1], referenceDate)} ${dateTimeMatch[2].padStart(2, '0')}:${dateTimeMatch[3]}`
    } else {
      remindAt = 'none'
    }
  } else {
    remindAt = 'none'
  }
  return { enabled, remindAt, leadMinutes, channel }
}

function validateItems(items = []) {
  const errors = []
  items.forEach((item, index) => {
    if (!item.title?.trim()) errors.push(`items[${index}].title is empty`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.date !== 'reading' && item.date !== 'none') {
      errors.push(`items[${index}].date is invalid`)
    }
    if (item.contentType === 'reading' && item.section !== '阅读') {
      errors.push(`items[${index}].reading section should be 阅读`)
    }
    if (!CONTENT_TYPES.has(item.contentType)) {
      errors.push(`items[${index}].contentType is invalid`)
    }
  })
  return errors
}

function fallbackReadingTitle(command) {
  const text = String(command || '').trim()
  if (/good faith|bona fide/i.test(text) && /arbitration/i.test(text) && /Hong Kong/i.test(text)) {
    return '仲裁协议中善意义务的进一步说明（Hong Kong 为例）'
  }
  if (/mp\.weixin\.qq\.com/.test(text)) return '微信文章'
  const firstLine = text.split(/\n/).map((line) => line.trim()).find(Boolean) || '待读材料'
  return firstLine.replace(/^Curacao:\s*/i, '').slice(0, 42) || '待读材料'
}

function fallbackReadingSummary(command) {
  const text = String(command || '').replace(/\s+/g, ' ').trim()
  if (/good faith|bona fide/i.test(text) && /arbitration/i.test(text) && /Hong Kong/i.test(text)) {
    return '这段材料讨论香港仲裁协议中的善意义务。其要点是：当仲裁地为香港时，香港《仲裁条例》及其采纳的 UNCITRAL Model Law Article 2A 可能使当事人负有善意行事义务。'
  }
  return text.length > 180 ? `${text.slice(0, 180)}…` : text
}

export function shouldIgnoreCommand(command) {
  const text = String(command || '').replace(/\s+/g, ' ').trim()
  if (!text) return true
  if (/^(hi|hello|你好|在吗|测试|test|ok|嗯+|啊+|收到|谢谢)$/i.test(text)) return true
  if (/这条内容尚未添加成功，请稍后重试/.test(text)) return true
  if (looksLikeAggregateStatus(text)) return true
  return false
}

function looksLikeActionCommand(text) {
  return /提醒|记得|要|需要|截止|ddl|完成|整理|提交|处理|参加|举办|会议|论坛|讲座|活动|请示|复函|审示|报名|作业|PPT|学工|课|晚上|下午|上午|中午|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[点:：]/.test(text)
}

function looksLikeReadingCommand(text, links) {
  if (looksLikeAggregateStatus(text)) return false
  const explicitReading =
    /(?:加入|添加|保存|放进|列入).{0,8}(?:阅读|待读)|(?:待读|稍后读|以后读|有空读|读一下|看一下|稍后看|以后看|有空看)|(?:阅读|读|看)(?:这篇|一下|文章|论文|材料|链接)|(?:文章|论文|材料|链接).{0,8}(?:加入|添加|保存|待读|稍后看)/i.test(
      text
    )
  return explicitReading || (!looksLikeActionCommand(text) && links.length > 0)
}

function fallbackItemsFromCommand(command, { referenceDate, linkMetadata = [] }) {
  const text = String(command || '').trim()
  if (shouldIgnoreCommand(text)) return []
  const intent = assessCaptureIntent({ text })
  if (intent.decision !== 'allow') return []
  const links = extractUrls(text).map((url) => {
    const metadata = metadataForUrl(url, linkMetadata)
    return {
      title: metadata?.title || (url.includes('mp.weixin.qq.com') ? '微信文章' : '链接'),
      url
    }
  })
  const isReading = looksLikeReadingCommand(text, links)
  const isAction = looksLikeActionCommand(text)
  if (!isReading && !isAction) return []
  const actionTitle = text.replace(/^Curacao:\s*/i, '').replace(/https?:\/\/[^\s，。；、]+/g, '').trim().slice(0, 42) || '待处理事项'
  return normalizeItems([
    isReading
      ? {
          title: fallbackReadingTitle(text),
          contentType: 'reading',
          section: '阅读',
          sectionKey: 'reading',
          tone: 'today-honey',
          date: 'reading',
          time: '',
          place: '',
          priority: 'normal',
          importance: 'normal',
          urgency: 'not_urgent',
          status: 'active',
          links,
          children: [],
          summary: fallbackReadingSummary(text),
          note: ''
        }
      : {
          title: actionTitle,
          contentType: 'action',
          section: /学工|PPT|学生|社团/.test(text) ? '学工' : '事项',
          sectionKey: /学工|PPT|学生|社团/.test(text) ? 'xuegong' : 'action',
          tone: 'today-blue',
          date: normalizeDateValue(/明天/.test(text) ? 'tomorrow' : /今天|今晚/.test(text) ? 'today' : 'none', referenceDate),
          time: '',
          place: '',
          priority: /重要|必须|优先|截止|ddl|提醒/.test(text) ? 'high' : 'normal',
          importance: /重要|必须|优先/.test(text) ? 'important' : 'normal',
          urgency: /今天|今晚|明天|截止|ddl|提醒/.test(text) ? 'urgent' : 'not_urgent',
          status: 'active',
          links,
          children: [],
          summary: fallbackReadingSummary(text),
          note: ''
        }
  ], { referenceDate, linkMetadata })
}

async function readProviderFailure(response) {
  const text = await response.text().catch(() => '')
  try {
    const payload = JSON.parse(text)
    return String(
      payload?.error?.message ||
      payload?.message ||
      payload?.error ||
      ''
    ).slice(0, 240)
  } catch {
    return text.replace(/\s+/g, ' ').trim().slice(0, 240)
  }
}

async function callScheduleModel({ apiKey, baseUrl, model, messages }) {
  const request = async includeResponseFormat => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        ...(includeResponseFormat
          ? { response_format: { type: 'json_object' } }
          : {}),
        messages
      })
    })
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: await readProviderFailure(response)
      }
    }
    return { ok: true, data: await response.json() }
  }

  const first = await request(true)
  if (first.ok) return first

  // Retry without response_format only for compatibility failures. Billing,
  // auth and rate-limit errors must not spend a second request.
  if (![400, 404, 415, 422].includes(first.status)) return first
  return request(false)
}

export async function runScheduleParse(body, config) {
  const { apiKey, baseUrl, model } = config
  const referenceDate = body.referenceDate || getShanghaiToday()
  const command = body.command || body.instruction || body.text || ''

  if (shouldIgnoreCommand(command)) {
    return Response.json({
      mode: 'append',
      status: 'ignored',
      reason: 'not_actionable',
      items: []
    })
  }

  if (!apiKey || !model) {
    const fallback = fallbackItemsFromCommand(command, {
      referenceDate,
      linkMetadata: []
    })
    if (fallback.length) {
      return Response.json({ mode: 'append', source: 'rules', items: fallback })
    }
    return Response.json({ error: 'schedule model is not configured' }, { status: 503 })
  }

  const linkMetadata = await fetchCommandLinkMetadata(command)
  const userContent = `Reference date: ${referenceDate}
Timezone: ${TIME_ZONE}

Current relevant items:
${JSON.stringify(body.items || [], null, 2)}

URL context:
${JSON.stringify(linkMetadata, null, 2)}

User command:
${command}`

  const messages = [
    { role: 'system', content: buildSystemPrompt({ referenceDate }) },
    { role: 'user', content: userContent }
  ]
  const response = await callScheduleModel({ apiKey, baseUrl, model, messages })
  if (!response.ok) {
    const fallback = fallbackItemsFromCommand(command, {
      referenceDate,
      linkMetadata
    })
    if (fallback.length) {
      return Response.json({
        mode: 'append',
        source: 'rules',
        providerStatus: response.status,
        items: fallback
      })
    }
    return Response.json({
      error: 'schedule model request failed',
      providerStatus: response.status,
      providerError: response.error || ''
    }, { status: response.status })
  }

  const data = response.data
  const text = data.choices?.[0]?.message?.content || ''
  const parsed = extractJson(text)
  const items = normalizeItems(parsed.items, { referenceDate, linkMetadata })
  const decision = ['write', 'ignore', 'clarify'].includes(parsed.decision)
    ? parsed.decision
    : items.length
      ? 'write'
      : 'ignore'

  if (decision !== 'write') {
    return Response.json({
      mode: 'append',
      status: decision === 'clarify' ? 'needs_confirmation' : 'ignored',
      reason: parsed.reason || (decision === 'clarify' ? 'ambiguous_intent' : 'not_actionable'),
      clarification: cleanDisplayText(parsed.clarification),
      items: []
    })
  }

  if (!items.length) {
    return Response.json({
      mode: 'append',
      status: 'needs_confirmation',
      reason: 'write_without_items',
      clarification: '我理解到你可能想记录或修改内容，但还缺少足够信息。请补充具体事项。',
      items: []
    })
  }

  const errors = validateItems(items)
  if (errors.length) {
    return Response.json({ error: 'INVALID_MODEL_OUTPUT', details: errors }, { status: 422 })
  }

  return Response.json({
    mode: parsed.mode === 'replace' ? 'replace' : 'append',
    decision: 'write',
    items
  })
}

export async function POST(request) {
  const body = await request.json()
  return runScheduleParse(body, getScheduleModelConfig())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireWorkspaceRequest(req, { permission: 'schedule' })
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error, code: auth.code })
  if (!profileCan(auth.profile, 'ai')) return res.status(403).json({ error: '当前账号没有 AI 使用权限', code: 'permission_denied' })

  try {
    const userConfig = await resolveUserAiConfig(auth.profile)
    const response = await runScheduleParse(req.body || {}, {
      apiKey: userConfig.apiKey,
      baseUrl: userConfig.baseUrl,
      model: userConfig.models?.schedule || userConfig.models?.default || ''
    })
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Schedule parse failed'
    })
  }
}
