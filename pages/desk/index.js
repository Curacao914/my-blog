import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { hasAdminAllowlist, isAdminUser } from '@/lib/auth/admin'
import { getAdminCandidate } from '@/lib/auth/serverAdmin'
import { getLiveContentIndex } from '@/lib/contentSnapshots'
import {
  listAdminContentMetadata,
  toSnapshotLikeContent
} from '@/lib/contentRepository'
import { listCourseJobs } from '@/lib/courseRepository'
import { listRecentTasks } from '@/lib/tasksRepository'

const navItems = [
  { key: 'tasks', label: '事项', hint: '随手收集和整理' },
  { key: 'courses', label: '课程', hint: '材料到笔记' },
  { key: 'library', label: '资料', hint: '文件、链接、快照' },
  { key: 'writing', label: '写作', hint: '草稿和引注' },
  { key: 'sharing', label: '分享', hint: '密码和有效期' },
  { key: 'settings', label: '设置', hint: '规则与偏好' }
]

const sectionCopy = {
  tasks: {
    eyebrow: 'Tasks',
    title: '事项',
    action: '写一句话，先放进收集箱'
  },
  courses: {
    eyebrow: 'Courses',
    title: '课程整理',
    action: '新建或处理课程材料'
  },
  library: {
    eyebrow: 'Library',
    title: '资料',
    action: '稍后接入文件和链接索引'
  },
  writing: {
    eyebrow: 'Writing',
    title: '写作',
    action: '稍后接入草稿和引注'
  },
  sharing: {
    eyebrow: 'Sharing',
    title: '分享',
    action: '配置公开、密码和有效期'
  },
  settings: {
    eyebrow: 'Settings',
    title: '设置',
    action: '稍后集中管理偏好'
  }
}

const modules = [
  {
    id: 'tasks',
    title: '事项',
    status: '可用',
    copy: '随手记一句，先进入收集箱，再慢慢整理。',
    action: '快速收集'
  },
  {
    id: 'courses',
    title: '课程',
    status: '试用中',
    copy: '上传转录稿和课件，按课次整理成笔记。',
    action: '整理材料'
  },
  {
    id: 'library',
    title: '资料',
    status: '稍后',
    copy: '文件位置、链接、阅读记录。先留一个位置。',
    action: '稍后'
  },
  {
    id: 'writing',
    title: '写作',
    status: '稍后',
    copy: '草稿、引注、参考文献。写作区还不急着打开。',
    action: '稍后'
  },
  {
    id: 'sharing',
    title: '分享',
    status: '稍后',
    copy: '公开、密码、有效期。先保证内容本身是稳的。',
    action: '稍后'
  },
  {
    id: 'settings',
    title: '设置',
    status: '稍后',
    copy: '分类、标签、课程偏好。等规则稳定后再集中调整。',
    action: '稍后'
  }
]

const timeline = [
  '事项：可以快速收集',
  '课程：可以创建任务和上传材料',
  '内容：可以逐篇配置公开方式',
  '工具：OCR 和引注保留入口'
]

const categoryOptions = ['法律之上', '法与算法', '遇事不决', '秘密花园']

const tagOptions = ['课程', '笔记', '公法', '方法论', '写作', '工具']

const accessOptions = [
  { label: '公开', value: 'public' },
  { label: '密码', value: 'password' },
  { label: '私有', value: 'private' }
]

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '归档', value: 'archived' }
]

const deferredItems = [
  '内容草稿保存',
  '密码有效期',
  '笔记自动更新',
  '课程文件夹批量整理',
  '搜索和订阅的权限边界'
]

const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

const accessLabels = {
  public: '公开',
  password: '密码',
  private: '私有'
}

const statusLabels = {
  draft: '草稿',
  published: '已发布',
  archived: '归档'
}

function formatExpiry(access = {}) {
  if (access.mode !== 'password') return '不设有效期'
  if (!access.expiresAt) return '未设置'

  const date = new Date(access.expiresAt)
  if (Number.isNaN(date.getTime())) return '格式待修正'

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function formatCourse(course) {
  const safeCourse = course || {}
  const parts = [
    safeCourse.name,
    safeCourse.lesson,
    safeCourse.teacher,
    safeCourse.date
  ].filter(Boolean)
  return parts.length ? parts.join(' / ') : '—'
}

function toDeskContentRow(snapshot) {
  const accessMode = snapshot.access?.mode || 'public'

  return {
    id: snapshot.id,
    slug: snapshot.slug,
    title: snapshot.title,
    status: snapshot.status || 'draft',
    statusLabel: statusLabels[snapshot.status] || snapshot.status || '草稿',
    type: typeLabels[snapshot.type] || snapshot.type,
    category: snapshot.display?.category || snapshot.category || '未分类',
    tags: snapshot.display?.tags || snapshot.tags || [],
    accessMode,
    accessLabel: accessLabels[accessMode] || accessMode,
    allowIndexing: Boolean(snapshot.access?.allowIndexing),
    allowRss: Boolean(snapshot.access?.allowRss),
    allowSitemap: Boolean(snapshot.access?.allowSitemap),
    expiresAt: snapshot.access?.expiresAt || '',
    expiry: formatExpiry(snapshot.access),
    course: formatCourse(snapshot.course),
    courseName: snapshot.course?.name || '',
    courseLesson: snapshot.course?.lesson || '',
    courseTeacher: snapshot.course?.teacher || '',
    courseDate: snapshot.course?.date || '',
    folderPath: snapshot.folder?.path?.length ? snapshot.folder.path.join(' / ') : '',
    folder: snapshot.folder?.path?.length
      ? snapshot.folder.path.join(' / ')
      : '未归档',
    updatedAt: snapshot.updatedAt || ''
  }
}

function ContentConfigRow({ allTagOptions, row }) {
  const [category, setCategory] = useState(row.category)
  const [status, setStatus] = useState(row.status)
  const [tags, setTags] = useState(row.tags)
  const [accessMode, setAccessMode] = useState(row.accessMode)
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState(
    row.expiresAt ? row.expiresAt.slice(0, 10) : ''
  )
  const [allowIndexing, setAllowIndexing] = useState(row.allowIndexing)
  const [allowRss, setAllowRss] = useState(row.allowRss)
  const [allowSitemap, setAllowSitemap] = useState(row.allowSitemap)
  const [folderPath, setFolderPath] = useState(row.folderPath)
  const [courseName, setCourseName] = useState(row.courseName)
  const [courseLesson, setCourseLesson] = useState(row.courseLesson)
  const [courseTeacher, setCourseTeacher] = useState(row.courseTeacher)
  const [courseDate, setCourseDate] = useState(
    row.courseDate ? row.courseDate.slice(0, 10) : ''
  )
  const [saveState, setSaveState] = useState('idle')

  const rowCategoryOptions = Array.from(
    new Set([category, ...categoryOptions])
  ).filter(Boolean)

  function toggleTag(tag) {
    setTags(current =>
      current.includes(tag)
        ? current.filter(item => item !== tag)
        : [...current, tag]
    )
  }

  async function saveConfig() {
    setSaveState('saving')

    const response = await fetch('/api/content/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: row.slug,
        status,
        display: {
          category,
          tags,
          folderPath,
          courseName,
          courseLesson,
          courseTeacher,
          courseDate
        },
        access: {
          mode: accessMode,
          expiresAt:
            accessMode === 'password' && expiresAt
              ? new Date(`${expiresAt}T23:59:59+08:00`).toISOString()
              : null,
          password: accessMode === 'password' ? password : '',
          allowIndexing,
          allowRss,
          allowSitemap
        }
      })
    })

    setSaveState(response.ok ? 'saved' : 'error')
  }

  return (
    <article className='config-row'>
      <div className='row-main'>
        <span>{row.type} · {row.statusLabel}</span>
        <h3>{row.title}</h3>
        <p>{row.folder}</p>
      </div>

      <div className='row-controls'>
        <label>
          状态
          <select
            onChange={event => setStatus(event.target.value)}
            value={status}>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          类别
          <select
            onChange={event => setCategory(event.target.value)}
            value={category}>
            {rowCategoryOptions.map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className='wide-control'>
          文件夹
          <input
            onChange={event => setFolderPath(event.target.value)}
            placeholder='课程/民诉/第 3 讲'
            type='text'
            value={folderPath}
          />
        </label>

        <fieldset>
          <legend>tag</legend>
          <div>
            {allTagOptions.slice(0, 6).map(tag => (
              <label key={tag}>
                <input
                  checked={tags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  type='checkbox'
                />
                {tag}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          访问
          <select
            onChange={event => setAccessMode(event.target.value)}
            value={accessMode}>
            {accessOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          访问密码
          <input
            autoComplete='new-password'
            disabled={accessMode !== 'password'}
            onChange={event => setPassword(event.target.value)}
            placeholder='留空则不修改'
            type='password'
            value={password}
          />
        </label>

        <label>
          密码有效期
          <input
            disabled={accessMode !== 'password'}
            onChange={event => setExpiresAt(event.target.value)}
            type='date'
            value={expiresAt}
          />
        </label>

        <label>
          课程
          <input
            onChange={event => setCourseName(event.target.value)}
            placeholder='如：刑诉法'
            type='text'
            value={courseName}
          />
        </label>

        <label>
          课次
          <input
            onChange={event => setCourseLesson(event.target.value)}
            placeholder='如：第 4 讲'
            type='text'
            value={courseLesson}
          />
        </label>

        <label>
          教师
          <input
            onChange={event => setCourseTeacher(event.target.value)}
            placeholder='可选'
            type='text'
            value={courseTeacher}
          />
        </label>

        <label>
          日期
          <input
            onChange={event => setCourseDate(event.target.value)}
            type='date'
            value={courseDate}
          />
        </label>

        <fieldset className='permission-toggles'>
          <legend>公开索引</legend>
          <div>
            <label>
              <input
                checked={allowIndexing}
                onChange={event => setAllowIndexing(event.target.checked)}
                type='checkbox'
              />
              搜索
            </label>
            <label>
              <input
                checked={allowRss}
                onChange={event => setAllowRss(event.target.checked)}
                type='checkbox'
              />
              RSS
            </label>
            <label>
              <input
                checked={allowSitemap}
                onChange={event => setAllowSitemap(event.target.checked)}
                type='checkbox'
              />
              sitemap
            </label>
          </div>
        </fieldset>
      </div>

      <div className='row-meta'>
        <span>{row.course}</span>
        <Link href={`/content/${row.slug}`}>查看</Link>
        <button
          className='save-config'
          disabled={saveState === 'saving'}
          onClick={() => void saveConfig()}
          type='button'>
          {saveState === 'saving'
            ? '保存中'
            : saveState === 'saved'
              ? '已保存'
              : '保存配置'}
        </button>
        {saveState === 'error' && <small>保存失败</small>}
      </div>
    </article>
  )
}

function formatCourseJobDate(value) {
  if (!value) return '刚刚'
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',').pop() : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function formatTaskDate(value) {
  if (!value) return '未定时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待修正'

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const taskTypeLabels = {
  course: '课程',
  'student-work': '学生工作',
  life: '生活',
  research: '科研',
  writing: '写作',
  admin: '行政'
}

const taskPriorityLabels = {
  low: '低',
  normal: '普通',
  high: '高'
}

const taskStatusLabels = {
  inbox: '待整理',
  planned: '已计划',
  waiting: '等待',
  done: '完成',
  archived: '归档'
}

const taskSourceLabels = {
  web: '网页',
  ios: 'iPhone',
  wechat: '微信',
  wecom: '企业微信'
}

const assetRoleLabels = {
  transcript: '转录稿',
  slides: '课件',
  reading: '阅读材料',
  supplement: '补充',
  output: '输出'
}

function summarizeAssets(assets = []) {
  const counts = assets.reduce((acc, asset) => {
    const role = asset.role || 'supplement'
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})

  const parts = Object.entries(assetRoleLabels)
    .map(([role, label]) => (counts[role] ? `${label} ${counts[role]}` : null))
    .filter(Boolean)

  return parts.length ? parts.join(' · ') : '暂无材料'
}

function summarizePreprocessResult(result = {}) {
  const transcripts = result.transcripts?.length || 0
  const segments = result.segments?.length || 0
  const pptText = result.pptText?.length || 0
  const needsOcr = result.pptNeedsOcr?.length || 0
  const failures = result.failures?.length || 0

  if (!transcripts && !segments && !pptText && !needsOcr && !failures) {
    return null
  }

  return {
    ok: Boolean(result.ok) && failures === 0,
    needsOcr,
    failures,
    chips: [
      ['转录', transcripts],
      ['分段', segments],
      ['文字课件', pptText],
      ['待 OCR', needsOcr],
      ['失败', failures]
    ].filter(([, value]) => value > 0),
    next: result.next || ''
  }
}

function hasAssetRole(assets = [], role) {
  return assets.some(asset => asset.role === role)
}

function canConfirmMaterialBundle(job) {
  return hasAssetRole(job.assets, 'transcript')
}

function defaultCoursePreferenceDraft(job) {
  const preferences = job.preferences || {}
  const style = preferences.teaching_style || {}
  const extra = preferences.preferences || {}

  return {
    learningGoal: preferences.learning_goal || '自学 / 入门',
    secondaryGoal: preferences.secondary_goal || '',
    pptType: preferences.ppt_type || 'auto',
    domain: preferences.domain || '法学',
    totalLessons: preferences.total_lessons || '',
    followsPptStrictly: Boolean(style.follows_ppt_strictly),
    tendsToDigress: Boolean(style.tends_to_digress),
    hasWarmupQuestions: Boolean(style.has_warmup_questions),
    denseLegalReferences: Boolean(style.dense_legal_references),
    includeEnglishTerms: Boolean(extra.include_english_terms),
    preferVisualTables: extra.prefer_visual_tables !== false
  }
}

function parseCourseBrief(value) {
  const text = String(value || '').trim()
  if (!text) return {}

  const teacherMatch = text.match(/(?:老师|教师|授课人|主讲人)[：:是为]?\s*([^，。；\n]+)/)
  const lessonMatch = text.match(/第\s*[\d一二三四五六七八九十百]+(?:\s*[-到至]\s*[\d一二三四五六七八九十百]+)?\s*(?:讲|课|节)/)
  const courseMatch =
    text.match(/《([^》]+)》/) ||
    text.match(/^([^，。；\n]{2,18}?)(?:第\s*[\d一二三四五六七八九十百]|，|。|；|\s)/)

  return {
    courseName: courseMatch?.[1]?.trim(),
    lesson: lessonMatch?.[0]?.trim(),
    teacher: teacherMatch?.[1]?.trim()
  }
}

function DeskForbidden() {
  return (
    <>
      <Head>
        <title>无访问权限 · law-tech.dev</title>
        <meta name='robots' content='noindex,nofollow' />
      </Head>
      <main className='desk-forbidden'>
        <section>
          <p>law-tech.dev</p>
          <h1>这个工作台只给本人使用。</h1>
          <Link href='/'>回到首页</Link>
        </section>
      </main>
      <style jsx>{`
        .desk-forbidden {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #1e2322;
          background: #f7f9f8;
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        section {
          width: min(460px, 100%);
          padding: 30px;
          border: 1px solid #dfe7e1;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 22px 70px rgba(37, 55, 48, 0.07);
        }

        p {
          margin: 0 0 12px;
          color: #c99a3b;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0 0 22px;
          font-size: 26px;
          line-height: 1.25;
          letter-spacing: -0.04em;
        }

        a {
          color: #315a8c;
        }
      `}</style>
    </>
  )
}

const DeskPage = ({
  authForbidden = false,
  contentRows = [],
  contentStats = { total: 0 },
  initialCourseJobs = [],
  initialTasks = []
}) => {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('tasks')
  const [draft, setDraft] = useState('')
  const [captureState, setCaptureState] = useState('idle')
  const [capturedTask, setCapturedTask] = useState(null)
  const [tasks, setTasks] = useState(initialTasks)
  const [taskPatchState, setTaskPatchState] = useState({})
  const [courseJobs, setCourseJobs] = useState(initialCourseJobs)
  const [courseName, setCourseName] = useState('')
  const [courseLesson, setCourseLesson] = useState('')
  const [courseTeacher, setCourseTeacher] = useState('')
  const [courseBrief, setCourseBrief] = useState('')
  const [courseState, setCourseState] = useState('idle')
  const [courseUploadState, setCourseUploadState] = useState({})
  const [courseSetupState, setCourseSetupState] = useState({})
  const [coursePreferenceDrafts, setCoursePreferenceDrafts] = useState({})
  const [courseLessonState, setCourseLessonState] = useState({})
  const [outlineDrafts, setOutlineDrafts] = useState({})
  const [courseManifestState, setCourseManifestState] = useState({})
  const [courseManifests, setCourseManifests] = useState({})
  const [copiedCommand, setCopiedCommand] = useState('')
  const allTagOptions = Array.from(
    new Set([...tagOptions, ...contentRows.flatMap(row => row.tags)])
  ).filter(Boolean)
  const inboxCount = tasks.filter(task => task.status === 'inbox').length
  const highPriorityCount = tasks.filter(task => task.priority === 'high').length
  const todayCards = [
    {
      label: '待整理',
      value: String(inboxCount),
      copy: '还没归类的事项。'
    },
    {
      label: '高优先',
      value: String(highPriorityCount),
      copy: '需要先看的事项。'
    },
    {
      label: '内容配置',
      value: String(contentStats.total || 0),
      copy: '可管理的文章和笔记。'
    }
  ]
  const activeCopy = sectionCopy[activeSection] || sectionCopy.tasks

  useEffect(() => {
    const handleKeyDown = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCaptureOpen(true)
      }

      if (event.key === 'Escape') {
        setCaptureOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function saveCapture() {
    setCaptureState('saving')
    setCapturedTask(null)

    const response = await fetch('/api/tasks/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: draft })
    })

    if (!response.ok) {
      setCaptureState('error')
      return
    }

    const data = await response.json()
    setCapturedTask(data.task)
    setTasks(current => [data.task, ...current].slice(0, 12))
    setDraft('')
    setCaptureState('saved')
  }

  async function patchTask(taskId, patch) {
    setTaskPatchState(current => ({ ...current, [taskId]: 'saving' }))

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })

    if (!response.ok) {
      setTaskPatchState(current => ({ ...current, [taskId]: 'error' }))
      return
    }

    const data = await response.json()
    setTasks(current =>
      current.map(task => (task.id === taskId ? { ...task, ...data.task } : task))
    )
    setTaskPatchState(current => ({ ...current, [taskId]: 'saved' }))
  }

  async function createCourseJob() {
    setCourseState('saving')
    const inferred = parseCourseBrief(courseBrief)
    const nextCourseName = courseName.trim() || inferred.courseName || ''
    const nextLesson = courseLesson.trim() || inferred.lesson || ''
    const nextTeacher = courseTeacher.trim() || inferred.teacher || ''

    const response = await fetch('/api/courses/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseName: nextCourseName,
        lesson: nextLesson,
        teacher: nextTeacher
      })
    })

    if (!response.ok) {
      setCourseState('error')
      return
    }

    const data = await response.json()
    setCourseJobs(current => [data.job, ...current].slice(0, 6))
    setCourseName('')
    setCourseLesson('')
    setCourseTeacher('')
    setCourseBrief('')
    setCourseState('saved')
  }

  async function uploadCourseAssets(jobId, fileList) {
    const files = Array.from(fileList || [])
    if (files.length === 0) return

    setCourseUploadState(current => ({
      ...current,
      [jobId]: 'uploading'
    }))

    try {
      const payloadFiles = await Promise.all(
        files.map(async file => ({
          name: file.name,
          type: file.type,
          size: file.size,
          base64: await fileToBase64(file)
        }))
      )

      const response = await fetch(`/api/courses/jobs/${jobId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles })
      })

      if (!response.ok) {
        setCourseUploadState(current => ({
          ...current,
          [jobId]: 'error'
        }))
        return
      }

      const data = await response.json()
      setCourseJobs(current =>
        current.map(job =>
          job.id === jobId
            ? {
                ...job,
                assets: [...(data.assets || []), ...(job.assets || [])]
              }
            : job
        )
      )
      setCourseUploadState(current => ({
        ...current,
        [jobId]: 'uploaded'
      }))
    } catch (error) {
      console.warn('[desk] course asset upload failed', error)
      setCourseUploadState(current => ({
        ...current,
        [jobId]: 'error'
      }))
    }
  }

  function updateCourseJobLocal(updatedJob) {
    setCourseJobs(current =>
      current.map(job => (job.id === updatedJob.id ? { ...job, ...updatedJob } : job))
    )
  }

  function updateCourseLessonsLocal(jobId, lessons) {
    setCourseJobs(current =>
      current.map(job => (job.id === jobId ? { ...job, lessons } : job))
    )
  }

  async function loadCourseLessons(jobId) {
    setCourseLessonState(current => ({ ...current, [`${jobId}:list`]: 'loading' }))

    const response = await fetch(`/api/courses/jobs/${jobId}/lessons`)
    if (!response.ok) {
      setCourseLessonState(current => ({ ...current, [`${jobId}:list`]: 'error' }))
      return
    }

    const data = await response.json()
    updateCourseLessonsLocal(jobId, data.lessons || [])
    setCourseLessonState(current => ({ ...current, [`${jobId}:list`]: 'loaded' }))
  }

  function getOutlineDraft(lesson) {
    if (outlineDrafts[lesson.id] !== undefined) return outlineDrafts[lesson.id]
    return JSON.stringify(lesson.outline_json || {}, null, 2)
  }

  async function saveLessonOutline(lesson) {
    setCourseLessonState(current => ({ ...current, [lesson.id]: 'saving' }))

    let outlineJson
    try {
      outlineJson = JSON.parse(getOutlineDraft(lesson))
    } catch (error) {
      setCourseLessonState(current => ({ ...current, [lesson.id]: 'invalid-json' }))
      return
    }

    const response = await fetch(`/api/courses/lessons/${lesson.id}/outline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outlineJson })
    })

    if (!response.ok) {
      setCourseLessonState(current => ({ ...current, [lesson.id]: 'error' }))
      return
    }

    const data = await response.json()
    setCourseJobs(current =>
      current.map(job =>
        job.id === data.lesson.job_id
          ? {
              ...job,
              lessons: (job.lessons || []).map(item =>
                item.id === data.lesson.id ? data.lesson : item
              )
            }
          : job
      )
    )
    setCourseLessonState(current => ({ ...current, [lesson.id]: 'saved' }))
  }

  async function confirmLessonOutline(lesson) {
    setCourseLessonState(current => ({ ...current, [lesson.id]: 'confirming' }))

    const response = await fetch(`/api/courses/lessons/${lesson.id}/outline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmOutline: true })
    })

    if (!response.ok) {
      setCourseLessonState(current => ({ ...current, [lesson.id]: 'error' }))
      return
    }

    const data = await response.json()
    setCourseJobs(current =>
      current.map(job =>
        job.id === data.lesson.job_id
          ? {
              ...job,
              lessons: (job.lessons || []).map(item =>
                item.id === data.lesson.id ? data.lesson : item
              )
            }
          : job
      )
    )
    setCourseLessonState(current => ({ ...current, [lesson.id]: 'confirmed' }))
  }

  function updateCoursePreferenceDraft(job, patch) {
    setCoursePreferenceDrafts(current => ({
      ...current,
      [job.id]: {
        ...defaultCoursePreferenceDraft(job),
        ...(current[job.id] || {}),
        ...patch
      }
    }))
  }

  async function patchCourseJob(jobId, payload, stateKey) {
    setCourseSetupState(current => ({ ...current, [stateKey]: 'saving' }))

    const response = await fetch(`/api/courses/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      setCourseSetupState(current => ({ ...current, [stateKey]: 'error' }))
      return
    }

    const data = await response.json()
    updateCourseJobLocal(data.job)
    setCourseSetupState(current => ({ ...current, [stateKey]: 'saved' }))
  }

  async function confirmMaterialBundle(job) {
    await patchCourseJob(
      job.id,
      { confirmMaterialBundle: true },
      `${job.id}:bundle`
    )
  }

  async function prepareLessons(job) {
    setCourseLessonState(current => ({
      ...current,
      [`${job.id}:prepare`]: 'preparing'
    }))

    const response = await fetch(`/api/courses/jobs/${job.id}/prepare-lessons`, {
      method: 'POST'
    })

    if (!response.ok) {
      setCourseLessonState(current => ({
        ...current,
        [`${job.id}:prepare`]: 'error'
      }))
      return
    }

    const data = await response.json()
    setCourseJobs(current =>
      current.map(item =>
        item.id === job.id
          ? {
              ...item,
              ...(data.job || {}),
              lessons: data.lessons || item.lessons || []
            }
          : item
      )
    )
    setCourseLessonState(current => ({
      ...current,
      [`${job.id}:prepare`]: 'prepared'
    }))
  }

  async function loadWorkerManifest(job) {
    setCourseManifestState(current => ({
      ...current,
      [job.id]: 'loading'
    }))

    const response = await fetch(`/api/courses/jobs/${job.id}/worker-manifest`)
    if (!response.ok) {
      setCourseManifestState(current => ({
        ...current,
        [job.id]: 'error'
      }))
      return
    }

    const data = await response.json()
    setCourseManifests(current => ({
      ...current,
      [job.id]: data.manifest
    }))
    setCourseManifestState(current => ({
      ...current,
      [job.id]: 'loaded'
    }))
  }

  async function copyWorkerCommand(commandKey, command) {
    try {
      await navigator.clipboard.writeText(command)
      setCopiedCommand(commandKey)
      window.setTimeout(() => setCopiedCommand(''), 1600)
    } catch (error) {
      console.warn('[desk] copy worker command failed', error)
      setCopiedCommand('')
    }
  }

  async function saveCoursePreferences(job) {
    const draft = coursePreferenceDrafts[job.id] || defaultCoursePreferenceDraft(job)
    await patchCourseJob(
      job.id,
      {
        preferences: {
          ...draft,
          courseName: job.course_name,
          teacher: job.teacher || ''
        }
      },
      `${job.id}:preflight`
    )
  }

  if (authForbidden) {
    return <DeskForbidden />
  }

  return (
    <>
      <Head>
        <title>工作台 · law-tech.dev</title>
        <meta
          name='description'
          content='Curacao 的私人工作台：事项、课程、资料、写作、分享和设置。'
        />
        <meta name='theme-color' content='#eef5f3' />
      </Head>

      <div className='desk-page'>
        <div className='aurora one' />
        <div className='aurora two' />
        <div className='shell'>
          <aside className='sidebar glass'>
            <Link className='brand' href='/'>
              <span>law-tech</span>
              <strong>Desk</strong>
            </Link>

            <nav aria-label='工作台导航'>
              {navItems.map(item => (
                <button
                  className={
                    activeSection === item.key ? 'nav-item active' : 'nav-item'
                  }
                  onClick={() => setActiveSection(item.key)}
                  type='button'
                  key={item.key}>
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </button>
              ))}
            </nav>

            <div className='sidebar-foot'>
              <span>模式</span>
              <strong>私人工作台</strong>
            </div>
          </aside>

          <main className='main'>
            <header className='topbar glass'>
              <div>
                <p>{activeCopy.eyebrow}</p>
                <h1>{activeCopy.title}</h1>
              </div>
              {activeSection === 'tasks' && (
                <button
                  aria-label='打开快速收集'
                  className='quick-capture'
                  onClick={() => setCaptureOpen(true)}
                  type='button'>
                  <span>⌘K</span>
                  <strong>{activeCopy.action}</strong>
                </button>
              )}
            </header>

            <section
              className={activeSection === 'tasks' ? 'grid' : 'grid is-hidden'}>
              <section className='today glass' id='today'>
                <div className='section-head'>
                  <div>
                    <p>Today</p>
                    <h2>今日</h2>
                  </div>
                  <span>先收住，再处理</span>
                </div>

                <div className='today-cards'>
                  {todayCards.map(card => (
                    <article className='metric' key={card.label}>
                      <small>{card.label}</small>
                      <strong>{card.value}</strong>
                      <p>{card.copy}</p>
                    </article>
                  ))}
                </div>

                <div className='focus-panel'>
                  <span className='orb' />
                  <div>
                    <h3>当前焦点</h3>
                    <p>先把事项和课程材料接住，不让它们散在聊天、提醒事项和文件夹里。</p>
                  </div>
                </div>

                <div className='task-inbox-preview'>
                  <div className='task-inbox-head'>
                    <strong>事项收集箱</strong>
                    <button onClick={() => setCaptureOpen(true)} type='button'>
                      继续收集
                    </button>
                  </div>
                  {tasks.length === 0 ? (
                    <p>暂无事项。按 ⌘K 或从 iPhone 快捷指令写一句话进来。</p>
                  ) : (
                    <div className='task-list'>
                      {tasks.slice(0, 6).map(task => (
                        <article className='task-item' key={task.id}>
                          <div>
                            <span>
                              {taskSourceLabels[task.source] || task.source || '来源'} ·{' '}
                              {taskTypeLabels[task.type] || '未分类'} ·{' '}
                              {taskPriorityLabels[task.priority] || '普通'}
                            </span>
                            <strong>{task.title}</strong>
                            <p>
                              {[
                                formatTaskDate(task.startsAt || task.starts_at),
                                task.place,
                                task.reminderSentAt || task.reminder_sent_at
                                  ? '已提醒'
                                  : task.remindAt || task.remind_at
                                    ? '待提醒'
                                    : null
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          <div className='task-actions'>
                            <small>{taskStatusLabels[task.status] || task.status || '待整理'}</small>
                            <select
                              aria-label='调整事项状态'
                              disabled={taskPatchState[task.id] === 'saving'}
                              onChange={event =>
                                void patchTask(task.id, { status: event.target.value })
                              }
                              value={task.status || 'inbox'}>
                              {Object.entries(taskStatusLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label='调整事项优先级'
                              disabled={taskPatchState[task.id] === 'saving'}
                              onChange={event =>
                                void patchTask(task.id, {
                                  priority: event.target.value
                                })
                              }
                              value={task.priority || 'normal'}>
                              {Object.entries(taskPriorityLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={taskPatchState[task.id] === 'saving'}
                              onClick={() => void patchTask(task.id, { status: 'done' })}
                              type='button'>
                              完成
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className='status-rail glass is-hidden'>
                <h2>状态轨</h2>
                {timeline.map((item, index) => (
                  <div className='rail-item' key={item}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </aside>
            </section>

            <section className='module-grid is-hidden' aria-label='工作台模块'>
              {modules.map(module => (
                <article
                  className='module glass'
                  id={module.id}
                  key={module.title}>
                  <div>
                    <span>{module.status}</span>
                    <h2>{module.title}</h2>
                    <p>{module.copy}</p>
                  </div>
                  <button
                    className={
                      module.id === 'tasks' || module.id === 'courses'
                        ? 'module-action is-live'
                        : 'module-action'
                    }
                    disabled={module.id !== 'tasks' && module.id !== 'courses'}
                    onClick={
                      module.id === 'tasks'
                        ? () => setCaptureOpen(true)
                        : module.id === 'courses'
                          ? () => setActiveSection('courses')
                          : undefined
                    }
                    type='button'>
                    {module.action}
                  </button>
                </article>
              ))}
            </section>

            <section
              className={
                activeSection === 'courses'
                  ? 'course-console glass'
                  : 'course-console glass is-hidden'
              }
              id='course-console'
              aria-labelledby='course-console-title'>
              <div className='console-head'>
                <div>
                  <p>Courses</p>
                  <h2 id='course-console-title'>课程整理</h2>
                </div>
                <div className='console-state'>
                  <span>{courseJobs.length} 个任务</span>
                  <strong>材料 → 大纲 → 笔记</strong>
                </div>
              </div>

              <div className='course-job-layout'>
                <div className='course-job-form'>
                  <div className='wizard-steps' aria-label='课程整理步骤'>
                    <span className='is-current'>1 描述</span>
                    <span>2 上传</span>
                    <span>3 确认</span>
                    <span>4 生成</span>
                  </div>
                  <label className='course-brief'>
                    先用一句话描述
                    <textarea
                      onChange={event => setCourseBrief(event.target.value)}
                      placeholder='例如：刑诉法第 1-6 讲，张老师，闭卷考试复习；我会上传多份 SRT 和几份 PPT'
                      rows={5}
                      value={courseBrief}
                    />
                  </label>
                  <details className='course-manual-fields'>
                    <summary>手动补充课程信息</summary>
                    <div>
                  <label>
                    课程
                    <input
                      onChange={event => setCourseName(event.target.value)}
                      placeholder='如：刑事诉讼法'
                      type='text'
                      value={courseName}
                    />
                  </label>
                  <label>
                    课次范围
                    <input
                      onChange={event => setCourseLesson(event.target.value)}
                      placeholder='如：第 1-6 讲 / 第 2 讲'
                      type='text'
                      value={courseLesson}
                    />
                  </label>
                  <label>
                    教师
                    <input
                      onChange={event => setCourseTeacher(event.target.value)}
                      placeholder='可选'
                      type='text'
                      value={courseTeacher}
                    />
                  </label>
                    </div>
                  </details>
                  <button
                    disabled={
                      (!courseName.trim() && !courseBrief.trim()) ||
                      courseState === 'saving'
                    }
                    onClick={() => void createCourseJob()}
                    type='button'>
                    {courseState === 'saving' ? '创建中' : '创建整理任务'}
                  </button>
                  {courseState === 'error' && <small>创建失败：请检查课程描述是否包含课程名。</small>}
                  {courseState === 'saved' && <small>已创建。下一步上传 SRT 和课件。</small>}
                </div>

                <div className='course-job-list'>
                  {courseJobs.length === 0 ? (
                    <p>还没有课程任务。先写一句话创建一个。</p>
                  ) : (
                    courseJobs.map(job => (
                      <article key={job.id}>
                        <span>{job.status}</span>
                        <strong>{job.course_name}</strong>
                        <p>
                          {[job.lesson, job.teacher, formatCourseJobDate(job.created_at)]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <div className='course-asset-row'>
                          <label>
                            <span>投放材料</span>
                            <strong>SRT、PPT/PPTX、PDF、图片都可以先放进来</strong>
                            <input
                              accept='.srt,.pptx,.pdf,.txt,.md,.markdown,.docx,image/*'
                              multiple
                              onChange={event => {
                                void uploadCourseAssets(job.id, event.target.files)
                                event.target.value = ''
                              }}
                              type='file'
                            />
                          </label>
                          <small>
                            {courseUploadState[job.id] === 'uploading'
                              ? '上传中'
                              : courseUploadState[job.id] === 'uploaded'
                                ? summarizeAssets(job.assets)
                                : courseUploadState[job.id] === 'error'
                                  ? '上传失败，检查文件类型或 Storage 配置'
                                  : summarizeAssets(job.assets)}
                          </small>
                        </div>
                        {Boolean(job.assets?.length) && (
                          <div className='course-asset-chips'>
                            {job.assets.slice(0, 6).map(asset => (
                              <span key={asset.id}>
                                {assetRoleLabels[asset.role] || asset.kind} ·{' '}
                                {asset.original_name || asset.storage_path.split('/').pop()}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className='course-setup-panel'>
                          <div className='course-setup-status'>
                            <span
                              className={
                                job.material_bundle_confirmed_at ? 'is-done' : ''
                              }>
                              材料包
                              {job.material_bundle_confirmed_at ? '已确认' : '待确认'}
                            </span>
                            <span
                              className={job.preflight_confirmed_at ? 'is-done' : ''}>
                              偏好
                              {job.preflight_confirmed_at ? '已确认' : '待确认'}
                            </span>
                          </div>

                          <button
                            className='course-secondary-action'
                            disabled={
                              !canConfirmMaterialBundle(job) ||
                              courseSetupState[`${job.id}:bundle`] === 'saving'
                            }
                            onClick={() => void confirmMaterialBundle(job)}
                            type='button'>
                            {job.material_bundle_confirmed_at
                              ? '材料包已确认'
                              : '确认这个课程批次的材料包'}
                          </button>
                          {!canConfirmMaterialBundle(job) && (
                            <small>至少需要 1 份 SRT。多份 PPT 会作为整门课的课件池，不需要你手动逐一匹配。</small>
                          )}

                          <button
                            className='course-secondary-action'
                            disabled={
                              !canConfirmMaterialBundle(job) ||
                              courseLessonState[`${job.id}:prepare`] === 'preparing'
                            }
                            onClick={() => void prepareLessons(job)}
                            type='button'>
                            {courseLessonState[`${job.id}:prepare`] === 'preparing'
                              ? '准备中'
                              : courseLessonState[`${job.id}:prepare`] === 'prepared'
                                ? '已生成课次映射'
                                : '根据 SRT 准备课次映射'}
                          </button>
                          {courseLessonState[`${job.id}:prepare`] === 'error' && (
                            <small>准备失败：请确认数据库已更新 schema，且至少有 1 份 SRT。</small>
                          )}

                          <div className='course-preflight-grid'>
                            {(() => {
                              const draft =
                                coursePreferenceDrafts[job.id] ||
                                defaultCoursePreferenceDraft(job)

                              return (
                                <>
                                  <label>
                                    学习目标
                                    <select
                                      onChange={event =>
                                        updateCoursePreferenceDraft(job, {
                                          learningGoal: event.target.value
                                        })
                                      }
                                      value={draft.learningGoal}>
                                      <option>闭卷应试</option>
                                      <option>开卷应试</option>
                                      <option>论文 / 研究</option>
                                      <option>自学 / 入门</option>
                                    </select>
                                  </label>
                                  <label>
                                    PPT 类型
                                    <select
                                      onChange={event =>
                                        updateCoursePreferenceDraft(job, {
                                          pptType: event.target.value
                                        })
                                      }
                                      value={draft.pptType}>
                                      <option value='auto'>自动判断</option>
                                      <option value='text'>文字型</option>
                                      <option value='image'>纯图型</option>
                                      <option value='mixed'>混合型</option>
                                    </select>
                                  </label>
                                  <label>
                                    领域
                                    <input
                                      onChange={event =>
                                        updateCoursePreferenceDraft(job, {
                                          domain: event.target.value
                                        })
                                      }
                                      value={draft.domain}
                                    />
                                  </label>
                                  <label>
                                    总课次数
                                    <input
                                      onChange={event =>
                                        updateCoursePreferenceDraft(job, {
                                          totalLessons: event.target.value
                                        })
                                      }
                                      placeholder='可选'
                                      value={draft.totalLessons}
                                    />
                                  </label>
                                  <fieldset>
                                    <legend>讲课风格</legend>
                                    {[
                                      ['followsPptStrictly', '严格按 PPT'],
                                      ['tendsToDigress', '容易发散'],
                                      ['hasWarmupQuestions', '有课前提问'],
                                      ['denseLegalReferences', '法条密集']
                                    ].map(([key, label]) => (
                                      <label key={key}>
                                        <input
                                          checked={Boolean(draft[key])}
                                          onChange={event =>
                                            updateCoursePreferenceDraft(job, {
                                              [key]: event.target.checked
                                            })
                                          }
                                          type='checkbox'
                                        />
                                        {label}
                                      </label>
                                    ))}
                                  </fieldset>
                                  <fieldset>
                                    <legend>输出偏好</legend>
                                    {[
                                      ['includeEnglishTerms', '英文术语对照'],
                                      ['preferVisualTables', '多用表格/对比']
                                    ].map(([key, label]) => (
                                      <label key={key}>
                                        <input
                                          checked={Boolean(draft[key])}
                                          onChange={event =>
                                            updateCoursePreferenceDraft(job, {
                                              [key]: event.target.checked
                                            })
                                          }
                                          type='checkbox'
                                        />
                                        {label}
                                      </label>
                                    ))}
                                  </fieldset>
                                </>
                              )
                            })()}
                          </div>

                          <button
                            className='course-secondary-action'
                            disabled={courseSetupState[`${job.id}:preflight`] === 'saving'}
                            onClick={() => void saveCoursePreferences(job)}
                            type='button'>
                            {job.preflight_confirmed_at
                              ? '更新整理偏好'
                              : '确认整理偏好'}
                          </button>
                        </div>

                        {(() => {
                          const summary = summarizePreprocessResult(
                            job.preprocess_result
                          )
                          if (!summary) return null

                          return (
                            <div className='course-preprocess-panel'>
                              <div className='course-lessons-head'>
                                <strong>预处理结果</strong>
                                <span
                                  className={
                                    summary.failures
                                      ? 'preprocess-badge is-error'
                                      : summary.needsOcr
                                        ? 'preprocess-badge is-warn'
                                        : 'preprocess-badge is-done'
                                  }>
                                  {summary.failures
                                    ? '有失败'
                                    : summary.needsOcr
                                      ? '待 OCR'
                                      : '已完成'}
                                </span>
                              </div>
                              <div className='preprocess-summary-grid'>
                                {summary.chips.map(([label, value]) => (
                                  <span key={label}>
                                    {label} {value}
                                  </span>
                                ))}
                                <small>
                                  {job.preprocess_reported_at
                                    ? `回传于 ${formatCourseJobDate(job.preprocess_reported_at)}`
                                    : '已收到本地预处理摘要'}
                                  {job.local_workdir ? ` · ${job.local_workdir}` : ''}
                                  {summary.next ? ` · ${summary.next}` : ''}
                                  {summary.needsOcr
                                    ? ' · 可先用 PaddleOCR 免费额度处理'
                                    : ''}
                                </small>
                              </div>
                            </div>
                          )
                        })()}

                        <div className='course-lessons-panel'>
                          <div className='course-lessons-head'>
                            <strong>逐课大纲</strong>
                            <button
                              className='course-secondary-action'
                              disabled={courseLessonState[`${job.id}:list`] === 'loading'}
                              onClick={() => void loadCourseLessons(job.id)}
                              type='button'>
                              {courseLessonState[`${job.id}:list`] === 'loading'
                                ? '读取中'
                                : '刷新课次'}
                            </button>
                          </div>

                          {!(job.lessons || []).length ? (
                            <p>
                              暂无课次。上传 SRT 后点击“准备课次映射”，网页会先把多份 SRT
                              排成课程序列；后续 Worker 再生成每课大纲。
                            </p>
                          ) : (
                            <div className='lesson-outline-list'>
                              {(job.lessons || []).map(lesson => (
                                <article key={lesson.id}>
                                  <div className='lesson-outline-head'>
                                    <span>{lesson.status}</span>
                                    <strong>
                                      第 {lesson.lesson_order} 课 ·{' '}
                                      {lesson.title || lesson.lesson_key}
                                    </strong>
                                  </div>
                                  <textarea
                                    onChange={event =>
                                      setOutlineDrafts(current => ({
                                        ...current,
                                        [lesson.id]: event.target.value
                                      }))
                                    }
                                    rows={8}
                                    value={getOutlineDraft(lesson)}
                                  />
                                  <div className='lesson-outline-actions'>
                                    <button
                                      className='course-secondary-action'
                                      disabled={courseLessonState[lesson.id] === 'saving'}
                                      onClick={() => void saveLessonOutline(lesson)}
                                      type='button'>
                                      保存大纲 JSON
                                    </button>
                                    <button
                                      className='course-secondary-action'
                                      disabled={
                                        lesson.outline_confirmed_at ||
                                        courseLessonState[lesson.id] === 'confirming'
                                      }
                                      onClick={() => void confirmLessonOutline(lesson)}
                                      type='button'>
                                      {lesson.outline_confirmed_at
                                        ? '大纲已确认'
                                        : '确认本课大纲'}
                                    </button>
                                    <small>
                                      {courseLessonState[lesson.id] === 'invalid-json'
                                        ? 'JSON 格式有误'
                                        : courseLessonState[lesson.id] === 'saved'
                                          ? '已保存'
                                          : courseLessonState[lesson.id] === 'confirmed'
                                            ? '已确认'
                                            : '确认后进入节点级生成'}
                                    </small>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>

                        <details className='course-worker-panel'>
                          <summary>高级运行信息</summary>
                          <div className='course-lessons-head'>
                            <strong>本地处理命令</strong>
                            <button
                              className='course-secondary-action'
                              disabled={courseManifestState[job.id] === 'loading'}
                              onClick={() => void loadWorkerManifest(job)}
                              type='button'>
                              {courseManifestState[job.id] === 'loading'
                                ? '读取中'
                                : '读取'}
                            </button>
                          </div>

                          {courseManifestState[job.id] === 'error' && (
                            <p>运行包读取失败，请先确认课程任务和数据库 schema。</p>
                          )}

                          {courseManifests[job.id] && (
                            <>
                              <div className='worker-manifest-grid'>
                                {Object.entries(courseManifests[job.id].gates || {}).map(
                                  ([key, value]) => (
                                    <span
                                      className={value ? 'is-done' : ''}
                                      key={key}>
                                      {value ? '✓' : '·'} {key}
                                    </span>
                                  )
                                )}
                                <small>
                                  {courseManifests[job.id].lessons?.length || 0} 课 ·{' '}
                                  {courseManifests[job.id].materialBundle?.slideDeckCount || 0}{' '}
                                  份课件池 · 工作目录：{courseManifests[job.id].worker?.workdir}
                                </small>
                              </div>

                              <div className='worker-command-board'>
                                <div className='worker-command-head'>
                                  <strong>下一步运行</strong>
                                  <span>
                                    {courseManifests[job.id].worker?.nextKey === 'confirm-outlines'
                                      ? '先在网页端确认全部大纲'
                                      : courseManifests[job.id].worker?.nextKey || 'prepare'}
                                  </span>
                                </div>
                                {(courseManifests[job.id].worker?.commands || []).map(
                                  command => {
                                    const commandKey = `${job.id}:${command.key}`
                                    const isNext =
                                      courseManifests[job.id].worker?.nextKey === command.key

                                    return (
                                      <article
                                        className={
                                          isNext
                                            ? 'worker-command is-next'
                                            : 'worker-command'
                                        }
                                        key={command.key}>
                                        <div>
                                          <span>{isNext ? '现在' : '后续'}</span>
                                          <strong>{command.label}</strong>
                                          <p>{command.when}</p>
                                        </div>
                                        <code>{command.command}</code>
                                        <button
                                          className='course-secondary-action'
                                          onClick={() =>
                                            void copyWorkerCommand(
                                              commandKey,
                                              command.command
                                            )
                                          }
                                          type='button'>
                                          {copiedCommand === commandKey ? '已复制' : '复制'}
                                        </button>
                                      </article>
                                    )
                                  }
                                )}
                              </div>
                            </>
                          )}
                        </details>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section
              className={
                activeSection === 'sharing'
                  ? 'content-console glass'
                  : 'content-console glass is-hidden'
              }
              aria-labelledby='content-console-title'>
              <div className='console-head'>
                <div>
                  <p>Sharing</p>
                  <h2 id='content-console-title'>分享设置</h2>
                </div>
                <div className='console-state'>
                  <span>{contentStats.total} 条内容</span>
                  <strong>公开、密码、有效期</strong>
                </div>
              </div>

              <div className='console-layout'>
                <div className='config-board' aria-label='内容条目配置预览'>
                  {contentRows.length === 0 ? (
                    <div className='empty-config'>
                      暂无可配置内容。
                    </div>
                  ) : (
                    contentRows.map(row => (
                      <ContentConfigRow
                        allTagOptions={allTagOptions}
                        key={row.slug}
                        row={row}
                      />
                    ))
                  )}
                </div>

                <aside className='rules-card'>
                  <h3>边界</h3>
                  <p>每篇内容单独决定访问方式。私有内容不会进入公开列表、搜索、RSS 或 sitemap。</p>
                </aside>
              </div>
            </section>

            {['library', 'writing', 'settings'].includes(activeSection) && (
              <section className='placeholder-panel glass'>
                <p>{activeCopy.eyebrow}</p>
                <h2>{activeCopy.title}</h2>
                <span>暂未启用。</span>
              </section>
            )}
          </main>
        </div>

        {captureOpen && (
          <div className='capture-layer' role='presentation'>
            <form
              aria-labelledby='capture-title'
              className='capture-panel glass'
              onSubmit={event => event.preventDefault()}>
              <div className='capture-head'>
                <div>
                  <p>Quick Capture</p>
                  <h2 id='capture-title'>快速收集</h2>
                </div>
                <button
                  aria-label='关闭快速收集'
                  className='capture-close'
                  onClick={() => setCaptureOpen(false)}
                  type='button'>
                  ×
                </button>
              </div>

              <label className='capture-label' htmlFor='quick-capture-draft'>
                随手写，不用先分类
              </label>
              <textarea
                id='quick-capture-draft'
                onChange={event => setDraft(event.target.value)}
                placeholder='例如：周五下午三点提醒我整理刑诉课第二讲材料，地点在图书馆，材料在桌面/课程/刑诉'
                rows={5}
                value={draft}
              />

              <div className='capture-preview' aria-label='后续解析字段预览'>
                <span>时间 · 待解析</span>
                <span>地点 · 待解析</span>
                <span>类型 · 待解析</span>
                <span>提醒 · 待解析</span>
              </div>

              <div className='capture-note'>
                会先保存到事项收集箱。能识别的字段先填上，拿不准的之后再改。
              </div>

              {captureState === 'saved' && capturedTask && (
                <div className='capture-result'>
                  <strong>已收进事项：{capturedTask.title}</strong>
                  <span>
                    {[
                      capturedTask.type,
                      capturedTask.priority,
                      capturedTask.place,
                      capturedTask.remindAt ? '已设提醒字段' : null
                    ]
                      .filter(Boolean)
                      .join(' · ') || '已进入 inbox'}
                  </span>
                </div>
              )}

              {captureState === 'error' && (
                <div className='capture-result is-error'>
                  保存失败，稍后我会再把错误提示做得更具体。
                </div>
              )}

              <div className='capture-actions'>
                <button
                  disabled={!draft.trim() || captureState === 'saving'}
                  onClick={() => void saveCapture()}
                  type='button'>
                  {captureState === 'saving' ? '保存中' : '收进事项'}
                </button>
                <button onClick={() => setCaptureOpen(false)} type='button'>
                  关闭
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .desk-page {
          --ink: #16201d;
          --muted: #607069;
          --quiet: #8a9892;
          --line: rgba(255, 255, 255, 0.45);
          --glass: rgba(255, 255, 255, 0.42);
          --glass-strong: rgba(255, 255, 255, 0.62);
          --green: #335d47;
          --blue: #315a8c;
          --gold: #d1a34a;
          min-height: 100vh;
          color: var(--ink);
          overflow: hidden;
          background:
            radial-gradient(
              circle at 12% 12%,
              rgba(209, 163, 74, 0.26),
              transparent 24rem
            ),
            radial-gradient(
              circle at 90% 12%,
              rgba(49, 90, 140, 0.2),
              transparent 24rem
            ),
            linear-gradient(140deg, #f6fbf8 0%, #eaf3f2 45%, #f9fbf8 100%);
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .desk-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.32;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.42) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.38) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, black, transparent 78%);
        }

        .aurora {
          position: fixed;
          width: 46vw;
          height: 46vw;
          border-radius: 999px;
          filter: blur(26px);
          opacity: 0.34;
          pointer-events: none;
        }

        .aurora.one {
          left: -14vw;
          bottom: -20vw;
          background: rgba(63, 95, 58, 0.28);
        }

        .aurora.two {
          right: -16vw;
          top: 16vh;
          background: rgba(49, 90, 140, 0.22);
        }

        .shell {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 22px;
          width: min(1220px, calc(100% - 32px));
          margin: 0 auto;
          padding: 24px 0;
          min-height: 100vh;
        }

        .glass {
          border: 1px solid var(--line);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.24)),
            var(--glass);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.6),
            0 22px 70px rgba(45, 65, 58, 0.1);
          backdrop-filter: blur(24px) saturate(1.35);
          -webkit-backdrop-filter: blur(24px) saturate(1.35);
        }

        .metric,
        .task-item,
        .module,
        .course-job-list article,
        .config-row,
        .worker-command,
        .placeholder-panel {
          transition:
            transform 170ms ease,
            border-color 170ms ease,
            box-shadow 170ms ease,
            background 170ms ease;
        }

        .metric:hover,
        .task-item:hover,
        .module:hover,
        .course-job-list article:hover,
        .config-row:hover,
        .worker-command:hover,
        .placeholder-panel:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.72);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.68),
            0 26px 76px rgba(45, 65, 58, 0.13);
        }

        .sidebar {
          min-height: calc(100vh - 48px);
          position: sticky;
          top: 24px;
          max-height: calc(100vh - 48px);
          overflow: auto;
          border-radius: 32px;
          padding: 22px;
          display: flex;
          flex-direction: column;
        }

        .brand {
          display: grid;
          gap: 4px;
          margin-bottom: 28px;
        }

        .brand span {
          color: var(--quiet);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .brand strong {
          font-size: 28px;
          letter-spacing: -0.06em;
        }

        nav {
          display: grid;
          gap: 8px;
        }

        .nav-item {
          display: grid;
          gap: 4px;
          padding: 13px 14px;
          border: 1px solid transparent;
          border-radius: 18px;
          color: var(--muted);
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .nav-item.active,
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.58);
          border-color: rgba(255, 255, 255, 0.58);
          color: var(--ink);
        }

        .nav-item:hover {
          transform: translateX(3px);
        }

        .nav-item span {
          font-weight: 720;
        }

        .nav-item small {
          color: var(--quiet);
          font-size: 12px;
        }

        .sidebar-foot {
          margin-top: auto;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.48);
        }

        .sidebar-foot span {
          display: block;
          color: var(--quiet);
          font-size: 12px;
          margin-bottom: 5px;
        }

        .sidebar-foot strong {
          font-size: 13px;
        }

        .main {
          display: grid;
          gap: 22px;
        }

        .topbar {
          min-height: 148px;
          border-radius: 34px;
          padding: 26px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 420px;
          gap: 24px;
          align-items: center;
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        .topbar p,
        .section-head p {
          color: var(--gold);
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        h1 {
          font-size: clamp(34px, 5vw, 58px);
          line-height: 1.05;
          letter-spacing: -0.07em;
        }

        .quick-capture {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          width: 100%;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.56);
          border: 1px solid rgba(255, 255, 255, 0.52);
          color: var(--ink);
          cursor: pointer;
          text-align: left;
          transition:
            transform 180ms ease,
            background 180ms ease;
        }

        .quick-capture:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.7);
        }

        .quick-capture span {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(22, 32, 29, 0.86);
          color: white;
          font-weight: 720;
        }

        .quick-capture strong {
          flex: 1;
          min-width: 0;
          color: var(--ink);
          font-size: 14px;
          font-weight: 520;
        }

        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 22px;
        }

        .today,
        .status-rail,
        .module,
        .course-console,
        .content-console {
          border-radius: 30px;
          padding: 24px;
          scroll-margin-top: 24px;
        }

        .section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }

        .section-head h2,
        .status-rail h2,
        .module h2,
        .console-head h2 {
          font-size: 24px;
          letter-spacing: -0.05em;
        }

        .section-head > span {
          color: var(--quiet);
          font-size: 13px;
        }

        .today-cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .metric {
          padding: 16px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.48);
        }

        .metric small {
          color: var(--quiet);
        }

        .metric strong {
          display: block;
          margin: 9px 0;
          font-size: 28px;
          letter-spacing: -0.06em;
        }

        .metric p,
        .focus-panel p,
        .module p,
        .rail-item p {
          color: #52635b;
          font-size: 13px;
          line-height: 1.65;
        }

        .focus-panel {
          display: flex;
          gap: 16px;
          margin-top: 18px;
          padding: 18px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.42);
        }

        .focus-panel h3 {
          margin-bottom: 7px;
          font-size: 17px;
        }

        .task-inbox-preview {
          display: grid;
          gap: 12px;
          margin-top: 16px;
          border-radius: 24px;
          padding: 16px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.2)),
            rgba(49, 90, 140, 0.06);
        }

        .task-inbox-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .task-inbox-head strong {
          font-size: 15px;
        }

        .task-inbox-head button {
          border: 0;
          border-radius: 999px;
          padding: 8px 11px;
          color: white;
          background: rgba(49, 90, 140, 0.82);
          cursor: pointer;
          font-size: 12px;
          font-weight: 760;
        }

        .task-inbox-preview > p {
          color: var(--quiet);
          font-size: 13px;
          line-height: 1.65;
        }

        .task-list {
          display: grid;
          gap: 8px;
        }

        .task-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
          border: 1px solid rgba(255, 255, 255, 0.34);
          border-radius: 18px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.36);
        }

        .task-item span {
          color: var(--gold);
          font-size: 11px;
          font-weight: 760;
        }

        .task-item strong {
          display: block;
          margin: 4px 0;
          font-size: 14px;
        }

        .task-item p {
          color: var(--quiet);
          font-size: 12px;
          line-height: 1.55;
        }

        .task-actions {
          display: grid;
          justify-items: end;
          gap: 6px;
          min-width: 104px;
        }

        .task-actions small {
          border-radius: 999px;
          padding: 5px 8px;
          color: var(--blue);
          background: rgba(255, 255, 255, 0.5);
          font-size: 11px;
          font-weight: 760;
        }

        .task-actions select,
        .task-actions button {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.48);
          border-radius: 11px;
          padding: 6px 7px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.5);
          font-size: 11px;
        }

        .task-actions button {
          color: white;
          background: rgba(51, 93, 71, 0.86);
          cursor: pointer;
          font-weight: 760;
        }

        .task-actions button:disabled,
        .task-actions select:disabled {
          opacity: 0.62;
          cursor: wait;
        }

        .orb {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 999px;
          background:
            radial-gradient(circle at 30% 30%, #fff, transparent 28%),
            linear-gradient(135deg, var(--gold), var(--green));
          box-shadow: 0 10px 28px rgba(63, 95, 58, 0.24);
        }

        .status-rail {
          display: grid;
          align-content: start;
          gap: 14px;
        }

        .is-hidden {
          display: none !important;
        }

        .placeholder-panel {
          min-height: 360px;
          border-radius: 34px;
          padding: 30px;
          display: grid;
          align-content: center;
          justify-items: start;
          gap: 12px;
        }

        .placeholder-panel p {
          color: var(--gold);
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .placeholder-panel h2 {
          font-size: clamp(30px, 4vw, 46px);
          letter-spacing: -0.06em;
        }

        .placeholder-panel span {
          color: var(--muted);
        }

        .rail-item {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: 10px;
          align-items: start;
        }

        .rail-item span {
          color: var(--blue);
          font-size: 12px;
          font-weight: 720;
        }

        .module-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .module {
          min-height: 218px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .module span {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 14px;
          border: 1px solid rgba(49, 90, 140, 0.16);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--blue);
          background: rgba(49, 90, 140, 0.055);
          font-size: 12px;
        }

        .module p {
          margin-top: 12px;
        }

        .module-action {
          width: fit-content;
          margin-top: 24px;
          border: 0;
          border-radius: 999px;
          padding: 10px 13px;
          color: white;
          background: rgba(22, 32, 29, 0.84);
          cursor: default;
        }

        .module-action.is-live {
          cursor: pointer;
        }

        .module-action.is-live:hover {
          background: rgba(22, 32, 29, 0.94);
        }

        .course-console,
        .content-console {
          overflow: hidden;
        }

        .console-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
        }

        .console-head p {
          color: var(--gold);
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .console-state {
          display: grid;
          gap: 4px;
          min-width: 190px;
          border-radius: 20px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.42);
        }

        .console-state span {
          color: var(--blue);
          font-size: 12px;
          font-weight: 760;
        }

        .console-state strong {
          color: var(--muted);
          font-size: 12px;
          font-weight: 560;
        }

        .console-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 270px;
          gap: 16px;
          align-items: start;
        }

        .course-job-layout {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .course-job-form {
          display: grid;
          gap: 10px;
          border-radius: 24px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.34);
        }

        .wizard-steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
          margin-bottom: 4px;
        }

        .wizard-steps span {
          border: 1px solid rgba(255, 255, 255, 0.52);
          border-radius: 999px;
          padding: 7px 8px;
          color: var(--quiet);
          background: rgba(255, 255, 255, 0.36);
          font-size: 11px;
          text-align: center;
          font-weight: 760;
        }

        .wizard-steps span.is-current {
          color: white;
          background: rgba(51, 93, 71, 0.86);
        }

        .course-brief textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid rgba(49, 90, 140, 0.12);
          border-radius: 18px;
          padding: 13px 14px;
          outline: none;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.62);
          font: inherit;
          line-height: 1.7;
        }

        .course-manual-fields {
          border: 1px solid rgba(255, 255, 255, 0.48);
          border-radius: 18px;
          padding: 11px 12px;
          background: rgba(255, 255, 255, 0.28);
        }

        .course-manual-fields summary {
          color: var(--muted);
          cursor: pointer;
          font-size: 12px;
          font-weight: 760;
        }

        .course-manual-fields > div {
          display: grid;
          gap: 10px;
          margin-top: 11px;
        }

        .course-job-form label {
          display: grid;
          gap: 7px;
          color: var(--quiet);
          font-size: 12px;
          font-weight: 680;
        }

        .course-job-form input {
          width: 100%;
          border: 1px solid rgba(49, 90, 140, 0.12);
          border-radius: 14px;
          padding: 10px 11px;
          outline: none;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.58);
          font: inherit;
        }

        .course-brief textarea:focus,
        .course-job-form input:focus,
        .course-preflight-grid input:not([type='checkbox']):focus,
        .course-preflight-grid select:focus,
        .row-controls input:not([type='checkbox']):focus,
        .row-controls select:focus {
          border-color: rgba(49, 90, 140, 0.34);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 0 0 4px rgba(49, 90, 140, 0.08);
        }

        .course-job-form button {
          border: 0;
          border-radius: 16px;
          padding: 11px 14px;
          color: #fbfdfb;
          background: linear-gradient(135deg, #395d42, #315a8c);
          cursor: pointer;
          font-size: 13px;
          font-weight: 760;
        }

        .course-job-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .course-job-form small {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .course-job-list {
          display: grid;
          gap: 10px;
        }

        .course-job-list > p,
        .course-job-list article {
          margin: 0;
          border-radius: 22px;
          padding: 14px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.32);
          font-size: 13px;
          line-height: 1.7;
        }

        .course-job-list article span {
          display: inline-flex;
          margin-bottom: 8px;
          border-radius: 999px;
          padding: 5px 9px;
          color: var(--blue);
          background: rgba(49, 90, 140, 0.08);
          font-size: 12px;
          font-weight: 720;
        }

        .course-job-list article strong {
          display: block;
          color: var(--ink);
          font-size: 15px;
        }

        .course-job-list article p {
          margin-top: 4px;
          color: var(--quiet);
          font-size: 12px;
        }

        .course-asset-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          border: 1px dashed rgba(49, 90, 140, 0.22);
          border-radius: 18px;
          padding: 13px;
          background:
            linear-gradient(135deg, rgba(49, 90, 140, 0.08), rgba(255, 255, 255, 0.28)),
            rgba(255, 255, 255, 0.36);
        }

        .course-asset-row label {
          display: block;
          color: var(--blue);
          cursor: pointer;
          font-size: 12px;
          font-weight: 760;
        }

        .course-asset-row label span,
        .course-asset-row label strong {
          display: block;
        }

        .course-asset-row label strong {
          margin-top: 4px;
          color: var(--quiet);
          font-size: 12px;
          font-weight: 560;
        }

        .course-asset-row input {
          max-width: 180px;
          color: var(--quiet);
          font-size: 11px;
        }

        .course-asset-row small {
          color: var(--muted);
          font-size: 12px;
        }

        .course-asset-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .course-asset-chips span {
          overflow: hidden;
          max-width: 100%;
          border-radius: 999px;
          padding: 6px 9px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .course-setup-panel {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          border-top: 1px solid rgba(49, 90, 140, 0.1);
          padding-top: 12px;
        }

        .course-setup-status {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .course-setup-status span {
          border-radius: 999px;
          padding: 6px 9px;
          color: #8a5a2a;
          background: rgba(201, 154, 59, 0.12);
          font-size: 11px;
          font-weight: 720;
        }

        .course-setup-status span.is-done {
          color: #2f5f3d;
          background: rgba(97, 154, 104, 0.14);
        }

        .course-secondary-action {
          width: fit-content;
          border: 0;
          border-radius: 999px;
          padding: 9px 12px;
          color: #fbfdfb;
          background: rgba(22, 32, 29, 0.82);
          cursor: pointer;
          font-size: 12px;
          font-weight: 760;
        }

        .course-secondary-action:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .course-setup-panel small {
          color: var(--quiet);
          font-size: 12px;
          line-height: 1.5;
        }

        .course-preflight-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          border-radius: 18px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.28);
        }

        .course-preflight-grid label,
        .course-preflight-grid fieldset {
          display: grid;
          gap: 7px;
          margin: 0;
          border: 0;
          padding: 0;
          color: var(--quiet);
          font-size: 12px;
          font-weight: 680;
        }

        .course-preflight-grid input:not([type='checkbox']),
        .course-preflight-grid select {
          min-width: 0;
          border: 1px solid rgba(49, 90, 140, 0.12);
          border-radius: 13px;
          padding: 9px 10px;
          outline: none;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.54);
          font: inherit;
          appearance: none;
        }

        .course-preflight-grid fieldset {
          grid-column: 1 / -1;
        }

        .course-preflight-grid fieldset label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-right: 8px;
          border: 1px solid rgba(255, 255, 255, 0.48);
          border-radius: 999px;
          padding: 7px 9px;
          background: rgba(255, 255, 255, 0.42);
          color: var(--muted);
          font-weight: 560;
        }

        .course-preflight-grid input[type='checkbox'],
        .row-controls input[type='checkbox'] {
          width: 14px;
          height: 14px;
          accent-color: #335d47;
        }

        .course-lessons-panel {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          border-top: 1px solid rgba(49, 90, 140, 0.1);
          padding-top: 12px;
        }

        .course-lessons-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .course-lessons-head strong {
          color: var(--ink);
          font-size: 13px;
        }

        .course-lessons-panel > p {
          margin: 0;
          border-radius: 16px;
          padding: 11px 12px;
          color: var(--quiet);
          background: rgba(255, 255, 255, 0.28);
          font-size: 12px;
          line-height: 1.65;
        }

        .lesson-outline-list {
          display: grid;
          gap: 10px;
        }

        .lesson-outline-list article {
          border-radius: 18px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.32);
        }

        .lesson-outline-head {
          display: grid;
          gap: 6px;
          margin-bottom: 10px;
        }

        .lesson-outline-head span {
          width: fit-content;
          border-radius: 999px;
          padding: 5px 8px;
          color: var(--blue);
          background: rgba(49, 90, 140, 0.08);
          font-size: 11px;
          font-weight: 720;
        }

        .lesson-outline-head strong {
          color: var(--ink);
          font-size: 13px;
        }

        .lesson-outline-list textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid rgba(49, 90, 140, 0.12);
          border-radius: 15px;
          padding: 11px;
          outline: 0;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.52);
          font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            'Liberation Mono', monospace;
        }

        .lesson-outline-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
        }

        .lesson-outline-actions small {
          color: var(--quiet);
          font-size: 12px;
        }

        .course-preprocess-panel {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          border-top: 1px solid rgba(49, 90, 140, 0.1);
          padding-top: 12px;
        }

        .preprocess-badge {
          width: fit-content;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 760;
        }

        .preprocess-badge.is-done {
          color: #2f5f3d;
          background: rgba(97, 154, 104, 0.16);
        }

        .preprocess-badge.is-warn {
          color: #8a5a2a;
          background: rgba(201, 154, 59, 0.14);
        }

        .preprocess-badge.is-error {
          color: #8a3a2a;
          background: rgba(190, 92, 70, 0.14);
        }

        .preprocess-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          border-radius: 18px;
          padding: 12px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0.2)),
            rgba(87, 124, 111, 0.08);
        }

        .preprocess-summary-grid span {
          border-radius: 999px;
          padding: 7px 9px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.44);
          font-size: 11px;
          font-weight: 720;
        }

        .preprocess-summary-grid small {
          grid-column: 1 / -1;
          color: var(--quiet);
          font-size: 12px;
          line-height: 1.55;
        }

        .course-worker-panel {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          border-top: 1px solid rgba(49, 90, 140, 0.1);
          padding-top: 12px;
        }

        .course-worker-panel > p {
          margin: 0;
          border-radius: 16px;
          padding: 11px 12px;
          color: #8a5a2a;
          background: rgba(201, 154, 59, 0.12);
          font-size: 12px;
          line-height: 1.65;
        }

        .worker-manifest-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          border-radius: 18px;
          padding: 12px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.22)),
            rgba(111, 153, 138, 0.08);
        }

        .worker-manifest-grid span {
          border-radius: 999px;
          padding: 7px 9px;
          color: var(--quiet);
          background: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          font-weight: 720;
        }

        .worker-manifest-grid span.is-done {
          color: #2f5f3d;
          background: rgba(97, 154, 104, 0.16);
        }

        .worker-manifest-grid small {
          grid-column: 1 / -1;
          color: var(--quiet);
          font-size: 12px;
          line-height: 1.55;
        }

        .worker-command-board {
          display: grid;
          gap: 10px;
          border-radius: 20px;
          padding: 12px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.18)),
            rgba(49, 90, 140, 0.06);
        }

        .worker-command-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted);
        }

        .worker-command-head strong {
          color: var(--ink);
          font-size: 13px;
        }

        .worker-command-head span {
          border-radius: 999px;
          padding: 5px 9px;
          color: var(--blue);
          background: rgba(255, 255, 255, 0.48);
          font-size: 11px;
          font-weight: 760;
        }

        .worker-command {
          display: grid;
          grid-template-columns: minmax(170px, 0.9fr) minmax(0, 1.4fr) auto;
          gap: 10px;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.32);
          border-radius: 18px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.32);
        }

        .worker-command.is-next {
          border-color: rgba(49, 90, 140, 0.24);
          background:
            linear-gradient(135deg, rgba(49, 90, 140, 0.1), rgba(209, 163, 74, 0.08)),
            rgba(255, 255, 255, 0.42);
        }

        .worker-command span {
          color: var(--gold);
          font-size: 11px;
          font-weight: 760;
        }

        .worker-command strong {
          display: block;
          margin: 3px 0 4px;
          font-size: 13px;
        }

        .worker-command p {
          color: var(--quiet);
          font-size: 12px;
          line-height: 1.5;
        }

        .worker-command code {
          display: block;
          overflow: auto;
          border-radius: 12px;
          padding: 9px 10px;
          color: #23312d;
          background: rgba(255, 255, 255, 0.54);
          font-size: 11px;
          line-height: 1.45;
          white-space: nowrap;
        }

        .config-board {
          display: grid;
          gap: 12px;
        }

        .empty-config {
          border: 1px dashed rgba(49, 90, 140, 0.24);
          border-radius: 24px;
          padding: 22px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.34);
          font-size: 14px;
          line-height: 1.7;
        }

        .config-row {
          display: grid;
          grid-template-columns: minmax(180px, 0.78fr) minmax(0, 1.38fr) 150px;
          gap: 14px;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 24px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.36);
        }

        .row-main span {
          display: inline-flex;
          margin-bottom: 8px;
          border-radius: 999px;
          padding: 5px 9px;
          color: var(--blue);
          background: rgba(49, 90, 140, 0.07);
          font-size: 12px;
          font-weight: 720;
        }

        .row-main h3 {
          overflow: hidden;
          font-size: 16px;
          letter-spacing: -0.03em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .row-main p {
          margin-top: 7px;
          color: var(--quiet);
          font-size: 12px;
          line-height: 1.5;
        }

        .row-controls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .row-controls .wide-control,
        .row-controls .permission-toggles {
          grid-column: 1 / -1;
        }

        .row-controls label,
        .row-controls fieldset {
          display: grid;
          gap: 7px;
          margin: 0;
          border: 0;
          padding: 0;
          color: var(--quiet);
          font-size: 12px;
          font-weight: 680;
        }

        .row-controls fieldset > div {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .row-controls fieldset label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 1px solid rgba(255, 255, 255, 0.48);
          border-radius: 999px;
          padding: 7px 9px;
          background: rgba(255, 255, 255, 0.44);
          color: var(--muted);
          font-weight: 560;
        }

        .row-controls input:not([type='checkbox']),
        .row-controls select {
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.55);
          border-radius: 14px;
          padding: 9px 10px;
          outline: none;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.52);
          font: inherit;
          font-weight: 560;
          appearance: none;
        }

        .row-controls input:disabled {
          color: var(--quiet);
          cursor: not-allowed;
        }

        .permission-toggles {
          grid-column: 1 / -1;
        }

        .row-meta {
          display: grid;
          gap: 10px;
          justify-items: end;
        }

        .row-meta span {
          max-width: 100%;
          border-radius: 999px;
          padding: 7px 9px;
          color: var(--green);
          background: rgba(51, 93, 71, 0.08);
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .row-meta a,
        .row-meta button {
          border: 0;
          border-radius: 999px;
          padding: 10px 12px;
        }

        .row-meta a {
          color: white;
          background: rgba(22, 32, 29, 0.84);
          font-size: 13px;
          text-align: center;
        }

        .row-meta button {
          color: white;
          background: rgba(49, 90, 140, 0.82);
          cursor: pointer;
        }

        .row-meta button:disabled {
          opacity: 0.62;
          cursor: wait;
        }

        .row-meta small {
          color: #b3533f;
          font-size: 12px;
        }

        .rules-card {
          border-radius: 24px;
          padding: 18px;
          background:
            linear-gradient(150deg, rgba(22, 32, 29, 0.84), rgba(49, 90, 140, 0.72)),
            rgba(22, 32, 29, 0.8);
          color: white;
        }

        .rules-card h3 {
          margin-bottom: 8px;
        }

        .rules-card p {
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.65;
        }

        .rules-card ul {
          display: grid;
          gap: 8px;
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }

        .rules-card li {
          position: relative;
          padding-left: 16px;
          color: rgba(255, 255, 255, 0.86);
          font-size: 13px;
          line-height: 1.55;
        }

        .rules-card li::before {
          content: '';
          position: absolute;
          top: 0.68em;
          left: 0;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--gold);
        }

        .capture-layer {
          position: fixed;
          inset: 0;
          z-index: 20;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.46), transparent 24rem),
            rgba(12, 20, 18, 0.28);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .capture-panel {
          width: min(620px, 100%);
          border-radius: 34px;
          padding: 22px;
        }

        .capture-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .capture-head p {
          color: var(--gold);
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .capture-close {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 16px;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.62);
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
        }

        .capture-label {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 680;
        }

        .capture-panel textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid rgba(255, 255, 255, 0.68);
          border-radius: 24px;
          padding: 16px;
          outline: 0;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.56);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
          font:
            15px/1.65 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC',
            'PingFang SC', sans-serif;
        }

        .capture-panel textarea:focus {
          border-color: rgba(49, 90, 140, 0.38);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.72),
            0 0 0 4px rgba(49, 90, 140, 0.08);
        }

        .capture-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .capture-preview span {
          border: 1px solid rgba(49, 90, 140, 0.14);
          border-radius: 999px;
          padding: 7px 10px;
          color: var(--blue);
          background: rgba(49, 90, 140, 0.055);
          font-size: 12px;
        }

        .capture-note {
          margin-top: 14px;
          border-radius: 18px;
          padding: 12px 14px;
          color: #52635b;
          background: rgba(255, 255, 255, 0.46);
          font-size: 13px;
          line-height: 1.65;
        }

        .capture-result {
          margin-top: 12px;
          border-radius: 18px;
          padding: 11px 13px;
          color: #2f5f3d;
          background: rgba(97, 154, 104, 0.14);
          font-size: 13px;
          line-height: 1.6;
        }

        .capture-result strong,
        .capture-result span {
          display: block;
        }

        .capture-result span {
          margin-top: 4px;
          color: #52635b;
          font-size: 12px;
          font-weight: 560;
        }

        .capture-result.is-error {
          color: #8a4a34;
          background: rgba(201, 114, 76, 0.14);
        }

        .capture-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .capture-actions button {
          border: 0;
          border-radius: 999px;
          padding: 11px 14px;
          color: white;
          background: rgba(22, 32, 29, 0.84);
          cursor: pointer;
        }

        .capture-actions button:disabled {
          color: rgba(22, 32, 29, 0.42);
          background: rgba(255, 255, 255, 0.56);
          cursor: not-allowed;
        }

        @supports not ((backdrop-filter: blur(1px))) {
          .glass {
            background: rgba(255, 255, 255, 0.88);
          }
        }

        @media (max-width: 980px) {
          .shell,
          .grid,
          .topbar,
          .module-grid,
          .course-job-layout,
          .console-layout,
          .config-row {
            grid-template-columns: 1fr;
          }

          .worker-command {
            grid-template-columns: 1fr;
          }

          .task-item {
            grid-template-columns: 1fr;
          }

          .task-actions {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            justify-items: stretch;
          }

          .sidebar {
            min-height: auto;
          }

          nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .today-cards {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .shell {
            width: min(100% - 20px, 1220px);
            padding: 10px 0;
          }

          .topbar,
          .today,
          .status-rail,
          .module,
          .course-console,
          .content-console,
          .sidebar {
            border-radius: 24px;
          }

          .console-head,
          .section-head {
            display: grid;
          }

          .row-controls {
            grid-template-columns: 1fr;
          }

          nav {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}

DeskPage.layout = 'bare'

export default DeskPage

export async function getServerSideProps(context) {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { userId, user } = await getAdminCandidate(context.req)

    if (!userId) {
      return {
        redirect: {
          destination: `/sign-in?redirectTo=${encodeURIComponent('/desk')}`,
          permanent: false
        }
      }
    }

    if (hasAdminAllowlist() && !isAdminUser(user)) {
      return {
        props: {
          authForbidden: true
        }
      }
    }
  }

  let snapshots = getLiveContentIndex()
  let courseJobs = []
  let tasks = []
  let contentSource = snapshots.length ? 'live fallback' : '空'

  try {
    const rows = await listAdminContentMetadata()
    const databaseSnapshots = rows.map(row => toSnapshotLikeContent(row))

    if (databaseSnapshots.length > 0) {
      snapshots = databaseSnapshots
      contentSource = '数据库优先'
    }
  } catch (error) {
    console.warn('[desk] database content read failed, fallback to live JSON', error)
  }

  try {
    courseJobs = await listCourseJobs()
  } catch (error) {
    console.warn('[desk] course jobs read failed, fallback to empty list', error)
  }

  try {
    tasks = await listRecentTasks()
  } catch (error) {
    console.warn('[desk] tasks read failed, fallback to empty list', error)
  }

  return {
    props: {
      contentRows: snapshots.map(toDeskContentRow),
      contentStats: {
        total: snapshots.length,
        source: contentSource
      },
      initialCourseJobs: courseJobs,
      initialTasks: tasks
    }
  }
}
