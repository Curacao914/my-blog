const fs = require('fs')
const path = require('path')

import {
  buildKnowledgePrompt,
  promptDownloadName
} from '@/lib/knowledge/prompt'

describe('external knowledge prompt', () => {
  it('requires a non-empty seed', () => {
    expect(() => buildKnowledgePrompt({ seedText: '   ' })).toThrow(
      'Knowledge seed is required'
    )
  })

  it('builds a flexible fallback without prescribing fixed answer chapters', () => {
    const prompt = buildKnowledgePrompt({
      seedText: '我看过一些平台治理案例，但不确定算法说明义务应当如何理解，希望比较不同法域，不要写成法条罗列。'
    })

    expect(prompt).toContain('我看过一些平台治理案例')
    expect(prompt).toContain('不要写成法条罗列')
    expect(prompt).toContain('Markdown')
    expect(prompt).toMatch(/事实.*推论.*不确定性/s)
    expect(prompt).toMatch(/可核查.*来源.*访问日期/s)
    expect(prompt).toMatch(/图片.*alt.*出处.*相对路径/s)
    expect(prompt).toMatch(/主 Markdown.*图片/s)
    expect(prompt).toContain('不要虚构来源')
    expect(prompt).toMatch(/值得追问/)
    expect(prompt).toMatch(/自行选择.*结构/)
    expect(prompt).not.toMatch(/##\s*(定义|背景|原因|分析|结论)/)
    expect(prompt).not.toContain('主页 AI')
  })

  it('is a pure prompt builder with no model or network integration imports', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/knowledge/prompt.js'),
      'utf8'
    )

    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toMatch(
      /from\s+['"].*(?:ai|openai|anthropic|deepseek|model).*['"]/i
    )
    expect(buildKnowledgePrompt({
      seedText: '同一个问题'
    })).toBe(buildKnowledgePrompt({
      seedText: '同一个问题'
    }))
  })

  it('creates a bounded safe markdown download name', () => {
    const name = promptDownloadName('  平台/责任：边界？  ')

    expect(name).toBe('平台-责任-边界.md')
    expect(name.length).toBeLessThanOrEqual(100)
  })
})
