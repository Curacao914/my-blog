import {
  buildSparseCommand,
  classifyCommandText,
  isFollowUpCommand
} from '@/lib/openclaw/commandProtocol'
import {
  resolvedCommandForCapture,
  temporalFromScheduleItem
} from '@/lib/openclaw/scheduleCommandBridge'
import { resolveTemporalSemantics } from '@/lib/openclaw/temporalSemantics'
import {
  getOpenClawConversationState,
  saveOpenClawConversationState
} from '@/lib/server/openclawConversation'
import {
  deleteScheduleRows,
  ensureProfile
} from '@/lib/server/supabase'
import { cancelScheduleReminderDeliveries } from '@/lib/server/scheduleReminderDeliveries'
import { setCourseBriefRead } from '@/lib/server/courseBriefReads'
import {
  describeOpenClawCandidate,
  executeOpenClawQuery
} from '@/lib/server/openclawQueries'

function readBearerToken(req) {
  const authorization = String(req.headers.authorization || '')
  if (/^Bearer\s+/i.test(authorization)) return authorization.replace(/^Bearer\s+/i, '')
  return String(req.query?.token || '')
}

function authorized(req) {
  const token = readBearerToken(req)
  return Boolean(process.env.WECHAT_CAPTURE_TOKEN && token === process.env.WECHAT_CAPTURE_TOKEN)
}

function ownerUserId(senderId) {
  const allowedSender = process.env.WECHAT_ALLOWED_SENDER_ID?.trim()
  if (allowedSender && senderId !== allowedSender) return ''
  return (
    process.env.WECHAT_OWNER_USER_ID?.trim() ||
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    ''
  )
}

function requestOrigin(req) {
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim()
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  if (host) return `${protocol}://${host}`
  return configured || 'https://law-tech.dev'
}

function isQueryAction(action) {
  return ['list', 'search', 'get', 'status', 'answer'].includes(action)
}

function isStandaloneCommand(text) {
  return /查看|查询|添加|新增|保存|创建|删除|完成|取消|修改|安排|提醒我.+(?:今天|明天|后天|周|星期|\d{1,2}[点:：])/.test(text)
}

function exactPendingCancellation(text) {
  return /^(取消|不用了|算了|不执行)$/i.test(String(text || '').trim())
}

function lastObjectLabel(lastObject = {}) {
  if (!lastObject?.title) return ''
  return `上一轮对象：《${lastObject.title}》${lastObject.id ? `（id: ${lastObject.id}）` : ''}`
}

function ordinalNumber(value = '') {
  const text = String(value || '')
  const digit = text.match(/第?(\d+)(?:个|份|条)?/)
  if (digit) return Math.max(1, Number(digit[1]))
  const chinese = text.match(/第?([一二三四五六七八九十]+)(?:个|份|条)?/)
  if (!chinese) return 0
  const values = {
    一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9, 十: 10
  }
  const raw = chinese[1]
  if (raw === '十') return 10
  if (raw.startsWith('十')) return 10 + Number(values[raw.slice(1)] || 0)
  if (raw.endsWith('十')) return Number(values[raw[0]] || 0) * 10
  if (raw.includes('十')) {
    const [left, right] = raw.split('十')
    return Number(values[left] || 1) * 10 + Number(values[right] || 0)
  }
  return Number(values[raw] || 0)
}

function candidateFromCommand(command, candidates = []) {
  const ordinal = ordinalNumber(command)
  if (ordinal > 0) return candidates[ordinal - 1] || null
  return null
}

function augmentWithConversation(command, state = {}) {
  const pending = state.pendingAction
  if (pending?.originalCommand && pending.reason === 'temporal_ambiguity') {
    return `${pending.originalCommand}\n补充说明：${command}`
  }
  if (pending?.originalCommand && !isStandaloneCommand(command)) {
    return `${pending.originalCommand}\n补充说明：${command}`
  }
  if (isFollowUpCommand(command) && state.lastObject?.title) {
    return `${lastObjectLabel(state.lastObject)}\n用户继续说：${command}`
  }
  return command
}

function helpReply() {
  return [
    '当前可用：',
    '1. 添加、修改、完成、取消或删除日程与阅读事项',
    '2. 设置开始时间、截止时间、结束时间、重复规则和多个提前提醒',
    '3. 使用“这个、上一条、提前一小时、改到……”继续上一轮操作',
    '4. 删除等危险操作会要求再次确认',
    '',
    '5. 查看今日概况、全部待处理、全部待读和未读课程简报',
    '6. 查询课程简报后回复序号选择，再回复“读完了”标记已读'
  ].join('\n')
}

async function forwardToCapture(req, body) {
  const response = await fetch(`${requestOrigin(req)}/api/schedule/capture`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${readBearerToken(req)}`,
      'content-type': 'application/json',
      ...(req.headers['idempotency-key']
        ? { 'idempotency-key': String(req.headers['idempotency-key']) }
        : {})
    },
    body: JSON.stringify(body)
  })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

function lastObjectFromPayload(payload = {}, fallback = null) {
  const item = payload.item || null
  if (item) {
    return {
      ...item,
      id: item.id || payload.recordId || null,
      title: item.title || payload.title || '',
      type: payload.type || item.contentType || '',
      action: payload.action || '',
      updatedAt: new Date().toISOString()
    }
  }
  if (payload.recordId || payload.title) {
    return {
      id: payload.recordId || null,
      title: payload.title || '',
      type: payload.type || '',
      action: payload.action || '',
      updatedAt: new Date().toISOString()
    }
  }
  return fallback
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED', replyText: '处理失败，请稍后重试。' })
  }

  const command = String(req.body?.command || req.body?.text || '').trim()
  const senderId = String(req.body?.senderId || '')
  const threadId = String(req.body?.threadId || senderId || 'default')
  const messageId = String(req.body?.messageId || req.body?.sourceMessageId || '')
  if (!command) return res.status(400).json({ ok: false, error: 'Empty command' })

  const clerkUserId = ownerUserId(senderId)
  if (!clerkUserId) {
    return res.status(500).json({ ok: false, error: 'No owner configured', replyText: '处理失败，请稍后重试。' })
  }

  try {
    const { profile } = await ensureProfile({ clerkUserId, role: 'owner', status: 'active' })
    const conversationKey = {
      ownerId: profile.id,
      channel: 'openclaw-weixin',
      senderId,
      threadId
    }
    const stored = await getOpenClawConversationState(conversationKey)
    const state = stored?.state || {}

    if (state.pendingAction && exactPendingCancellation(command)) {
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: { ...state, pendingAction: null }
      })
      return res.status(200).json({
        ok: true,
        status: 'cancelled',
        action: 'cancel_pending',
        replyText: '已取消刚才尚未执行的操作。'
      })
    }

    const rawClassification = classifyCommandText(command)
    const confirmedPending = rawClassification.action === 'confirm' && state.pendingAction?.originalCommand
    const originalCommand = confirmedPending ? state.pendingAction.originalCommand : command
    const classification = confirmedPending
      ? (state.pendingAction.classification || classifyCommandText(originalCommand))
      : rawClassification

    const now = req.body?.receivedAt ? new Date(String(req.body.receivedAt)) : new Date()
    const safeNow = Number.isNaN(now.getTime()) ? new Date() : now
    const temporal = resolveTemporalSemantics(confirmedPending ? originalCommand : command, {
      now: safeNow,
      timeZone: 'Asia/Shanghai',
      defaultReminderChannel: 'wechat',
      baseTemporal: temporalFromScheduleItem(state.lastObject || {})
    })

    const protocol = buildSparseCommand({
      text: originalCommand,
      classification,
      temporal: temporal.needsClarification ? undefined : {
        timezone: temporal.timezone,
        startsAt: temporal.startsAt,
        dueAt: temporal.dueAt,
        endsAt: temporal.endsAt,
        allDay: temporal.allDay,
        durationMinutes: temporal.durationMinutes
      },
      reminders: temporal.reminders,
      recurrence: temporal.recurrence,
      conversation: state.lastObject || state.pendingAction
        ? {
            mode: isFollowUpCommand(command) || confirmedPending ? 'follow_up' : 'standalone',
            referencedObjectId: state.lastObject?.id,
            pendingAction: Boolean(state.pendingAction)
          }
        : undefined
    })

    if (classification.action === 'noop') {
      return res.status(200).json({
        ok: true,
        status: 'ignored',
        action: 'ignored',
        reason: 'not_actionable',
        replyText: '未识别到需要处理的命令。',
        protocol
      })
    }

    if (classification.action === 'help') {
      return res.status(200).json({ ok: true, status: 'help', action: 'help', replyText: helpReply(), protocol })
    }

    if (classification.action === 'select') {
      const candidate = candidateFromCommand(command, state.candidates || [])
      if (!candidate) {
        return res.status(200).json({
          ok: true,
          status: 'needs_context',
          action: 'clarify',
          replyText: '当前没有对应的候选项，请先发出查询命令。',
          protocol
        })
      }
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: {
          ...state,
          lastObject: candidate,
          pendingAction: null
        }
      })
      return res.status(200).json({
        ok: true,
        status: 'selected',
        action: 'select',
        item: candidate,
        replyText: describeOpenClawCandidate(candidate),
        protocol
      })
    }

    if (classification.action === 'unknown') {
      return res.status(200).json({
        ok: true,
        status: 'needs_confirmation',
        action: 'clarify',
        replyText: '我还不能确定你想查询、添加还是修改什么。请换一种更明确的说法。',
        protocol
      })
    }

    if (temporal.needsClarification) {
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: {
          ...state,
          pendingAction: {
            originalCommand,
            classification,
            reason: 'temporal_ambiguity',
            createdAt: safeNow.toISOString()
          }
        }
      })
      return res.status(200).json({
        ok: true,
        status: 'needs_confirmation',
        action: 'clarify',
        replyText: temporal.clarificationText,
        protocol
      })
    }

    if (isQueryAction(classification.action)) {
      const queryResult = await executeOpenClawQuery({
        ownerId: profile.id,
        classification,
        now: safeNow,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://law-tech.dev'
      })
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: {
          ...state,
          lastCommand: protocol,
          lastObject: queryResult.lastObject || state.lastObject || null,
          candidates: queryResult.candidates || [],
          pendingAction: null
        }
      })
      return res.status(200).json({
        ...queryResult,
        protocol
      })
    }

    const referencedCandidate =
      candidateFromCommand(command, state.candidates || []) ||
      state.lastObject ||
      null

    if (
      classification.action === 'mark_read' &&
      referencedCandidate?.type === 'course_brief'
    ) {
      const updated = await setCourseBriefRead({
        ownerId: profile.id,
        jobId: referencedCandidate.jobId,
        lessonKey: referencedCandidate.lessonKey,
        read: true
      })
      const lastObject = {
        ...referencedCandidate,
        ...updated,
        type: 'course_brief'
      }
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: {
          ...state,
          lastObject,
          pendingAction: null
        }
      })
      return res.status(200).json({
        ok: true,
        status: 'completed',
        action: 'mark_read',
        item: lastObject,
        replyText: `已标记读过：${lastObject.title}`,
        protocol
      })
    }

    if (classification.confirmation === 'explicit' && !confirmedPending) {
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: {
          ...state,
          pendingAction: {
            originalCommand,
            classification,
            reason: 'destructive_confirmation',
            createdAt: safeNow.toISOString()
          }
        }
      })
      return res.status(200).json({
        ok: true,
        status: 'needs_confirmation',
        action: 'confirm',
        replyText: `这是不可逆操作。请回复“确认”执行：${originalCommand}`,
        protocol
      })
    }

    if (classification.action === 'delete' && confirmedPending) {
      const targetId = state.lastObject?.id
      if (!targetId || !/^[0-9a-f-]{36}$/i.test(targetId)) {
        return res.status(200).json({
          ok: true,
          status: 'needs_context',
          action: 'clarify',
          replyText: '我还不知道你要删除哪一项，请先查询或明确事项名称。',
          protocol
        })
      }
      await cancelScheduleReminderDeliveries({
        ownerId: profile.id,
        itemIds: [targetId]
      })
      await deleteScheduleRows(profile.id, [targetId])
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: {
          ...state,
          lastObject: null,
          pendingAction: null
        }
      })
      return res.status(200).json({
        ok: true,
        status: 'completed',
        action: 'deleted',
        recordId: targetId,
        replyText: `已删除：${state.lastObject?.title || '该事项'}`,
        protocol
      })
    }

    if (isFollowUpCommand(command) && !state.lastObject && !state.pendingAction && !confirmedPending) {
      return res.status(200).json({
        ok: true,
        status: 'needs_confirmation',
        action: 'clarify',
        replyText: '我还不知道你指的是哪一项。请补充事项名称或时间。',
        protocol
      })
    }

    const contextualCommand = confirmedPending
      ? originalCommand
      : augmentWithConversation(command, state)
    const resolvedCommand = {
      ...resolvedCommandForCapture({ protocol, temporal }),
      context: {
        originalCommand: command,
        followUp: isFollowUpCommand(command) || confirmedPending
      }
    }
    const { response, payload } = await forwardToCapture(req, {
      ...req.body,
      command: contextualCommand,
      originalCommand,
      resolvedCommand,
      source: 'wechat-clawbot',
      senderId,
      threadId,
      messageId
    })

    if (response.ok && payload?.ok) {
      await saveOpenClawConversationState(conversationKey, {
        lastMessageId: messageId,
        state: {
          lastCommand: protocol,
          lastObject: lastObjectFromPayload(payload, state.lastObject),
          pendingAction: null
        }
      })
    }

    return res.status(response.status).json({ ...payload, protocol })
  } catch (error) {
    return res.status(error.status || 502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'COMMAND_PROCESSING_FAILED',
      replyText: '处理失败，请稍后重试。'
    })
  }
}
