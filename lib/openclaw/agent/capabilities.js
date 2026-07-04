const cards = [
  {
    id: 'agent.help',
    domain: 'agent',
    description: '说明当前 Agent 能做什么',
    mode: 'read',
    resource: '',
    tool: '',
    risk: 'read',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'agent.confirm',
    domain: 'agent',
    description: '确认并继续刚才等待确认的操作',
    mode: 'write',
    resource: '',
    tool: '',
    risk: 'destructive',
    confirmation: 'pending_only',
    idempotent: true,
    scopes: ['single'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'agent.cancel_pending',
    domain: 'agent',
    description: '取消刚才等待确认的操作',
    mode: 'write',
    resource: '',
    tool: '',
    risk: 'reversible_write',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'schedule.list',
    domain: 'schedule',
    description: '查看今天、明天、本周、逾期或全部待处理事项',
    mode: 'read',
    resource: 'schedule',
    tool: '',
    risk: 'read',
    confirmation: 'none',
    idempotent: true,
    scopes: ['today', 'tomorrow', 'week', 'overdue', 'all', 'matching'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'schedule.create',
    domain: 'schedule',
    description: '创建一条日期事项；可以记录时间，但不会创建精确时刻微信提醒',
    mode: 'write',
    resource: 'schedule',
    tool: 'schedule.create',
    risk: 'reversible_write',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'schedule.update',
    domain: 'schedule',
    description: '修改一条真实日程的标题、日期、时间、地点或状态',
    mode: 'write',
    resource: 'schedule',
    tool: 'schedule.update',
    risk: 'reversible_write',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single', 'selected'],
    requiresTarget: true,
    version: 1
  },
  {
    id: 'schedule.complete',
    domain: 'schedule',
    description: '将一条真实日程标记为完成',
    mode: 'write',
    resource: 'schedule',
    tool: 'schedule.complete',
    risk: 'reversible_write',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single', 'selected'],
    requiresTarget: true,
    version: 1
  },
  {
    id: 'schedule.delete',
    domain: 'schedule',
    description: '删除一条真实日程',
    mode: 'write',
    resource: 'schedule',
    tool: 'schedule.delete',
    risk: 'destructive',
    confirmation: 'explicit',
    idempotent: true,
    scopes: ['single', 'selected'],
    requiresTarget: true,
    version: 1
  },
  {
    id: 'reading.list',
    domain: 'reading',
    description: '查看或搜索待读内容',
    mode: 'read',
    resource: 'reading',
    tool: '',
    risk: 'read',
    confirmation: 'none',
    idempotent: true,
    scopes: ['all', 'matching'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'reading.create',
    domain: 'reading',
    description: '创建一条待读内容',
    mode: 'write',
    resource: 'reading',
    tool: 'reading.create',
    risk: 'reversible_write',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'reading.mark_read',
    domain: 'reading',
    description: '将一条或明确匹配的一组待读内容标记为已读',
    mode: 'write',
    resource: 'reading',
    tool: 'reading.mark_read',
    risk: 'reversible_write',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single', 'selected', 'matching'],
    requiresTarget: true,
    version: 1
  },
  {
    id: 'reading.delete',
    domain: 'reading',
    description: '删除一条真实待读内容',
    mode: 'write',
    resource: 'reading',
    tool: 'reading.delete',
    risk: 'destructive',
    confirmation: 'explicit',
    idempotent: true,
    scopes: ['single', 'selected'],
    requiresTarget: true,
    version: 1
  },
  {
    id: 'course.brief.list',
    domain: 'course',
    description: '查看未读、全部或匹配某课程与课次的课程简报',
    mode: 'read',
    resource: 'course_brief',
    tool: '',
    risk: 'read',
    confirmation: 'none',
    idempotent: true,
    scopes: ['all', 'all_unread', 'matching', 'single'],
    requiresTarget: false,
    version: 1
  },
  {
    id: 'course.brief.mark_read',
    domain: 'course',
    description: '将一份、匹配集合或全部未读课程简报标记为已读',
    mode: 'write',
    resource: 'course_brief',
    tool: 'course.brief.mark_read',
    risk: 'reversible_write',
    confirmation: 'none',
    idempotent: true,
    scopes: ['single', 'selected', 'matching', 'all_unread'],
    requiresTarget: true,
    version: 1
  }
]

function freezeCard(card) {
  return Object.freeze({
    ...card,
    scopes: Object.freeze([...(card.scopes || [])])
  })
}

export const CAPABILITY_CARDS = Object.freeze(cards.map(freezeCard))

export function createCapabilityRegistry(input = CAPABILITY_CARDS) {
  const entries = (input || []).map(card => [card.id, freezeCard(card)])
  const map = new Map(entries)
  if (map.size !== entries.length) {
    throw new Error('Duplicate capability id')
  }
  return map
}

export const capabilityRegistry = createCapabilityRegistry()

export function compactCapabilityCatalog(registry = capabilityRegistry) {
  return [...registry.values()].map(card => ({
    id: card.id,
    domain: card.domain,
    description: card.description,
    mode: card.mode,
    scopes: card.scopes,
    risk: card.risk,
    confirmation: card.confirmation
  }))
}

export function getCapability(id, registry = capabilityRegistry) {
  return registry.get(String(id || '')) || null
}
