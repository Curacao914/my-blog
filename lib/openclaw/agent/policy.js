const EXPLICIT_BULK_SCOPES = new Set([
  'matching',
  'all_unread'
])

function hasForbiddenReminderFields(value = {}) {
  const text = JSON.stringify(value || {})
  return /"reminders?"|"remindAt"|"channel"\s*:\s*"wechat"/i.test(text)
}

export function evaluateRiskPolicy({
  plan,
  card,
  targets = [],
  confirmed = false
} = {}) {
  if (!card) {
    return {
      decision: 'deny',
      reason: 'unknown_capability',
      replyText: '这个能力尚未注册，因此没有执行任何操作。'
    }
  }

  if (card.risk === 'privileged') {
    return {
      decision: 'deny',
      reason: 'privileged_not_available_in_wechat',
      replyText: '普通微信对话不开放生产运维操作。'
    }
  }

  if (hasForbiddenReminderFields(plan.parameters)) {
    return {
      decision: 'deny',
      reason: 'exact_wechat_reminder_not_supported',
      replyText:
        'Law-Tech 只记录日期事项和时间信息，不创建精确时刻微信提醒；紧急事项请继续使用 iOS 提醒事项。'
    }
  }

  if (card.mode === 'read') {
    return {
      decision: 'allow',
      reason: 'read'
    }
  }

  if (card.requiresTarget && !targets.length) {
    return {
      decision: 'clarify',
      reason: 'missing_real_target',
      replyText:
        '我理解了要执行的操作，但还没有解析到唯一的真实对象。'
    }
  }

  if (
    targets.length > 1 &&
    !EXPLICIT_BULK_SCOPES.has(plan.scope)
  ) {
    return {
      decision: 'clarify',
      reason: 'implicit_bulk_not_allowed',
      replyText:
        '这项操作会影响多个对象，请明确说“全部未读”或说明匹配范围。'
    }
  }

  if (
    targets.length > 1 &&
    !card.scopes.includes(plan.scope)
  ) {
    return {
      decision: 'deny',
      reason: 'unsupported_bulk_scope',
      replyText: '该能力不支持这个批量范围。'
    }
  }

  if (card.risk === 'destructive' && !confirmed) {
    return {
      decision: 'confirm',
      reason: 'destructive_confirmation_required',
      replyText:
        `这是删除操作，将影响 ${targets.length || 1} 个对象。请回复“确认”继续，或回复“取消”。`
    }
  }

  return {
    decision: 'allow',
    reason:
      targets.length > 1
        ? 'explicit_bulk_reversible_write'
        : 'validated_write'
  }
}
