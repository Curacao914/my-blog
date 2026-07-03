import {
  capabilityRegistry,
  getCapability
} from './capabilities'
import { objectRef } from './contracts'
import { resolveTargets } from './entityResolver'
import { evaluateRiskPolicy } from './policy'
import { readReply, helpReply, toolReply } from './reply'
import {
  loadResourceCatalog,
  presentCandidate
} from './resources'
import {
  AGENT_SESSION_TTL_MS,
  clearPending,
  normalizeAgentSession,
  updateSessionAfterResult
} from './session'
import {
  compactCandidateTrace,
  createTrace,
  emitTrace,
  finishTrace
} from './trace'
import { executeTool } from './tools'
import { routeWithModel } from './router'

function sessionIdFor(context = {}) {
  return [
    context.ownerId || '',
    context.channel || 'openclaw-weixin',
    context.senderId || '',
    context.threadId || 'default'
  ].join(':')
}

function expiresAt(now = new Date(), minutes = 10) {
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString()
}

function pendingExpired(pending, now = new Date()) {
  if (!pending?.expiresAt) return false
  return Date.parse(pending.expiresAt) <= now.getTime()
}

function duplicateResponse(state, messageId) {
  if (!messageId || state.lastMessageId !== messageId) return null
  return {
    statusCode: 200,
    body: {
      ok: true,
      status: 'duplicate',
      action: 'duplicate',
      replyText: '这条微信消息已经处理过，没有重复执行。'
    }
  }
}

function directTargetsFromIds(ids = [], candidates = []) {
  const wanted = new Set(ids)
  return candidates.filter(item => wanted.has(item.id))
}

function needsResolution(card, plan) {
  if (card.requiresTarget) return true
  if (plan.scope === 'matching' || plan.scope === 'single') {
    return Boolean(
      plan.target?.query ||
      plan.target?.contextRefs?.length ||
      plan.target?.filters &&
      Object.keys(plan.target.filters).length
    )
  }
  return false
}

function resultObjects(result = {}) {
  return {
    created: result.created ? objectRef(result.created) : null,
    updated: result.updated ? objectRef(result.updated) : null,
    selected:
      result.updated ||
      result.created ||
      result.items?.[0] ||
      null
  }
}

async function saveResultState({
  state,
  saveSession,
  messageId,
  text,
  replyText,
  plan,
  candidates,
  result,
  pendingPlan,
  pendingConfirmation,
  trace,
  now
}) {
  if (!saveSession) return state
  const refs = resultObjects(result)
  const next = updateSessionAfterResult(state, {
    messageId,
    inputText: text,
    replyText,
    plan,
    candidates:
      (candidates || []).map(item => objectRef(item)).filter(Boolean),
    selected: refs.selected ? objectRef(refs.selected) : null,
    created: refs.created,
    updated: refs.updated,
    pendingPlan,
    pendingConfirmation,
    trace,
    now
  })
  await saveSession(next, {
    lastMessageId: messageId,
    ttlMs: AGENT_SESSION_TTL_MS
  })
  return next
}

function response(statusCode, body, trace) {
  return {
    statusCode,
    body: {
      ...body,
      traceId: trace?.traceId || body.traceId || ''
    }
  }
}

export async function runOpenClawAgent({
  text,
  originalText = text,
  messageId = '',
  ownerId,
  senderId = '',
  threadId = '',
  channel = 'openclaw-weixin',
  now = new Date(),
  timeZone = 'Asia/Shanghai',
  siteUrl = 'https://law-tech.dev',
  modelConfig = {},
  evaluationMode = false,
  loadSession,
  saveSession,
  registry = capabilityRegistry,
  dependencies = {}
} = {}) {
  const context = {
    ownerId,
    senderId,
    threadId,
    channel,
    messageId
  }
  const storedState = normalizeAgentSession(
    loadSession ? await loadSession() : {}
  )
  const duplicate = duplicateResponse(storedState, messageId)
  if (duplicate && !evaluationMode) return duplicate

  const trace = createTrace({
    messageId,
    sessionId: sessionIdFor(context),
    inputText: originalText,
    now
  })

  const route =
    dependencies.routeWithModel || routeWithModel
  const loadCatalog =
    dependencies.loadResourceCatalog || loadResourceCatalog
  const runTool =
    dependencies.executeTool || executeTool

  try {
    const routed = await route({
      text,
      now,
      timeZone,
      session: storedState,
      modelConfig,
      registry,
      fetchImpl: dependencies.fetchImpl
    })
    let plan = routed.plan
    trace.routePlan = plan
    trace.model = routed.model
    trace.capability = plan.capability

    if (evaluationMode === 'router') {
      const replyText =
        'Router 评估完成；没有检索对象或执行写入。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'evaluated',
        action: 'router_evaluation',
        replyText,
        routePlan: plan,
        model: routed.model
      }, finished)
    }

    if (plan.confidence < 0.55) {
      const replyText =
        '我还不能高置信判断你要执行的操作，因此没有修改任何数据。请补充对象或动作。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: [],
          result: {},
          pendingPlan: plan,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'needs_confirmation',
        action: 'clarify',
        replyText,
        routePlan: plan
      }, finished)
    }

    if (plan.capability === 'agent.help') {
      const replyText = helpReply()
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: [],
          result: {},
          pendingPlan: null,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'completed',
        action: 'help',
        replyText,
        routePlan: plan
      }, finished)
    }

    if (plan.capability === 'agent.cancel_pending') {
      const next = clearPending(storedState)
      const replyText = '已取消刚才尚未执行的操作。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode && saveSession) {
        await saveSession(
          updateSessionAfterResult(next, {
            messageId,
            inputText: text,
            replyText,
            plan,
            pendingPlan: null,
            pendingConfirmation: null,
            trace: finished,
            now
          }),
          {
            lastMessageId: messageId,
            ttlMs: AGENT_SESSION_TTL_MS
          }
        )
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'cancelled',
        action: 'cancel_pending',
        replyText,
        routePlan: plan
      }, finished)
    }

    let confirmed = false
    let pendingTargets = []
    if (plan.capability === 'agent.confirm') {
      const pending = storedState.pendingConfirmation
      if (!pending || pendingExpired(pending, now)) {
        const replyText =
          '当前没有仍在有效期内、等待确认的操作。'
        const finished = finishTrace(trace, {
          response: replyText,
          now: new Date()
        })
        emitTrace(finished)
        return response(200, {
          ok: true,
          status: 'needs_context',
          action: 'clarify',
          replyText,
          routePlan: plan
        }, finished)
      }
      plan = pending.plan
      pendingTargets = pending.targets || []
      confirmed = true
      trace.routePlan = plan
      trace.capability = plan.capability
    }

    if (plan.decision === 'ignore') {
      const replyText = ''
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: [],
          result: {},
          pendingPlan: null,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'ignored',
        action: 'ignored',
        silent: true,
        replyText,
        routePlan: plan
      }, finished)
    }

    if (plan.decision === 'clarify') {
      const replyText =
        plan.parameters?.clarification ||
        '请补充要处理的对象或具体动作。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: [],
          result: {},
          pendingPlan: plan,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'needs_confirmation',
        action: 'clarify',
        replyText,
        routePlan: plan
      }, finished)
    }

    const card = getCapability(plan.capability, registry)
    if (!card) {
      throw Object.assign(
        new Error('UNKNOWN_CAPABILITY'),
        { status: 422 }
      )
    }

    let catalog = {
      querySpec: null,
      candidates: [],
      counts: {}
    }
    if (card.resource || card.requiresTarget || card.mode === 'read') {
      catalog = await loadCatalog({
        ownerId,
        plan,
        now,
        timeZone,
        siteUrl,
        loadSnapshot: dependencies.loadSnapshot,
        listRows: dependencies.listScheduleRows
      })
      trace.querySpecs = catalog.querySpec
        ? [catalog.querySpec]
        : []
    }

    let resolution = {
      status: 'resolved',
      targets: [],
      candidates: catalog.candidates || [],
      strategy: 'none'
    }
    const confirmedIds =
      confirmed
        ? pendingTargets.map(item => item.id).filter(Boolean)
        : []
    const modelIds = plan.target?.ids || []
    if (confirmedIds.length || modelIds.length) {
      const ids = confirmedIds.length ? confirmedIds : modelIds
      const matches = directTargetsFromIds(
        ids,
        catalog.candidates || []
      )
      resolution = {
        status:
          matches.length === ids.length
            ? 'resolved'
            : 'not_found',
        targets: matches,
        candidates: matches,
        strategy:
          confirmedIds.length
            ? 'confirmed_ids'
            : 'validated_ids'
      }
    } else if (needsResolution(card, plan)) {
      resolution = resolveTargets({
        plan,
        candidates: catalog.candidates || [],
        session: storedState,
        now
      })
    } else if (plan.scope === 'all_unread') {
      resolution = resolveTargets({
        plan,
        candidates: catalog.candidates || [],
        session: storedState,
        now
      })
    }

    trace.candidates = compactCandidateTrace(
      resolution.candidates || []
    )

    if (resolution.status !== 'resolved') {
      const replyText =
        resolution.replyText ||
        '没有找到唯一的真实对象，因此没有执行写入。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: resolution.candidates || [],
          result: {},
          pendingPlan: plan,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status:
          resolution.status === 'ambiguous'
            ? 'needs_confirmation'
            : 'not_found',
        action: 'clarify',
        replyText,
        routePlan: plan,
        candidates:
          (resolution.candidates || [])
            .map(presentCandidate)
            .filter(Boolean)
      }, finished)
    }

    if (
      card.mode === 'write' &&
      plan.scope === 'all_unread' &&
      resolution.targets.length === 0
    ) {
      const replyText = '当前没有未读课程简报，不需要重复写入。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: [],
          result: {},
          pendingPlan: null,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'completed',
        action: plan.capability,
        replyText,
        routePlan: plan,
        items: [],
        before: [],
        after: []
      }, finished)
    }

    if (card.mode === 'read') {
      const visible =
        needsResolution(card, plan)
          ? resolution.targets
          : catalog.candidates || []
      const replyText = readReply({
        plan,
        candidates: visible,
        counts: catalog.counts
      })
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: visible,
          result: {
            updated: null,
            created: null,
            items: visible
          },
          pendingPlan: null,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'completed',
        action: 'query',
        replyText,
        routePlan: plan,
        querySpec: catalog.querySpec,
        results: visible.map(presentCandidate).filter(Boolean),
        candidates: visible.map(presentCandidate).filter(Boolean)
      }, finished)
    }

    const policy = evaluateRiskPolicy({
      plan,
      card,
      targets: resolution.targets,
      confirmed
    })
    trace.policy = policy

    if (policy.decision === 'confirm') {
      const pendingConfirmation = {
        plan,
        targets:
          resolution.targets.map(objectRef).filter(Boolean),
        createdAt: now.toISOString(),
        expiresAt: expiresAt(now, 10)
      }
      const replyText = policy.replyText
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: resolution.targets,
          result: {},
          pendingPlan: plan,
          pendingConfirmation,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'needs_confirmation',
        action: 'confirm',
        replyText,
        routePlan: plan,
        targets:
          resolution.targets.map(presentCandidate).filter(Boolean)
      }, finished)
    }

    if (policy.decision !== 'allow') {
      const replyText =
        policy.replyText ||
        '安全门禁没有允许这次操作，因此没有修改数据。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      if (!evaluationMode) {
        await saveResultState({
          state: storedState,
          saveSession,
          messageId,
          text,
          replyText,
          plan,
          candidates: resolution.targets,
          result: {},
          pendingPlan: plan,
          pendingConfirmation: null,
          trace: finished,
          now
        })
      }
      emitTrace(finished)
      return response(200, {
        ok: true,
        status:
          policy.decision === 'clarify'
            ? 'needs_confirmation'
            : 'denied',
        action:
          policy.decision === 'clarify'
            ? 'clarify'
            : 'denied',
        replyText,
        routePlan: plan,
        policy
      }, finished)
    }

    if (evaluationMode) {
      const replyText =
        '评估模式已完成路由、真实对象解析和风险门禁；没有执行写入。'
      const finished = finishTrace(trace, {
        response: replyText,
        now: new Date()
      })
      emitTrace(finished)
      return response(200, {
        ok: true,
        status: 'evaluated',
        action: 'dry_run',
        replyText,
        routePlan: plan,
        querySpec: catalog.querySpec,
        targets:
          resolution.targets.map(presentCandidate).filter(Boolean),
        policy
      }, finished)
    }

    const result = await runTool({
      ownerId,
      plan,
      card,
      targets: resolution.targets,
      context: {
        ...context,
        traceId: trace.traceId,
        idempotencyKey: [
          channel,
          senderId || 'unknown',
          messageId || trace.traceId
        ].join(':')
      }
    })
    trace.mutationSpecs = result.mutationSpec
      ? [result.mutationSpec]
      : []
    trace.toolResults = [
      {
        status: result.status,
        count: result.count || 0,
        failures: result.failures?.length || 0
      }
    ]
    trace.beforeAfter = [
      {
        before: result.before ?? null,
        after: result.after ?? null,
        undoSpec: result.undoSpec || null
      }
    ]

    const replyText = toolReply({
      card,
      result,
      targets: resolution.targets
    })
    const finished = finishTrace(trace, {
      response: replyText,
      now: new Date()
    })
    await saveResultState({
      state: storedState,
      saveSession,
      messageId,
      text,
      replyText,
      plan,
      candidates: resolution.targets,
      result,
      pendingPlan: null,
      pendingConfirmation: null,
      trace: finished,
      now
    })
    emitTrace(finished)
    return response(200, {
      ok: result.status !== 'failed',
      status:
        result.status === 'partial'
          ? 'partial'
          : 'completed',
      action: card.id,
      replyText,
      routePlan: plan,
      querySpec: catalog.querySpec,
      mutationSpec: result.mutationSpec,
      item:
        result.created ||
        result.updated ||
        result.items?.[0] ||
        null,
      items: result.items || [],
      failures: result.failures || [],
      before: result.before ?? null,
      after: result.after ?? null,
      undoSpec: result.undoSpec || null
    }, finished)
  } catch (error) {
    const replyText =
      error?.code === 'ROUTER_MODEL_NOT_CONFIGURED' ||
      error?.code === 'ROUTER_MODEL_FAILED' ||
      error?.code === 'INVALID_ROUTE_PLAN'
        ? '意图理解服务暂时不可用，本次没有修改任何数据。'
        : '处理失败，本次没有确认成功的写入。'
    const finished = finishTrace(trace, {
      response: replyText,
      error:
        error instanceof Error
          ? error.message
          : 'AGENT_CONTROLLER_FAILED',
      now: new Date()
    })
    emitTrace(finished)
    return response(error?.status || 502, {
      ok: false,
      status: 'failed',
      action: 'none',
      error:
        error?.code ||
        (error instanceof Error
          ? error.message
          : 'AGENT_CONTROLLER_FAILED'),
      replyText
    }, finished)
  }
}
