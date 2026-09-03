function line(candidate, index) {
  const detail = [
    candidate.courseName,
    candidate.lessonTitle,
    candidate.date,
    candidate.time,
    candidate.place
  ].filter(Boolean).join(' · ')
  const title = candidate.url
    ? `[${candidate.title}](${candidate.url})`
    : candidate.title
  return `${index + 1}. ${title}${detail ? `\n   ${detail}` : ''}`
}

export function helpReply() {
  return [
    '当前由 model-first Agent 处理微信自然语言。',
    '',
    '可以：',
    '1. 查询、创建、修改和完成日程；',
    '2. 保存、查询和标记待读；',
    '3. 查询课程简报，并按单个、匹配范围或全部未读标记已读；',
    '4. 使用“这个”“刚才那个”“时间改到十点”等上下文表达；',
    '5. 删除前进行确认。',
    '',
    'Law-Tech 不创建精确到点的微信提醒；紧急提醒请继续使用 iOS 提醒事项。'
  ].join('\n')
}

export function readReply({
  plan,
  candidates = [],
  counts = {}
} = {}) {
  if (!candidates.length) {
    if (plan.capability === 'course.brief.list') {
      return plan.scope === 'all_unread'
        ? '当前没有未读课程简报。'
        : '没有找到符合条件的课程简报。'
    }
    if (plan.capability === 'reading.list') {
      return '当前没有符合条件的待读内容。'
    }
    return '当前没有符合条件的日程。'
  }

  const title =
    plan.capability === 'course.brief.list'
      ? plan.scope === 'all_unread'
        ? '未读课程简报'
        : '课程简报'
      : plan.capability === 'reading.list'
        ? '待读'
        : plan.scope === 'today'
          ? '今天'
          : plan.scope === 'tomorrow'
            ? '明天'
            : plan.scope === 'week'
              ? '未来七天'
              : plan.scope === 'overdue'
                ? '逾期事项'
                : '日程'

  return [
    `【${title} · ${candidates.length}】`,
    '',
    ...candidates.slice(0, 12).map(line),
    candidates.length > 12
      ? `\n另有 ${candidates.length - 12} 项。`
      : '',
    plan.capability === 'course.brief.list'
      ? '\n可继续说“第一份读完了”“国际法六月三号那篇读完了”或“未读课程简报全部读完”。'
      : '',
    counts.pending !== undefined && plan.capability === 'schedule.list'
      ? `\n当前待处理总数：${counts.pending}`
      : ''
  ].filter(Boolean).join('\n')
}

export function toolReply({
  card,
  result,
  targets = []
} = {}) {
  if (result.status === 'duplicate') {
    const item = result.items?.[0]
    return item
      ? `这条消息已经处理过：${item.title}`
      : '这条消息已经处理过，没有重复写入。'
  }

  if (card.id === 'course.brief.mark_read') {
    if (result.failures?.length) {
      return [
        `已标记 ${result.count || 0} 份课程简报为已读。`,
        `另有 ${result.failures.length} 份失败，未伪装为全部成功。`
      ].join('\n')
    }
    return `已将 ${result.count || targets.length} 份课程简报标记为已读。`
  }

  const item =
    result.created ||
    result.updated ||
    result.items?.[0] ||
    targets[0]
  const title = item?.title || '该对象'

  if (result.status === 'created') {
    return card.domain === 'reading'
      ? `已保存到待读：《${title}》`
      : `已创建日程：${title}`
  }
  if (result.status === 'deleted') {
    return `已删除：${title}`
  }
  if (result.status === 'no_change') {
    return `“${title}”已经是这个状态，没有重复写入。`
  }
  if (card.id === 'schedule.complete') {
    return `已完成：${title}`
  }
  if (card.id === 'reading.mark_read') {
    return `已标记读完：《${title}》`
  }
  if (result.status === 'updated') {
    const parts = [
      result.updated?.date,
      result.updated?.time,
      result.updated?.place
    ].filter(Boolean)
    return `已修改：${title}${parts.length ? `\n${parts.join(' · ')}` : ''}`
  }
  return `已处理：${title}`
}
