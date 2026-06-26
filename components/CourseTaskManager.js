import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'

import { CourseApiError, formatCourseApiError, requestCourseJson } from '@/lib/course/clientApi'
import { formatCourseWorkflowError, getCurrentCourseError } from '@/lib/course/errorState'

const CourseTaskContext = createContext(null)
const STORAGE_KEY = 'law-tech-course-active-tasks-v2'
const AUTO_STATUSES = new Set([
  'preflight_approved', 'outline_pending', 'outline_generating', 'outline_approved', 'node_planning',
  'node_pending', 'node_generating', 'node_review', 'node_revision_required', 'assembly_pending',
  'assembling', 'final_review'
])
const HUMAN_STATUSES = new Set(['preflight_required', 'outline_review', 'final_review_human'])
const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])
const MAX_RECONNECT_ATTEMPTS = 5

function activeLesson(workflow) {
  return workflow?.lessons?.find(lesson => lesson.status !== 'completed') || workflow?.lessons?.at?.(-1) || null
}

function workflowStatus(workflow) {
  const lesson = activeLesson(workflow)
  return lesson?.status || workflow?.status || 'preflight_required'
}

function labelForWorkflow(workflow) {
  const status = workflowStatus(workflow)
  const labels = {
    preflight_required: '等待设置偏好', outline_pending: '正在生成大纲', outline_generating: '正在生成大纲',
    outline_review: '大纲待确认', outline_approved: '正在准备正文', node_planning: '正在准备正文',
    node_pending: '正在整理正文', node_generating: '正在整理正文', node_review: '正在审查正文',
    node_revision_required: '正在修改正文', assembly_pending: '正在整理全文', assembling: '正在整理全文',
    final_review: '正在最终检查', final_review_human: '最终笔记待确认', completed: '课程整理完成',
    failed: '课程处理失败', paused: '课程已暂停', cancelled: '课程已取消'
  }
  return labels[status] || '课程处理中'
}

function taskStateForWorkflow(workflow) {
  const status = workflowStatus(workflow)
  if (status === 'failed' || workflow?.status === 'failed') return 'error'
  if (TERMINAL_STATUSES.has(status)) return 'done'
  if (HUMAN_STATUSES.has(status) || status === 'paused') return 'waiting'
  return AUTO_STATUSES.has(status) ? 'running' : 'waiting'
}

function safeStoredTasks() {
  if (typeof window === 'undefined') return {}
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    if (!value || typeof value !== 'object') return {}
    return Object.fromEntries(Object.entries(value).map(([jobId, task]) => [jobId, task?.state === 'error' ? {
      ...task,
      jobId,
      active: true,
      state: 'running',
      label: '正在同步课程进度',
      error: '',
      retryCount: 0
    } : task]))
  } catch {
    return {}
  }
}

export function CourseTaskProvider({ children }) {
  const router = useRouter()
  const [tasks, setTasks] = useState({})
  const timersRef = useRef(new Map())
  const runningRef = useRef(new Set())
  const tasksRef = useRef({})

  useEffect(() => {
    const stored = safeStoredTasks()
    setTasks(stored)
  }, [])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = Object.fromEntries(Object.entries(tasks).map(([jobId, task]) => [jobId, {
      jobId,
      courseName: task.courseName || '',
      active: Boolean(task.active),
      state: task.state || 'waiting',
      label: task.label || '',
      progress: Number(task.progress || 0),
      updatedAt: task.updatedAt || new Date().toISOString(),
      error: task.error || '',
      retryCount: Number(task.retryCount || 0)
    }]))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }, [tasks])

  const patchTask = useCallback((jobId, patch) => {
    setTasks(current => ({
      ...current,
      [jobId]: {
        ...(current[jobId] || { jobId }),
        ...patch,
        jobId,
        updatedAt: new Date().toISOString()
      }
    }))
  }, [])

  const schedule = useCallback((jobId, delay = 650) => {
    const existing = timersRef.current.get(jobId)
    if (existing) window.clearTimeout(existing)
    const timer = window.setTimeout(() => {
      timersRef.current.delete(jobId)
      window.dispatchEvent(new CustomEvent('law-tech-course-task-tick', { detail: { jobId } }))
    }, delay)
    timersRef.current.set(jobId, timer)
  }, [])

  const processTask = useCallback(async jobId => {
    if (!jobId || runningRef.current.has(jobId)) return
    runningRef.current.add(jobId)
    try {
      const workflowData = await requestCourseJson(
        `/api/courses/jobs/${encodeURIComponent(jobId)}/workflow`,
        {},
        '课程进度读取失败'
      )
      let workflow = workflowData.workflow
      let state = taskStateForWorkflow(workflow)
      let status = workflowStatus(workflow)
      const currentError = getCurrentCourseError(workflow)
      patchTask(jobId, {
        workflow,
        state,
        label: labelForWorkflow(workflow),
        progress: Number(workflow?.progress || 0),
        active: state === 'running',
        error: state === 'error' ? formatCourseWorkflowError(currentError) : ''
      })

      if (state !== 'running' || !AUTO_STATUSES.has(status)) return

      const result = await requestCourseJson(
        `/api/courses/jobs/${encodeURIComponent(jobId)}/run-next`,
        { method: 'POST' },
        '课程处理失败'
      )
      workflow = result.workflow || workflow
      state = taskStateForWorkflow(workflow)
      status = workflowStatus(workflow)
      patchTask(jobId, {
        workflow,
        state,
        label: labelForWorkflow(workflow),
        progress: Number(workflow?.progress || 0),
        active: state === 'running',
        error: '',
        retryCount: 0,
        completedStep: result.completedStep || ''
      })
      if (state === 'running' && AUTO_STATUSES.has(status)) schedule(jobId, result.idle ? 1400 : 650)
    } catch (error) {
      const previous = tasksRef.current[jobId] || {}
      const status = error instanceof CourseApiError ? Number(error.status || 0) : 0
      const persistedStepFailure = error instanceof CourseApiError && status === 502 && Boolean(error.stage)
      const retryable = !persistedStepFailure && (!status || status === 408 || status === 429 || status >= 500)
      const retryCount = Number(previous.retryCount || 0) + 1
      if (retryable && retryCount <= MAX_RECONNECT_ATTEMPTS) {
        patchTask(jobId, {
          active: true,
          state: 'running',
          label: '正在重新连接',
          error: '',
          lastError: formatCourseApiError(error),
          retryCount
        })
        schedule(jobId, Math.min(12_000, 900 * (2 ** (retryCount - 1))))
      } else {
        patchTask(jobId, {
          active: false,
          state: 'error',
          label: '课程处理失败',
          error: formatCourseApiError(error),
          retryCount
        })
      }
    } finally {
      runningRef.current.delete(jobId)
    }
  }, [patchTask, schedule])

  useEffect(() => {
    const handler = event => processTask(event.detail?.jobId)
    window.addEventListener('law-tech-course-task-tick', handler)
    return () => window.removeEventListener('law-tech-course-task-tick', handler)
  }, [processTask])

  useEffect(() => {
    Object.values(tasks).forEach(task => {
      if (task.active && !timersRef.current.has(task.jobId) && !runningRef.current.has(task.jobId)) schedule(task.jobId, 80)
    })
  }, [tasks, schedule])

  useEffect(() => () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer))
    timersRef.current.clear()
  }, [])

  const startTask = useCallback((jobId, meta = {}) => {
    patchTask(jobId, {
      active: true,
      state: 'running',
      courseName: meta.courseName || tasks[jobId]?.courseName || '',
      label: meta.label || tasks[jobId]?.label || '课程处理中',
      error: '',
      lastError: '',
      retryCount: 0
    })
    schedule(jobId, 20)
  }, [patchTask, schedule, tasks])

  const pauseTask = useCallback(jobId => patchTask(jobId, { active: false, state: 'waiting' }), [patchTask])
  const dismissTask = useCallback(jobId => {
    const timer = timersRef.current.get(jobId)
    if (timer) window.clearTimeout(timer)
    timersRef.current.delete(jobId)
    setTasks(current => {
      const next = { ...current }
      delete next[jobId]
      return next
    })
  }, [])

  const value = useMemo(() => ({ tasks, startTask, pauseTask, dismissTask, taskFor: jobId => tasks[jobId] || null }), [tasks, startTask, pauseTask, dismissTask])
  const visibleTask = Object.values(tasks)
    .filter(task => task.state === 'running' || task.state === 'error' || (task.state === 'waiting' && task.active))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
  const showGlobalTask = visibleTask && router.pathname !== '/desk/courses'

  return <CourseTaskContext.Provider value={value}>
    {children}
    {showGlobalTask ? <div className={`course-global-task is-${visibleTask.state}`} role='status'>
      <button type='button' onClick={() => router.push(`/desk/courses?job=${encodeURIComponent(visibleTask.jobId)}`)}>
        <i aria-hidden='true' />
        <span><b>{visibleTask.courseName || '课程整理'}</b><small>{visibleTask.error || visibleTask.label || '处理中'}{visibleTask.state === 'running' ? ` · ${visibleTask.progress || 0}%` : ''}</small></span>
      </button>
      {visibleTask.state !== 'running' ? <button className='course-global-task-close' type='button' aria-label='关闭提示' onClick={() => dismissTask(visibleTask.jobId)}>×</button> : null}
    </div> : null}
  </CourseTaskContext.Provider>
}

export function useCourseTaskManager() {
  const value = useContext(CourseTaskContext)
  return value || {
    tasks: {},
    startTask: () => {},
    pauseTask: () => {},
    dismissTask: () => {},
    taskFor: () => null
  }
}
