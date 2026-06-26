import { buildPrompt, parseJsonResponse, requireCourseModelConfig } from '@/lib/course/aiAdapter'

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
})
