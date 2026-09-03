import { buildPrompt, callCourseModel, extractCourseModelContent, parseJsonResponse, requireCourseModelConfig } from '@/lib/course/aiAdapter'

describe('course AI adapter', () => {
  it('builds role-specific prompts with source material and prompt version', () => {
    const prompt = buildPrompt({
      role: 'writer',
      promptVersion: 'course-mvp-v1',
      courseSpec: { courseName: '证据法', goal: '闭卷复习' },
      lessonBlueprint: { mainLine: '证据规则' },
      writerBrief: { currentNodeGoal: '解释证明责任' },
      sourceText: '转录正文',
      pptText: 'PPT 正文'
    })

    expect(prompt.system).toContain('writer')
    expect(prompt.user).toContain('CourseSpec')
    expect(prompt.user).toContain('转录正文')
    expect(prompt.user).toContain('course-mvp-v1')
  })

  it('rejects missing model configuration for a role', () => {
    const previous = process.env.COURSE_AI_API_KEY
    delete process.env.COURSE_AI_API_KEY

    expect(() => requireCourseModelConfig('writer')).toThrow(/COURSE_AI_API_KEY/)

    if (previous) process.env.COURSE_AI_API_KEY = previous
  })

  it('parses valid JSON and rejects empty or invalid model output', () => {
    expect(parseJsonResponse('```json\n{"decision":"approve"}\n```')).toEqual({ decision: 'approve' })
    expect(() => parseJsonResponse('')).toThrow(/empty/)
    expect(() => parseJsonResponse('not json')).toThrow(/valid JSON/)
  })

  it('recovers common OpenAI-compatible JSON formatting defects', () => {
    expect(parseJsonResponse('<think>先分析</think>\n结果如下：\n```json\n{"decision":"approve",}\n```')).toEqual({ decision: 'approve' })
    expect(parseJsonResponse('说明文字\n{"markdown":"第一段\n\n第二段"}\n结束')).toEqual({ markdown: '第一段\n\n第二段' })
    expect(parseJsonResponse('"{\\"decision\\":\\"revise\\"}"')).toEqual({ decision: 'revise' })
  })

  it('accepts structured and multipart model content', () => {
    expect(extractCourseModelContent({ choices: [{ message: { content: { decision: 'approve' } } }] })).toEqual({ decision: 'approve' })
    expect(extractCourseModelContent({ choices: [{ message: { content: [{ type: 'text', text: '{"decision":' }, { type: 'text', text: '"approve"}' }] } }] })).toBe('{"decision":"approve"}')
  })

  it('preserves a sanitized provider error message for failed model calls', async () => {
    const previousFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 402,
      text: async () => JSON.stringify({
        error: {
          message: 'Insufficient Balance',
          type: 'invalid_request_error'
        }
      })
    })

    try {
      await expect(callCourseModel({
        role: 'outline',
        prompt: { system: 'system', user: 'user', version: 'test' },
        config: {
          provider: 'deepseek',
          source: 'user',
          baseUrl: 'https://api.deepseek.com/v1',
          apiKey: 'secret-key-that-must-not-appear',
          models: { outline: 'deepseek-chat' }
        }
      })).rejects.toThrow(
        'Course model call failed: 402 · user@api.deepseek.com/deepseek-chat · invalid_request_error: Insufficient Balance'
      )
    } finally {
      global.fetch = previousFetch
    }
  })
})
