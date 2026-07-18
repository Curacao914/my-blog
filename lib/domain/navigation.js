export const publicNav = [
  { key: 'content', label: '内容', href: '/content' },
  { key: 'search', label: '搜索', href: '/search' },
  { key: 'tools', label: '工具', href: '/tools' },
  { key: 'about', label: '关于', href: '/about' },
  { key: 'desk', label: '工作台', href: '/desk' }
]

export const deskNav = [
  {
    group: '安排',
    items: [
      { key: 'today', label: '今日', href: '/desk/today' },
      { key: 'tasks', label: '事项', href: '/desk/tasks' },
      { key: 'inbox', label: '随手记', href: '/desk/inbox' }
    ]
  },
  {
    group: '阅读与知识',
    items: [
      { key: 'reading', label: '阅读箱', href: '/desk/reading' },
      { key: 'materials', label: '笔记库', href: '/desk/materials' }
    ]
  },
  {
    group: '创作',
    items: [
      { key: 'courses', label: '课程整理', href: '/desk/courses' },
      { key: 'writing', label: '写作', href: '/desk/writing' },
      { key: 'publish', label: '内容发布', href: '/desk/publish' }
    ]
  },
  {
    group: '管理',
    items: [
      { key: 'system', label: '系统', href: '/desk/system' }
    ]
  }
]

export const objectTypes = [
  'capture',
  'task',
  'material',
  'course',
  'course_session',
  'note',
  'article',
  'project',
  'workflow',
  'share'
]
