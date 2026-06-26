const orderedLessons = workflow => [...(workflow.lessons || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
const latestReview = node => (node.reviewerReports || []).at(-1)?.value || null

function nodeTask(workflow, lesson) {
  const max = Number(workflow.courseSpec?.maxAutoRevisions || 2)
  const revision = (lesson.nodes || []).find(node => node.status === 'node_revision_required')
  if (revision) {
    const count = Number(revision.revisionCount || revision.revisionRequests?.length || 0)
    if (count >= max || revision.humanReviewRequired) return { type: 'idle', reason: 'waiting-node-human-review', lessonKey: lesson.key, nodeId: revision.id }
    return { type: 'revise-node', taskKey: `revise:${lesson.key}:${revision.id}:${count + 1}`, lessonKey: lesson.key, node: revision, courseSpec: workflow.courseSpec, lessonBlueprint: lesson.blueprint, outline: lesson.outline }
  }
  const pending = (lesson.nodes || []).find(node => node.status === 'node_pending')
  if (pending) return { type: 'write-node', taskKey: `write:${lesson.key}:${pending.id}:${(pending.versions || []).length + 1}`, lessonKey: lesson.key, node: pending, courseSpec: workflow.courseSpec, lessonBlueprint: lesson.blueprint, outline: lesson.outline }
  const review = (lesson.nodes || []).find(node => node.status === 'node_review' && (node.reviewRequired || !latestReview(node)))
  if (review) return { type: 'review-node', taskKey: `review:${lesson.key}:${review.id}:${(review.reviewerReports || []).length + 1}`, lessonKey: lesson.key, node: review, courseSpec: workflow.courseSpec, lessonBlueprint: lesson.blueprint, outline: lesson.outline }
  const human = (lesson.nodes || []).find(node => node.status === 'node_review' && ['approve', 'human_review'].includes(latestReview(node)?.decision))
  if (human) return { type: 'idle', reason: 'waiting-node-approval', lessonKey: lesson.key, nodeId: human.id }
  return null
}

export function getNextCourseWorkerTask(workflow) {
  if (!workflow || workflow.cancelled || workflow.status === 'cancelled') return { type: 'idle', reason: 'cancelled' }
  if (workflow.paused || workflow.status === 'paused') return { type: 'idle', reason: 'paused' }
  if (workflow.status === 'failed') return { type: 'idle', reason: 'failed' }
  const lesson = orderedLessons(workflow).find(item => item.status !== 'completed')
  if (!lesson) return { type: 'idle', reason: 'completed' }
  if (lesson.status === 'preflight_required' || workflow.status === 'preflight_required') return { type: 'idle', reason: 'waiting-preflight', lessonKey: lesson.key }
  if (['preflight_approved', 'outline_pending', 'outline_generating'].includes(lesson.status) || ['preflight_approved', 'outline_pending', 'outline_generating'].includes(workflow.status)) return {
    type: 'generate-outline', taskKey: `outline:${lesson.key}:${(lesson.outlineVersions || []).length + 1}`, lessonKey: lesson.key, courseSpec: workflow.courseSpec,
    lesson: { key: lesson.key, title: lesson.title, transcript: lesson.transcript, sourceMap: lesson.sourceMap, pptText: lesson.pptText, supplements: lesson.supplements }
  }
  if (lesson.status === 'outline_review' || workflow.status === 'outline_review') return { type: 'idle', reason: 'waiting-outline-approval', lessonKey: lesson.key }
  if (['outline_approved', 'node_planning'].includes(lesson.status) || ['outline_approved', 'node_planning'].includes(workflow.status)) return { type: 'plan-nodes', taskKey: `plan:${lesson.key}:${(lesson.outlineVersions || []).length}`, lessonKey: lesson.key }
  if (['node_pending', 'node_generating', 'node_review', 'node_revision_required'].includes(lesson.status) || ['node_pending', 'node_generating', 'node_review', 'node_revision_required'].includes(workflow.status)) {
    const task = nodeTask(workflow, lesson); if (task) return task
  }
  if (lesson.status === 'assembly_pending' || workflow.status === 'assembly_pending') return { type: 'assemble', taskKey: `assemble:${lesson.key}:${(lesson.finalNoteVersions || []).length + 1}`, lessonKey: lesson.key }
  if (lesson.status === 'final_review' || workflow.status === 'final_review') return { type: 'final-review', taskKey: `final-review:${lesson.key}:${(lesson.finalReviewReports || []).length + 1}`, lessonKey: lesson.key, courseSpec: workflow.courseSpec, lesson: { key: lesson.key, title: lesson.title, blueprint: lesson.blueprint, transcript: lesson.transcript, finalNote: lesson.finalNote, nodes: lesson.nodes } }
  if (lesson.status === 'final_review_human' || workflow.status === 'final_review_human') return { type: 'idle', reason: 'waiting-final-human-review', lessonKey: lesson.key }
  return { type: 'idle', reason: lesson.status || workflow.status || 'no-pending-step', lessonKey: lesson.key }
}

export function workerStatusPatch({ online = true, message = '' } = {}) {
  return { status: online ? 'online' : 'offline', lastSeenAt: new Date().toISOString(), message }
}
