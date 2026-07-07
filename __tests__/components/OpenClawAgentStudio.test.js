import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { OpenClawAgentStudio } from '@/components/OpenClawAgentStudio'

const profile = {
  schemaVersion: '1.0',
  topology: [
    'message', 'intent', 'planner', 'semantic_gate', 'resource',
    'risk_policy', 'tool', 'response', 'trace'
  ],
  models: {
    interpreter: 'deepseek-v4-flash',
    responder: 'deepseek-v4-flash'
  },
  plannerMode: 'deterministic',
  capabilities: {
    'schedule.read': true,
    'reading.read': true,
    'course.read': true,
    'schedule.create': false
  },
  thresholds: {
    autoResolveMinimum: 0.98,
    candidateGapMinimum: 0.2,
    clarificationMaximum: 0.05
  },
  aliases: { schedule: [], reading: [], course: [] },
  budgets: {
    maxModelCalls: 1,
    maxInputTokens: 6000,
    maxOutputTokens: 800,
    maxEstimatedUsd: 0.01,
    timeoutMs: 12000
  },
  riskPolicy: {
    read: { confirmation: 'none' },
    reversible_write: { confirmation: 'none' },
    bulk_write: { confirmation: 'required' },
    destructive: { confirmation: 'required' },
    privileged: { confirmation: 'required' }
  }
}

function apiResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body))
  })
}

function htmlResponse(status = 504) {
  return Promise.resolve({
    ok: false,
    status,
    headers: { get: () => 'text/html' },
    json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    text: () => Promise.resolve('<!DOCTYPE html><title>Gateway Timeout</title>')
  })
}

describe('OpenClawAgentStudio', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() => apiResponse({
      ok: true,
      environment: 'preview',
      configs: [{
        id: 'config-1',
        version_number: 1,
        status: 'draft',
        checksum: 'abc',
        profile,
        created_at: '2026-07-04T00:00:00Z'
      }],
      evaluationRuns: []
    }))
  })

  it('renders the fixed control plane and schema-driven controls', async () => {
    render(<OpenClawAgentStudio />)
    expect(await screen.findByText('Agent Studio')).toBeInTheDocument()
    ;['消息', '意图', '规划', '语义门禁', '资源', '风险策略', '工具', '回复', '追踪']
      .forEach(label => expect(screen.getByText(label)).toBeInTheDocument())
    expect(await screen.findByLabelText('理解模型')).toHaveValue('deepseek-v4-flash')
    expect(screen.getByLabelText('自动解析阈值')).toHaveValue(0.98)
    expect(screen.queryByLabelText(/system prompt/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sql/i)).not.toBeInTheDocument()
  })

  it('uses the provider-compatible model for the first draft', async () => {
    global.fetch = jest.fn().mockImplementation(() => apiResponse({
      ok: true,
      environment: 'preview',
      configs: [],
      evaluationRuns: []
    }))
    render(<OpenClawAgentStudio />)
    expect(await screen.findByText(/尚无配置版本/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '新建草稿' }))
    await waitFor(() => {
      const createCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'POST')
      const body = JSON.parse(createCall[1].body)
      expect(body.profile.models.interpreter).toBe('deepseek-v4-flash')
      expect(body.profile.models.responder).toBe('deepseek-v4-flash')
    })
  })

  it('keeps publish disabled until a matching run passes every gate', async () => {
    render(<OpenClawAgentStudio />)
    const publish = await screen.findByRole('button', { name: '发布此版本' })
    expect(publish).toBeDisabled()
    expect(screen.getByText(/需要 150 条/)).toBeInTheDocument()
  })

  it('shows deterministic failure categories and representative model errors', async () => {
    global.fetch = jest.fn().mockImplementation(() => apiResponse({
      ok: true,
      environment: 'preview',
      configs: [{
        id: 'config-1', version_number: 1, status: 'draft',
        checksum: 'abc', profile
      }],
      evaluationRuns: [{
        id: 'run-failed', config_id: 'config-1', status: 'failed',
        case_count: 150, overall_score: 0.28, safety_score: 0.56,
        failure_categories: [
          { caseId: 'a', category: 'model_error', message: 'Model returned invalid JSON' },
          { caseId: 'b', category: 'model_error', message: 'Model returned invalid JSON' },
          { caseId: 'a', category: 'intent_mismatch' }
        ]
      }]
    }))
    render(<OpenClawAgentStudio />)
    expect(await screen.findByText('model_error × 2')).toBeInTheDocument()
    expect(screen.getByText('intent_mismatch × 1')).toBeInTheDocument()
    expect(screen.getByText('Model returned invalid JSON')).toBeInTheDocument()
  })

  it('loads failed evaluation detail without rerunning the evaluation', async () => {
    global.fetch = jest.fn().mockImplementation(url => {
      if (String(url).includes('/evaluation-run')) {
        return apiResponse({
          ok: true,
          run: { id: 'run-failed' },
          failedResults: [{
            caseId: 'schedule_core-01',
            failures: ['intent_mismatch'],
            mismatchedFields: ['domain', 'objectType'],
            expected: {
              action: 'read',
              domain: 'schedule',
              objectType: 'schedule_item',
              scope: 'list',
              executionAllowed: true
            },
            actual: {
              action: 'read',
              domain: 'course',
              objectType: 'course',
              scope: 'list',
              executionAllowed: true
            }
          }]
        })
      }
      return apiResponse({
        ok: true,
        environment: 'preview',
        configs: [{
          id: 'config-1', version_number: 1, status: 'draft',
          checksum: 'abc', profile
        }],
        evaluationRuns: [{
          id: 'run-failed', config_id: 'config-1', status: 'failed',
          case_count: 150, overall_score: 0.763, safety_score: 0.967,
          failure_categories: [{ category: 'intent_mismatch', count: 66 }]
        }]
      })
    })
    render(<OpenClawAgentStudio />)
    fireEvent.click(await screen.findByRole('button', { name: '查看失败明细' }))
    expect(await screen.findByText(/失败明细/)).toBeInTheDocument()
    expect(screen.getByText('schedule_core-01')).toBeInTheDocument()
    expect(screen.getByText(/fields: domain, objectType/)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/settings/openclaw-agent/evaluation-run?environment=preview&runId=run-failed',
      expect.objectContaining({ credentials: 'same-origin' })
    )
  })

  it('switches Preview and Production without mixing requests', async () => {
    render(<OpenClawAgentStudio />)
    await screen.findByLabelText('理解模型')
    fireEvent.click(screen.getByRole('button', { name: 'Production' }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/settings/openclaw-agent?environment=production',
        expect.objectContaining({ credentials: 'same-origin' })
      )
    })
  })

  it('runs evaluation for the selected draft and refreshes the report', async () => {
    global.fetch
      .mockImplementationOnce(() => apiResponse({
        ok: true,
        environment: 'preview',
        configs: [{
          id: 'config-1', version_number: 1, status: 'draft',
          checksum: 'abc', profile
        }],
        evaluationRuns: []
      }))
      .mockImplementationOnce(() => apiResponse({
        ok: true,
        done: false,
        run: { id: 'run-1', status: 'running' },
        completedCases: 24,
        totalCases: 150
      }))
      .mockImplementationOnce(() => apiResponse({
        ok: true,
        done: true,
        run: { id: 'run-1', status: 'passed' },
        completedCases: 150,
        totalCases: 150
      }))
      .mockImplementationOnce(() => apiResponse({
        ok: true,
        environment: 'preview',
        configs: [{
          id: 'config-1', version_number: 1, status: 'draft',
          checksum: 'abc', profile
        }],
        evaluationRuns: [{
          id: 'run-1', config_id: 'config-1', status: 'passed',
          case_count: 150, overall_score: 0.99, safety_score: 1
        }]
      }))
    render(<OpenClawAgentStudio />)
    fireEvent.click(await screen.findByRole('button', { name: '运行完整评估' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/settings/openclaw-agent/evaluate',
      expect.objectContaining({ method: 'POST' })
    ))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/settings/openclaw-agent/evaluate',
      expect.objectContaining({
        body: JSON.stringify({
          environment: 'preview', configId: 'config-1', runId: 'run-1'
        })
      })
    )
    expect(await screen.findByText('99.0%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发布此版本' })).toBeEnabled()
  })

  it('recovers from a non-JSON evaluation gateway response by refreshing run state', async () => {
    global.fetch
      .mockImplementationOnce(() => apiResponse({
        ok: true, environment: 'preview',
        configs: [{
          id: 'config-1', version_number: 1, status: 'draft',
          checksum: 'abc', profile
        }],
        evaluationRuns: []
      }))
      .mockImplementationOnce(() => htmlResponse())
      .mockImplementationOnce(() => apiResponse({
        ok: true, environment: 'preview',
        configs: [{
          id: 'config-1', version_number: 1, status: 'draft',
          checksum: 'abc', profile
        }],
        evaluationRuns: [{
          id: 'run-recovered', config_id: 'config-1', status: 'failed',
          case_count: 150, overall_score: 0.58, safety_score: 0.77
        }]
      }))
    render(<OpenClawAgentStudio />)
    fireEvent.click(await screen.findByRole('button', { name: '运行完整评估' }))
    expect(await screen.findByText(/评估连接中断，已刷新服务器状态/)).toBeInTheDocument()
    expect(screen.getByText('58.0%')).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument()
  })
})
