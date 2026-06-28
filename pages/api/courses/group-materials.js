import crypto from 'crypto'

import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { buildPrompt, callCourseModel } from '@/lib/course/aiAdapter'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb'
    }
  }
}

function cleanLessons(value = []) {
  return (Array.isArray(value) ? value : []).slice(0, 80).map((lesson, index) => ({
    key: String(lesson?.key || `lesson-${index + 1}`).slice(0, 120),
    title: String(lesson?.title || `课次 ${index + 1}`).slice(0, 160),
    order: Math.max(1, Number(lesson?.order || index + 1)),
    date: String(lesson?.date || '').slice(0, 40),
    confidence: ['high', 'medium', 'low'].includes(lesson?.confidence) ? lesson.confidence : 'medium',
    reason: String(lesson?.reason || '').slice(0, 500),
    evidence: (Array.isArray(lesson?.evidence) ? lesson.evidence : []).slice(0, 8).map(value => String(value || '').slice(0, 1200)).filter(Boolean),
    existing: Boolean(lesson?.existing)
  }))
}

function cleanAssignments(value = [], materialKeys = new Set(), lessonKeys = new Set()) {
  return (Array.isArray(value) ? value : []).slice(0, 240).flatMap((assignment, index) => {
    const materialKey = String(assignment?.materialKey || '')
    const scope = ['lesson', 'course', 'unassigned'].includes(assignment?.scope) ? assignment.scope : 'unassigned'
    const lessonKey = scope === 'lesson' ? String(assignment?.lessonKey || '') : ''
    if (!materialKeys.has(materialKey)) return []
    if (scope === 'lesson' && !lessonKeys.has(lessonKey)) return []
    const range = assignment?.range && typeof assignment.range === 'object'
      ? {
          unit: ['page', 'line', 'paragraph', 'whole'].includes(assignment.range.unit) ? assignment.range.unit : 'whole',
          start: Math.max(1, Number(assignment.range.start || 1)),
          end: Math.max(1, Number(assignment.range.end || assignment.range.start || 1))
        }
      : { unit: 'whole', start: 1, end: 1 }
    range.end = Math.max(range.start, range.end)
    return [{
      id: String(assignment?.id || `ai-assignment-${index + 1}`).slice(0, 120),
      materialKey,
      lessonKey,
      scope,
      range,
      confidence: ['high', 'medium', 'low'].includes(assignment?.confidence) ? assignment.confidence : 'low',
      reason: String(assignment?.reason || '').slice(0, 700)
    }]
  })
}

export default async function handler(req, res) {
  const requestId = crypto.randomUUID()
  const auth = await requireCourseWorkspace(req, { ai: true })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, stage: 'group-materials', requestId })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed', stage: 'group-materials', requestId })
  }

  try {
    const materials = Array.isArray(req.body?.materials) ? req.body.materials.slice(0, 80) : []
    const existingLessons = cleanLessons(req.body?.existingLessons || [])
    if (!materials.length) return res.status(400).json({ ok: false, error: '没有可分析的课程材料', stage: 'group-materials', requestId })

    const materialKeys = new Set(materials.map(material => String(material?.clientKey || '')).filter(Boolean))
    const result = await callCourseModel({
      config: auth.modelConfig,
      role: 'grouping',
      prompt: buildPrompt({
        role: 'grouping',
        promptVersion: 'course-material-grouping-v1',
        courseSpec: {
          courseName: String(req.body?.courseName || '').slice(0, 160),
          rules: [
            '已有课次保持原 key，不得删除或重命名。',
            '一份材料可以有多个 assignment。',
            '课件按页码分段，转录按行号分段，文档按段落分段。',
            '低置信度材料可以设为 unassigned。'
          ]
        },
        lessonBlueprint: { existingLessons },
        writerBrief: { task: 'lesson-candidate-and-material-assignment' },
        sourceText: JSON.stringify(materials),
        pptText: '',
        schema: {
          lessons: [{ key: 'string', title: 'string', order: 1, date: 'string', confidence: 'high|medium|low', reason: 'string', existing: false }],
          assignments: [{ materialKey: 'string', lessonKey: 'string', scope: 'lesson|course|unassigned', range: { unit: 'page|line|paragraph|whole', start: 1, end: 1 }, confidence: 'high|medium|low', reason: 'string' }]
        }
      })
    })

    const rawLessons = cleanLessons(result.parsed?.lessons || [])
    const existingKeys = new Set(existingLessons.map(lesson => lesson.key))
    const lessons = [...existingLessons]
    rawLessons.forEach(lesson => {
      if (existingKeys.has(lesson.key)) return
      const uniqueKey = lessons.some(item => item.key === lesson.key) ? `${lesson.key}-${lessons.length + 1}` : lesson.key
      lessons.push({ ...lesson, key: uniqueKey, existing: false })
    })
    const lessonKeys = new Set(lessons.map(lesson => lesson.key))
    const assignments = cleanAssignments(result.parsed?.assignments || [], materialKeys, lessonKeys)

    return res.status(200).json({ ok: true, lessons, assignments, trace: result.trace, requestId })
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : '课程材料分析失败',
      stage: 'group-materials',
      requestId
    })
  }
}
