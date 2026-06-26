export function getNextCourseWorkerTask(workflow) {
  if (!workflow || workflow.cancelled || workflow.status === 'cancelled') {
    return { type: 'idle', reason: 'cancelled' }
  }
  if (workflow.paused || workflow.status === 'paused') {
    return { type: 'idle', reason: 'paused' }
  }
  if (workflow.status === 'failed') {
    return { type: 'idle', reason: 'failed' }
  }

  const lesson = workflow.lessons?.[0]
  if (!lesson) return { type: 'idle', reason: 'no-lesson' }

  if (workflow.status === 'preflight_approved' || workflow.status === 'outline_pending') {
    return {
      type: 'generate-outline',
      lessonKey: lesson.key,
      courseSpec: workflow.courseSpec,
      lesson: {
        key: lesson.key,
        title: lesson.title,
        transcript: lesson.transcript,
        sourceMap: lesson.sourceMap,
        pptText: lesson.pptText
      }
    }
  }

  if (workflow.status === 'outline_approved') {
    return {
      type: 'plan-nodes',
      lessonKey: lesson.key
    }
  }

  if (workflow.status === 'node_pending' || workflow.status === 'node_review' || workflow.status === 'node_revision_required') {
    const node = lesson.nodes?.find(item =>
      ['node_pending', 'node_revision_required'].includes(item.status)
    )
    if (node) {
      return {
        type: node.status === 'node_revision_required' ? 'revise-node' : 'write-node',
        lessonKey: lesson.key,
        node,
        courseSpec: workflow.courseSpec,
        lessonBlueprint: lesson.blueprint,
        outline: lesson.outline
      }
    }
  }

  if (workflow.status === 'assembly_pending') {
    return {
      type: 'assemble',
      lessonKey: lesson.key
    }
  }

  if (workflow.status === 'final_review') {
    return {
      type: 'final-review',
      lessonKey: lesson.key,
      courseSpec: workflow.courseSpec,
      lesson: {
        key: lesson.key,
        title: lesson.title,
        blueprint: lesson.blueprint,
        finalNote: lesson.finalNote,
        nodes: lesson.nodes
      }
    }
  }

  return { type: 'idle', reason: workflow.status || 'no-pending-step' }
}

export function workerStatusPatch({ online = true, message = '' } = {}) {
  return {
    status: online ? 'online' : 'offline',
    lastSeenAt: new Date().toISOString(),
    message
  }
}
