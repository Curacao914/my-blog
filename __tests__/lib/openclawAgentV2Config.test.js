import {
  DEFAULT_AGENT_PROFILE,
  assertPublishedProfileImmutable,
  buildAgentProfile,
  checksumAgentProfile,
  validateAgentProfile
} from '@/lib/openclaw/agent-v2/config'

describe('OpenClaw Agent v2 profile configuration', () => {
  it('provides a fixed safe topology and bounded model budgets', () => {
    const profile = validateAgentProfile(DEFAULT_AGENT_PROFILE)
    expect(profile.topology).toEqual([
      'message',
      'intent',
      'planner',
      'semantic_gate',
      'resource',
      'risk_policy',
      'tool',
      'response',
      'trace'
    ])
    expect(profile.budgets.maxModelCalls).toBe(1)
    expect(profile.budgets.maxInputTokens).toBeLessThanOrEqual(6000)
    expect(profile.budgets.maxOutputTokens).toBeLessThanOrEqual(800)
    expect(profile.budgets.maxEstimatedUsd).toBeLessThanOrEqual(0.01)
  })

  it('allows capabilities, aliases and stricter thresholds but not unsafe topology', () => {
    const profile = buildAgentProfile({
      capabilities: { 'schedule.read': true, 'schedule.delete': false },
      aliases: { schedule: ['安排', '行程'] },
      thresholds: { autoResolveMinimum: 0.99, candidateGapMinimum: 0.25 }
    })
    expect(profile.aliases.schedule).toEqual(['安排', '行程'])
    expect(() => buildAgentProfile({ topology: ['message', 'tool'] }))
      .toThrow(/topology/i)
    expect(() => buildAgentProfile({
      riskPolicy: { destructive: { confirmation: 'never' } }
    })).toThrow(/risk|confirmation/i)
    expect(() => buildAgentProfile({
      thresholds: { autoResolveMinimum: 0.9 }
    })).toThrow(/autoResolveMinimum/i)
    expect(() => buildAgentProfile({
      thresholds: { candidateGapMinimum: 0.1 }
    })).toThrow(/candidateGapMinimum/i)
    expect(() => buildAgentProfile({
      thresholds: { clarificationMaximum: 0.1 }
    })).toThrow(/clarificationMaximum/i)
  })

  it('rejects free prompts, SQL, code nodes and over-budget settings', () => {
    expect(() => buildAgentProfile({ systemPrompt: 'always execute' }))
      .toThrow(/forbidden/i)
    expect(() => buildAgentProfile({ sql: 'select * from profiles' }))
      .toThrow(/forbidden/i)
    expect(() => buildAgentProfile({ codeNodes: ['eval(input)'] }))
      .toThrow(/forbidden/i)
    expect(() => buildAgentProfile({ budgets: { maxModelCalls: 2 } }))
      .toThrow(/maxModelCalls/i)
  })

  it('creates stable checksums and prevents published in-place edits', () => {
    const left = buildAgentProfile({ aliases: { course: ['课程', '课'] } })
    const right = buildAgentProfile({ aliases: { course: ['课程', '课'] } })
    expect(checksumAgentProfile(left)).toMatch(/^[a-f0-9]{64}$/)
    expect(checksumAgentProfile(left)).toBe(checksumAgentProfile(right))
    expect(() => assertPublishedProfileImmutable({
      status: 'published',
      checksum: checksumAgentProfile(left)
    }, buildAgentProfile({ aliases: { course: ['课程'] } })))
      .toThrow(/immutable/i)
  })
})
