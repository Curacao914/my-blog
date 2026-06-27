import {
  buildCoursePublicationModel,
  isCourseContentSource
} from '@/lib/contentPublishingModel'

describe('course publication defaults', () => {
  it('uses 遇事不决 as the note category and course name as the collection', () => {
    const model = buildCoursePublicationModel({
      jobId: 'job-1',
      workflow: { courseSpec: { courseName: '经济法', teacher: '老师' } },
      lesson: {
        key: 'lesson-1',
        order: 1,
        title: '第一课',
        finalNote: { markdown: '# 市场失灵\n\n正文内容。' }
      }
    })

    expect(model.settings.category).toBe('遇事不决')
    expect(model.settings.collection).toBe('经济法')
    expect(model.settings.folderPath).toEqual(['遇事不决', '经济法'])
    expect(model.source).toBe('course-worker')
    expect(model.sourceId).toBe('job-1:lesson-1')
    expect(isCourseContentSource('course-worker')).toBe(true)
    expect(isCourseContentSource('course-workflow')).toBe(true)
    expect(model.settings.accessMode).toBe('private')
  })

  it('normalizes nested slugs and preserves explicit hierarchy choices', () => {
    const model = buildCoursePublicationModel({
      jobId: 'job-1',
      workflow: { courseSpec: { courseName: '经济法' } },
      lesson: {
        key: 'lesson-2',
        order: 2,
        title: '第二课',
        finalNote: { markdown: '# 第二课\n\n正文。' }
      },
      settings: {
        category: '法律之上',
        collection: '专题论文',
        slug: 'articles/Market Failure',
        accessMode: 'public'
      }
    })

    expect(model.slug).toBe('articles/market-failure')
    expect(model.settings.folderPath).toEqual(['法律之上', '专题论文'])
    expect(model.settings.allowIndexing).toBe(true)
  })
})
