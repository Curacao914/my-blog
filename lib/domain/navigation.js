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
