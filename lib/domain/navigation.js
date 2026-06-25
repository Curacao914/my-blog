export const publicNav = [
  { label: '内容', href: '/content' },
  { label: '工具', href: '/tools' },
  { label: '关于', href: '/about' },
  { label: '工作台', href: '/desk' }
]

export const deskNav = [
  {
    group: '日常',
    items: [
      { key: 'today', label: '今日', href: '/desk/today' },
      { key: 'inbox', label: '随手记', href: '/desk/inbox' },
      { key: 'reading', label: '阅读箱', href: '/desk/reading' }
    ]
  },
  {
    group: '材料',
    items: [
      { key: 'tasks', label: '事项', href: '/desk/tasks' },
      { key: 'courses', label: '课程整理', href: '/desk/courses' },
      { key: 'materials', label: '材料', href: '/desk/materials' },
      { key: 'writing', label: '写作', href: '/desk/writing' }
    ]
  },
  {
    group: '发布',
    items: [
      { key: 'publish', label: '内容设置', href: '/desk/publish' },
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
