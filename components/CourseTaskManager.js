import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { CourseApiError, formatCourseApiError, requestCourseJson } from '@/lib/course/clientApi'

const CourseTaskContext = createContext(null)
const STORAGE_KEY = 'law-tech-course-active-tasks-v3'
const LEGACY_STORAGE_KEY = 'law-tech-course-active-tasks-v2'
const AUTO_STATUSES = new Set(['preflight_approved', 'outline_pending', 'outline_generating', 'outline_approved', 'node_planning', 'node_pending', 'node_generating', 'node_review', 'node_revision_required', 'assembly_pending', 'assembling', 'final_revision_required'])
const HUMAN_STATUSES = new Set(['preflight_required', 'outline_review', 'node_human_review', 'final_review', 'final_review_human'])
const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])
const MAX_RECONNECT_ATTEMPTS = 5

function labelForStatus(status) {
  return ({ preflight_required: '等待设置偏好', preflight_approved: '后台准备生成大纲', outline_pending: '后台正在生成大纲', outline_generating: '后台正在生成大纲', outline_review: '大纲待确认', outline_approved: '后台正在准备正文', node_planning: '后台正在准备正文', node_pending: '后台正在整理正文', node_generating: '后台正在整理正文', node_review: '后台正在审查正文', node_revision_required: '后台正在修改正文', node_human_review: '有节点需要处理', assembly_pending: '后台正在整理全文', assembling: '后台正在整理全文', final_revision_required: '后台正在按要求修改最终笔记', note_removed: '最终笔记已删除', final_review: '最终笔记待你确认', final_review_human: '最终笔记待确认', completed: '课程整理完成', failed: '课程处理失败', paused: '课程已暂停', cancelled: '课程已取消' })[status] || '课程后台处理中'
}
function stateForStatus(status) {
  if (status === 'failed') return 'error'
  if (TERMINAL_STATUSES.has(status)) return 'done'
  if (HUMAN_STATUSES.has(status) || status === 'paused') return 'waiting'
  return AUTO_STATUSES.has(status) ? 'running' : 'waiting'
}
function safeStoredTasks() {
  if (typeof window === 'undefined') return {}
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    if (!value || typeof value !== 'object') return {}
    return Object.fromEntries(Object.entries(value).map(([jobId, task]) => [jobId, { ...task, jobId, active: Boolean(task?.active), retryCount: 0, stablePolls: 0 }]))
  } catch { return {} }
}
function nextPollDelay(previous, runtime) {
  const changed = Number(runtime?.workflowVersion || 0) !== Number(previous?.workflowVersion || 0)
  const stablePolls = changed ? 0 : Number(previous?.stablePolls || 0) + 1
  if (changed) return { delay: 3000, stablePolls }
  if (stablePolls >= 3) return { delay: 15000, stablePolls }
  return { delay: 8000, stablePolls }
}

export function CourseTaskProvider({ children }) {
  const router = useRouter()
  const [tasks, setTasks] = useState({})
  const timersRef = useRef(new Map())
  const runningRef = useRef(new Set())
  const tasksRef = useRef({})
  useEffect(() => { setTasks(safeStoredTasks()) }, [])
  useEffect(() => { tasksRef.current = tasks }, [tasks])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = Object.fromEntries(Object.entries(tasks).map(([jobId, task]) => [jobId, { jobId, courseName: task.courseName || '', active: Boolean(task.active), state: task.state || 'waiting', status: task.status || '', label: task.label || '', progress: Number(task.progress || 0), workflowVersion: Number(task.workflowVersion || 0), updatedAt: task.updatedAt || new Date().toISOString(), error: task.error || '' }]))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }, [tasks])
  const patchTask = useCallback((jobId, patch) => setTasks(current => ({ ...current, [jobId]: { ...(current[jobId] || { jobId }), ...patch, jobId, updatedAt: new Date().toISOString() } })), [])
  const clearTimer = useCallback(jobId => { const existing = timersRef.current.get(jobId); if (existing) window.clearTimeout(existing); timersRef.current.delete(jobId) }, [])
  const schedule = useCallback((jobId, delay = 3000) => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    clearTimer(jobId)
    const timer = window.setTimeout(() => { timersRef.current.delete(jobId); window.dispatchEvent(new CustomEvent('law-tech-course-status-tick', { detail: { jobId } })) }, delay)
    timersRef.current.set(jobId, timer)
  }, [clearTimer])
  const refreshTask = useCallback(async jobId => {
    if (!jobId || runningRef.current.has(jobId)) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    runningRef.current.add(jobId)
    try {
      const data = await requestCourseJson(`/api/courses/jobs/${encodeURIComponent(jobId)}/workflow?summary=1`, {}, '课程进度读取失败')
      const runtime = data.runtime || {}
      const status = runtime.status || data.job?.current_node || 'preflight_required'
      const state = stateForStatus(status)
      const poll = nextPollDelay(tasksRef.current[jobId] || {}, runtime)
      patchTask(jobId, { active: state === 'running', state, status, label: labelForStatus(status), progress: Number(runtime.progress || 0), workflowVersion: Number(runtime.workflowVersion || 0), counts: runtime.counts || {}, orchestrator: data.orchestrator || null, error: state === 'error' ? '课程处理失败，请打开课程查看详情。' : '', retryCount: 0, stablePolls: poll.stablePolls })
      if (state === 'running') schedule(jobId, poll.delay)
    } catch (error) {
      const previous = tasksRef.current[jobId] || {}
      const status = error instanceof CourseApiError ? Number(error.status || 0) : 0
      const retryable = !status || status === 408 || status === 429 || status >= 500
      const retryCount = Number(previous.retryCount || 0) + 1
      if (retryable && retryCount <= MAX_RECONNECT_ATTEMPTS) {
        patchTask(jobId, { active: true, state: 'running', label: '正在重新连接', error: '', retryCount })
        schedule(jobId, Math.min(30000, 2000 * (2 ** (retryCount - 1))))
      } else patchTask(jobId, { active: false, state: 'error', label: '进度同步失败', error: formatCourseApiError(error), retryCount })
    } finally { runningRef.current.delete(jobId) }
  }, [patchTask, schedule])
  useEffect(() => { const handler = event => refreshTask(event.detail?.jobId); window.addEventListener('law-tech-course-status-tick', handler); return () => window.removeEventListener('law-tech-course-status-tick', handler) }, [refreshTask])
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') { timersRef.current.forEach(timer => window.clearTimeout(timer)); timersRef.current.clear(); return }
      Object.values(tasksRef.current).forEach(task => { if (task.active) schedule(task.jobId, 50) })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [schedule])
  useEffect(() => { Object.values(tasks).forEach(task => { if (task.active && !timersRef.current.has(task.jobId) && !runningRef.current.has(task.jobId)) schedule(task.jobId, 80) }) }, [tasks, schedule])
  useEffect(() => () => { timersRef.current.forEach(timer => window.clearTimeout(timer)); timersRef.current.clear() }, [])
  const startTask = useCallback(async (jobId, meta = {}) => {
    const existing = tasksRef.current[jobId]
    if (existing?.active && existing?.state === 'running') { schedule(jobId, 100); return }
    patchTask(jobId, { active: true, state: 'running', courseName: meta.courseName || existing?.courseName || '', label: meta.label || '正在启动后台整理', error: '', retryCount: 0, stablePolls: 0 })
    try {
      await requestCourseJson(`/api/courses/jobs/${encodeURIComponent(jobId)}/orchestrator`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start' }) }, '课程后台任务启动失败')
      schedule(jobId, 250)
    } catch (error) { patchTask(jobId, { active: false, state: 'error', label: '后台任务启动失败', error: formatCourseApiError(error) }) }
  }, [patchTask, schedule])
  const pauseTask = useCallback(jobId => { clearTimer(jobId); patchTask(jobId, { active: false, state: 'waiting' }) }, [clearTimer, patchTask])
  const dismissTask = useCallback(jobId => { clearTimer(jobId); setTasks(current => { const next = { ...current }; delete next[jobId]; return next }) }, [clearTimer])
  const value = useMemo(() => ({ tasks, startTask, pauseTask, dismissTask, taskFor: jobId => tasks[jobId] || null }), [tasks, startTask, pauseTask, dismissTask])
  const visibleTask = Object.values(tasks).filter(task => task.state === 'running' || task.state === 'error' || task.state === 'waiting').sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
  const showGlobalTask = visibleTask && router.pathname !== '/desk/courses'
  return <CourseTaskContext.Provider value={value}>{children}{showGlobalTask ? <div className={`course-global-task is-${visibleTask.state}`} role='status'><button type='button' onClick={() => router.push(`/desk/courses?job=${encodeURIComponent(visibleTask.jobId)}`)}><i aria-hidden='true' /><span><b>{visibleTask.courseName || '课程整理'}</b><small>{visibleTask.error || visibleTask.label || '后台处理中'}</small></span></button>{visibleTask.state !== 'running' ? <button className='course-global-task-close' type='button' aria-label='关闭提示' onClick={() => dismissTask(visibleTask.jobId)}>×</button> : null}</div> : null}</CourseTaskContext.Provider>
}

export function useCourseTaskManager() {
  return useContext(CourseTaskContext) || { tasks: {}, startTask: async () => {}, pauseTask: () => {}, dismissTask: () => {}, taskFor: () => null }
}
