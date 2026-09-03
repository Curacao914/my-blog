export const todayCards = [
  {
    title: '整理刑诉课材料',
    meta: '课程 · 今天 15:00',
    tone: 'honey',
    detail: 'SRT 和课件进入同一个课程流程，先确认顺序，再生成笔记。'
  },
  {
    title: '处理收集箱',
    meta: '事项 · 12 条待判断',
    tone: 'leaf',
    detail: '只判断下一步动作，不强迫一次性归档完整。'
  },
  {
    title: '检查一篇公开笔记',
    meta: '发布 · 密码分享',
    tone: 'blue',
    detail: '确认访问方式。'
  }
]

export const workflowCards = [
  {
    title: '课程材料 → 单课笔记',
    status: '等待材料',
    steps: ['上传 SRT/PPT', '确认偏好', '生成大纲', '生成笔记', '校验入库']
  },
  {
    title: '自然语言 → 事项',
    status: '可用入口',
    steps: ['收集', '解析', '追问缺口', '安排提醒', '回流今日']
  },
  {
    title: '笔记 → 分享',
    status: '设计中',
    steps: ['选择内容', '设置权限', '公开/限时访问']
  }
]
