import {
  applyCourseWorkflowActionForWorker,
  getCourseJobById
} from '@/lib/courseRepository'
import { getNextCourseWorkerTask } from '@/lib/course/workerTasks'

function hasWorkerToken(req) {
  const expected = process.env.COURSE_WORKER_TOKEN
  if (!expected) return false
  const header = req.headers['x-course-worker-token'] || ''
  const bearer = String(req.headers.authorization || '').startsWith('Bearer ')
    ? String(req.headers.authorization).slice('Bearer '.length)
    : ''
  return header === expected || bearer === expected
}

function cleanError(error) {
  return error instanceof Error ? error.message : 'Invalid worker request'
}

export default async function handler(req, res) {
  if (!hasWorkerToken(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const jobId = String(req.query?.id || '').trim()
  if (!jobId) return res.status(400).json({ ok: false, error: 'Course job id is required' })

  try {
    if (req.method === 'GET') {
      const job = await getCourseJobById(jobId)
      if (!job) return res.status(404).json({ ok: false, error: 'Course job not found' })
      const workflow = job.preprocess_result?.workflow
      const task = getNextCourseWorkerTask(workflow)
      return res.status(200).json({ ok: true, task, workflowStatus: workflow?.status || null })
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const result = await applyCourseWorkflowActionForWorker(jobId, req.body || {})
      const task = getNextCourseWorkerTask(result.workflow)
      return res.status(200).json({ ok: true, ...result, nextTask: task })
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    const message = cleanError(error)
    return res.status(400).json({ ok: false, error: message })
  }
}
