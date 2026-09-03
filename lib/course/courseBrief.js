import { buildPrompt, callCourseModel } from '@/lib/course/aiAdapter'
import { cleanText } from '@/lib/course/textpack'

function list(values = [], maximum = 6) {
  return (Array.isArray(values) ? values : [])
    .map(value => cleanText(
      typeof value === 'string'
        ? value
        : value?.text || value?.title || value?.name || ''
    ))
    .filter(Boolean)
    .slice(0, maximum)
}

function bullets(title, values = []) {
  if (!values.length) return ''
  return [
    `## ${title}`,
    '',
    ...values.map(value => `- ${value}`)
  ].join('\n')
}

export function normalizeCourseBrief(value = {}, {
  courseName = '',
  teacher = '',
  lessonTitle = ''
} = {}) {
  const mainLine = cleanText(value.mainLine || value.main_line || value.summary || '')
  const coreQuestions = list(value.coreQuestions || value.core_questions, 5)
  const teacherSignals = list(value.teacherSignals || value.teacher_signals, 6)
  const authorities = list(value.authorities || value.rules || value.statutes, 8)
  const cases = list(value.cases, 6)
  const connections = list(value.connections || value.knowledgeConnections, 5)
  const keyPoints = list(value.keyPoints || value.key_points, 6)
  const title = cleanText(value.title) || `${courseName}｜${lessonTitle}`
  const modelMarkdown = cleanText(value.markdown)

  const markdown = modelMarkdown || [
    `# ${title}`,
    '',
    `> ${[courseName, lessonTitle, teacher].filter(Boolean).join(' · ')}`,
    '',
    '## 本课主线',
    '',
    mainLine || '本课围绕已确认的课程主线展开。',
    '',
    bullets('核心问题', coreQuestions),
    '',
    bullets('关键内容', keyPoints),
    '',
    bullets('老师明确强调', teacherSignals),
    '',
    bullets('法条、案例与材料', [...authorities, ...cases]),
    '',
    bullets('与既有知识的连接', connections)
  ].filter(Boolean).join('\n')

  const messagePoints = keyPoints.length
    ? keyPoints.slice(0, 3)
    : coreQuestions.slice(0, 3)
  const messageText = cleanText(value.messageText || value.message_text) || [
    title,
    '',
    mainLine,
    ...messagePoints.map(point => `• ${point}`)
  ].filter(Boolean).join('\n')

  return {
    title,
    mainLine,
    coreQuestions,
    keyPoints,
    teacherSignals,
    authorities,
    cases,
    connections,
    markdown,
    messageText
  }
}

export async function generateCourseBrief({
  workflow,
  lesson,
  modelConfig
}) {
  const courseName = workflow.courseSpec?.courseName || ''
  const teacher = workflow.courseSpec?.teacher || ''
  const finalNote = cleanText(lesson.finalNote?.markdown || '')
  if (!finalNote) throw new Error('完整课程笔记尚未生成，无法制作课程简报')

  const result = await callCourseModel({
    config: modelConfig,
    role: 'brief',
    prompt: buildPrompt({
      role: 'brief',
      promptVersion: `${workflow.courseSpec?.promptVersion || 'course-controlled-v4-pipeline'}-brief-v1`,
      courseSpec: workflow.courseSpec,
      lessonBlueprint: {
        title: lesson.title,
        mainLine: lesson.blueprint?.mainLine || '',
        outline: (lesson.outline || []).map(node => ({
          id: node.id,
          title: node.title,
          rationale: node.rationale,
          concepts: node.concepts || [],
          statutes: node.statutes || [],
          cases: node.cases || []
        })),
        instruction: [
          '生成一份五至十分钟可读完的课程简报。',
          '必须保留本课主线、三至五个核心问题、教师明确强调、重要案例或法条、与前后课程的关系。',
          '不要把完整笔记机械截短，也不得新增来源中没有的内容。',
          'Markdown 应当可直接作为站内阅读正文。'
        ].join('')
      },
      writerBrief: {
        courseName,
        teacher,
        lessonTitle: lesson.title,
        purpose: 'course-brief'
      },
      sourceText: finalNote,
      pptText: '',
      schema: {
        title: 'string',
        mainLine: 'string',
        coreQuestions: ['string'],
        keyPoints: ['string'],
        teacherSignals: ['string'],
        authorities: ['string'],
        cases: ['string'],
        connections: ['string'],
        markdown: 'string',
        messageText: 'string'
      }
    })
  })

  return {
    brief: normalizeCourseBrief(result.parsed, {
      courseName,
      teacher,
      lessonTitle: lesson.title
    }),
    trace: result.trace
  }
}
