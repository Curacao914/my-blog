import { runOpenClawAgent } from '@/lib/openclaw/agent/controller'
import { loadResourceCatalog } from '@/lib/openclaw/agent/resources'
import {
  modelFirstOpenClawEnabled,
  routerEvaluationModelConfig
} from '@/lib/server/openclawAgentHandler'

function modelResult(plan) {
  return {
    plan,
    model: {
      provider: 'test',
      model: 'router-test',
      usage: {}
    }
  }
}

function basePlan(overrides = {}) {
  return {
    version: 1,
    decision: 'act',
    domain: 'course',
    capability: 'course.brief.mark_read',
    operation: 'mark_read',
    scope: 'all_unread',
    target: {
      ids: [],
      query: '',
      contextRefs: [],
      filters: { read: false }
    },
    parameters: {},
    sourcePreference: 'internal',
    risk: 'bulk_write',
    confidence: 0.99,
    needsRetrieval: true,
    ...overrides
  }
}

describe('OpenClaw model-first controller', () => {
  test('forces router-only evaluation through Agent on Preview even during rollback', () => {
    const previousFlag = process.env.OPENCLAW_AGENT_V1_ENABLED
    const previousVercelEnv = process.env.VERCEL_ENV
    try {
      process.env.OPENCLAW_AGENT_V1_ENABLED = 'false'
      process.env.VERCEL_ENV = 'preview'
      expect(
        modelFirstOpenClawEnabled({
          body: { evaluationMode: 'router' }
        })
      ).toBe(true)
      process.env.VERCEL_ENV = 'production'
      expect(
        modelFirstOpenClawEnabled({
          body: { evaluationMode: 'router' }
        })
      ).toBe(false)
    } finally {
      if (previousFlag === undefined) delete process.env.OPENCLAW_AGENT_V1_ENABLED
      else process.env.OPENCLAW_AGENT_V1_ENABLED = previousFlag
      if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = previousVercelEnv
    }
  })

  test('builds isolated router evaluation model config without Supabase', () => {
    const names = [
      'COURSE_AI_API_KEY',
      'SCHEDULE_AI_API_KEY',
      'AI_API_KEY',
      'OPENAI_API_KEY',
      'COURSE_AI_BASE_URL',
      'SCHEDULE_AI_BASE_URL',
      'AI_BASE_URL',
      'OPENCLAW_ROUTER_MODEL',
      'SCHEDULE_AI_MODEL',
      'COURSE_AI_MODEL',
      'AI_MODEL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SECRET_KEY',
      'LAW_TECH_ROUTER_EVAL_CONFIG_MODE'
    ]
    const previous = Object.fromEntries(
      names.map(name => [name, process.env[name]])
    )
    try {
      for (const name of names) delete process.env[name]
      process.env.AI_API_KEY = 'eval-key'
      process.env.AI_BASE_URL = 'https://model.example/v1/'
      process.env.OPENCLAW_ROUTER_MODEL = 'router-eval'
      expect(routerEvaluationModelConfig()).toEqual({
        apiKey: 'eval-key',
        baseUrl: 'https://model.example/v1',
        models: {
          default: 'deepseek-v4-pro',
          router: 'router-eval'
        },
        source: 'router_evaluation_environment'
      })
      process.env.LAW_TECH_ROUTER_EVAL_CONFIG_MODE = 'user_integration_read_only'
      expect(routerEvaluationModelConfig()).toBeNull()
      delete process.env.LAW_TECH_ROUTER_EVAL_CONFIG_MODE
      delete process.env.AI_API_KEY
      expect(routerEvaluationModelConfig()).toBeNull()
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    }
  })

  test('executes all_unread only after model route, resource and policy', async () => {
    const executeTool = jest.fn().mockResolvedValue({
      status: 'updated',
      count: 2,
      items: [
        { id: '1:a', type: 'course_brief', title: 'A', read: true },
        { id: '2:b', type: 'course_brief', title: 'B', read: true }
      ],
      before: [
        { id: '1:a', read: false },
        { id: '2:b', read: false }
      ],
      after: [
        { id: '1:a', read: true },
        { id: '2:b', read: true }
      ],
      mutationSpec: {
        tool: 'course.brief.mark_read',
        targetIds: ['1:a', '2:b'],
        idempotencyKey: 'm1'
      }
    })
    const saved = []
    const result = await runOpenClawAgent({
      text: '未读课程简报已全部读完',
      messageId: 'm1',
      ownerId: 'owner',
      senderId: 'sender',
      modelConfig: {
        apiKey: 'x',
        baseUrl: 'https://example.com',
        models: { router: 'test' }
      },
      loadSession: async () => ({}),
      saveSession: async state => saved.push(state),
      dependencies: {
        routeWithModel: jest.fn().mockResolvedValue(
          modelResult(basePlan())
        ),
        loadResourceCatalog: jest.fn().mockResolvedValue({
          querySpec: {
            resource: 'course_brief',
            filters: { read: false }
          },
          candidates: [
            {
              id: '1:a',
              type: 'course_brief',
              title: 'A',
              read: false
            },
            {
              id: '2:b',
              type: 'course_brief',
              title: 'B',
              read: false
            }
          ],
          counts: {}
        }),
        executeTool
      }
    })
    expect(result.statusCode).toBe(200)
    expect(result.body.action).toBe('course.brief.mark_read')
    expect(executeTool).toHaveBeenCalledTimes(1)
    expect(executeTool.mock.calls[0][0].targets).toHaveLength(2)
    expect(saved).toHaveLength(1)
  })

  test('preserves the raw WeChat text in trace while routing normalized text', async () => {
    const saved = []
    const routeWithModel = jest.fn().mockResolvedValue(
      modelResult(basePlan({
        decision: 'answer',
        domain: 'agent',
        capability: 'agent.help',
        operation: 'answer',
        scope: 'single',
        target: { ids: [], query: '', contextRefs: [], filters: {} },
        parameters: {},
        risk: 'read',
        needsRetrieval: false
      }))
    )
    await runOpenClawAgent({
      text: '改到十点',
      originalText: '时间改到十点',
      messageId: 'trace-original',
      ownerId: 'owner',
      loadSession: async () => ({}),
      saveSession: async state => saved.push(state),
      dependencies: { routeWithModel }
    })
    expect(routeWithModel.mock.calls[0][0].text).toBe('改到十点')
    expect(saved[0].recentTraces[0].input).toBe('时间改到十点')
  })

  test('never falls back to rule writes when the router fails', async () => {
    const executeTool = jest.fn()
    const error = Object.assign(
      new Error('provider unavailable'),
      {
        code: 'ROUTER_MODEL_FAILED',
        status: 503
      }
    )
    const result = await runOpenClawAgent({
      text: '明天开会',
      messageId: 'm2',
      ownerId: 'owner',
      modelConfig: {},
      dependencies: {
        routeWithModel: jest.fn().mockRejectedValue(error),
        executeTool
      }
    })
    expect(result.statusCode).toBe(503)
    expect(result.body.ok).toBe(false)
    expect(executeTool).not.toHaveBeenCalled()
    expect(result.body.replyText).toContain('没有修改任何数据')
  })

  test('evaluation mode performs no mutation', async () => {
    const executeTool = jest.fn()
    const result = await runOpenClawAgent({
      text: '未读课程简报全部读完',
      messageId: 'm3',
      ownerId: 'owner',
      evaluationMode: true,
      modelConfig: {
        apiKey: 'x',
        baseUrl: 'https://example.com',
        models: { router: 'test' }
      },
      dependencies: {
        routeWithModel: jest.fn().mockResolvedValue(
          modelResult(basePlan())
        ),
        loadResourceCatalog: jest.fn().mockResolvedValue({
          querySpec: { resource: 'course_brief' },
          candidates: [
            {
              id: '1:a',
              type: 'course_brief',
              title: 'A',
              read: false
            }
          ],
          counts: {}
        }),
        executeTool
      }
    })
    expect(result.body.status).toBe('evaluated')
    expect(executeTool).not.toHaveBeenCalled()
  })

  test('delete resources include completed schedule and read items for cleanup', async () => {
    const rows = [
      {
        id: '44444444-4444-4444-8444-444444444444',
        title: 'Agent 验收',
        section: '事项',
        section_key: 'action',
        schedule_date: '2026-07-04',
        status: 'done',
        ai_trace: { contentType: 'action' }
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        title: 'law-tech-agent-e2e',
        section: '阅读',
        section_key: 'reading',
        schedule_date: 'reading',
        status: 'done',
        ai_trace: { contentType: 'reading' }
      }
    ]
    const emptySnapshot = {
      pending: [],
      allReading: [],
      courseBriefs: [],
      unreadCourseBriefs: [],
      counts: {}
    }
    const schedule = await loadResourceCatalog({
      ownerId: 'owner',
      plan: {
        capability: 'schedule.delete',
        scope: 'single',
        target: { filters: {} }
      },
      loadSnapshot: async () => emptySnapshot,
      listRows: async () => rows
    })
    const reading = await loadResourceCatalog({
      ownerId: 'owner',
      plan: {
        capability: 'reading.delete',
        scope: 'single',
        target: { filters: {} }
      },
      loadSnapshot: async () => emptySnapshot,
      listRows: async () => rows
    })
    expect(schedule.candidates.map(item => item.title)).toEqual(['Agent 验收'])
    expect(reading.candidates.map(item => item.title)).toEqual(['law-tech-agent-e2e'])
  })

  test('resolves a structured last-created reference before update', async () => {
    const schedule = {
      id: '33333333-3333-4333-8333-333333333333',
      type: 'schedule',
      title: 'Agent 验收',
      date: '2026-07-04',
      time: ''
    }
    const executeTool = jest.fn().mockResolvedValue({
      status: 'updated',
      count: 1,
      updated: { ...schedule, time: '10:00' },
      items: [{ ...schedule, time: '10:00' }],
      before: schedule,
      after: { ...schedule, time: '10:00' },
      mutationSpec: {
        tool: 'schedule.update',
        targetIds: [schedule.id],
        idempotencyKey: 'm4'
      }
    })
    const result = await runOpenClawAgent({
      text: '时间改到十点',
      messageId: 'm4',
      ownerId: 'owner',
      senderId: 'sender',
      loadSession: async () => ({
        lastCreatedObject: schedule
      }),
      saveSession: async () => {},
      modelConfig: {
        apiKey: 'x',
        baseUrl: 'https://example.com',
        models: { router: 'test' }
      },
      dependencies: {
        routeWithModel: jest.fn().mockResolvedValue(
          modelResult(basePlan({
            domain: 'schedule',
            capability: 'schedule.update',
            operation: 'update',
            scope: 'selected',
            target: {
              ids: [],
              query: '',
              contextRefs: ['lastCreated'],
              filters: {}
            },
            parameters: {
              patch: { time: '10:00' }
            },
            risk: 'reversible_write'
          }))
        ),
        loadResourceCatalog: jest.fn().mockResolvedValue({
          querySpec: { resource: 'schedule' },
          candidates: [schedule],
          counts: {}
        }),
        executeTool
      }
    })
    expect(result.body.ok).toBe(true)
    expect(executeTool.mock.calls[0][0].targets[0].id).toBe(schedule.id)
  })
})
