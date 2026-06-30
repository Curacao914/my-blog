import { normalizeCourseBrief } from '@/lib/course/courseBrief'

describe('course brief artifact', () => {
  it('keeps the main line and core learning signals', () => {
    const brief = normalizeCourseBrief({
      mainLine: '本课围绕国家责任的构成与法律后果展开。',
      coreQuestions: ['何时归责？', '何时排除不法性？', '法律后果是什么？'],
      keyPoints: ['行为归属于国家', '违反国际义务', '停止与赔偿'],
      teacherSignals: ['重点区分归责与违法性']
    }, {
      courseName: '国际法学',
      lessonTitle: '国家责任'
    })
    expect(brief.title).toContain('国际法学')
    expect(brief.markdown).toContain('本课主线')
    expect(brief.markdown).toContain('重点区分归责与违法性')
    expect(brief.messageText).toContain('国家责任')
  })
})
