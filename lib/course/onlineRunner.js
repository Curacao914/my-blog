import { buildPrompt, callCourseModel } from './aiAdapter'

function validateOutline(value) {
  if (!value || typeof value.mainLine !== 'string' || !Array.isArray(value.outline) || !value.outline.length) {
    throw new Error('大纲生成结果格式无效')
  }
  value.outline.forEach((node, index) => {
    if (!node?.title || !Array.isArray(node.lineRange) || node.lineRange.length !== 2) {
      throw new Error(`大纲第 ${index + 1} 个节点格式无效`)
    }
  })
  return value
}

function validateMarkdown(value) {
  if (!value || typeof value.markdown !== 'string' || !value.markdown.trim()) throw new Error('正文生成结果为空')
  return value
}

function validateReview(value) {
  if (!value || !['approve', 'revise', 'human_review'].includes(value.decision)) throw new Error('审查结果无效')
  for (const key of ['coverage', 'grounding', 'logic', 'detail', 'sourceCoverage']) {
    const score = Number(value[key])
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`审查分数 ${key} 无效`)
    value[key] = score
  }
  value.issues = Array.isArray(value.issues) ? value.issues : []
  return value
}

export async function executeCourseTask(task) {
  if (!task || task.type === 'idle') return null
  if (task.type === 'plan-nodes') return { type: 'plan-nodes', lessonKey: task.lessonKey, taskKey: task.taskKey }
  if (task.type === 'assemble') return { type: 'assemble', lessonKey: task.lessonKey, taskKey: task.taskKey }

  if (task.type === 'generate-outline') {
    const result = await callCourseModel({
      role: 'outline',
      prompt: buildPrompt({
        role: 'outline',
        promptVersion: task.courseSpec?.promptVersion,
        courseSpec: task.courseSpec,
        lessonBlueprint: { title: task.lesson.title },
        sourceText: task.lesson.transcript,
        pptText: JSON.stringify([...(task.lesson.pptText || []), ...(task.lesson.supplements || [])]),
        schema: {
          mainLine: 'string',
          outline: [{ title: 'string', lineRange: [1, 10], slideRange: [1, 1], rationale: 'string', importance: 'high|normal|low', concepts: [], statutes: [], cases: [] }]
        }
      })
    })
    const value = validateOutline(result.parsed)
    return { type: 'save-outline', lessonKey: task.lessonKey, mainLine: value.mainLine, outline: value.outline, taskKey: task.taskKey, trace: result.trace }
  }

  if (['write-node', 'revise-node'].includes(task.type)) {
    const role = task.type === 'revise-node' ? 'revision' : 'writer'
    const result = await callCourseModel({
      role,
      prompt: buildPrompt({
        role,
        promptVersion: task.courseSpec?.promptVersion,
        courseSpec: task.courseSpec,
        lessonBlueprint: task.lessonBlueprint,
        writerBrief: {
          ...(task.node.writerBrief || {}),
          revisionRequests: task.node.revisionRequests || [],
          reviewerIssues: task.node.reviewerReports?.at?.(-1)?.value?.issues || []
        },
        sourceText: task.node.sourceText,
        pptText: task.node.pptText,
        previousNodeSummary: task.node.writerBrief?.previousNodeSummary,
        nextNodeTarget: task.node.writerBrief?.nextNodeTarget,
        schema: { markdown: 'string' }
      })
    })
    return {
      type: 'save-node-draft-worker',
      lessonKey: task.lessonKey,
      nodeId: task.node.id,
      markdown: validateMarkdown(result.parsed).markdown,
      source: role,
      taskKey: task.taskKey,
      trace: result.trace
    }
  }

  if (task.type === 'review-node') {
    const result = await callCourseModel({
      role: 'reviewer',
      prompt: buildPrompt({
        role: 'reviewer',
        promptVersion: task.courseSpec?.promptVersion,
        courseSpec: task.courseSpec,
        lessonBlueprint: task.lessonBlueprint,
        writerBrief: { ...(task.node.writerBrief || {}), nodeId: task.node.id, title: task.node.title, currentDraft: task.node.draft },
        sourceText: task.node.sourceText,
        pptText: task.node.pptText,
        schema: {
          coverage: 0,
          grounding: 0,
          logic: 0,
          detail: 0,
          sourceCoverage: 0,
          issues: [{ type: 'string', severity: 'high|medium|low', message: 'string', nodeId: task.node.id, sourceRange: 'string' }],
          decision: 'approve|revise|human_review'
        }
      })
    })
    return { type: 'save-node-review', lessonKey: task.lessonKey, nodeId: task.node.id, reviewerReport: validateReview(result.parsed), taskKey: task.taskKey, trace: result.trace }
  }

  if (task.type === 'final-review') {
    const result = await callCourseModel({
      role: 'finalReview',
      prompt: buildPrompt({
        role: 'finalReview',
        promptVersion: task.courseSpec?.promptVersion,
        courseSpec: task.courseSpec,
        lessonBlueprint: task.lesson?.blueprint,
        writerBrief: { lessonTitle: task.lesson?.title, nodes: (task.lesson?.nodes || []).map(node => ({ id: node.id, title: node.title, lineRange: node.lineRange })) },
        sourceText: (task.lesson?.nodes || []).map(node => `[${node.id}]\n${node.sourceText || ''}`).join('\n\n'),
        pptText: task.lesson?.finalNote?.markdown,
        schema: {
          coverage: 0,
          grounding: 0,
          logic: 0,
          detail: 0,
          sourceCoverage: 0,
          issues: [{ type: 'string', severity: 'high|medium|low', message: 'string', nodeId: 'string' }],
          decision: 'approve|revise|human_review'
        }
      })
    })
    return { type: 'complete-final-review', lessonKey: task.lessonKey, qualityReport: validateReview(result.parsed), taskKey: task.taskKey, trace: result.trace }
  }
  throw new Error(`不支持的课程处理步骤：${task.type}`)
}
