export const aboutProfile = {
  name: 'Curacao',
  headline: '北京大学法学院法律硕士（非法学）',
  summary: '关注法学写作、案例分析、学习工具与个人知识系统。本科就读于中南财经政法大学侦查学专业。',
  education: [
    { school: '北京大学', detail: '法学院法律硕士（非法学）', period: '2025 - Present', mark: 'PKU' },
    { school: '中南财经政法大学', detail: '侦查学专业', period: '2021 - 2025', mark: 'ZUEL' }
  ],
  sections: [
    { title: '法学', body: '课程笔记、案例分析、论文与实务材料整理。', href: '/content', action: '查看内容' },
    { title: '写作', body: '经济法、民法、刑法、国际法与日常文本。', href: '/archive', action: '时间归档' },
    { title: '技术', body: '个人网站、OCR、引注与学习工作流。', href: '/tools', action: '查看工具' }
  ],
  skills: [
    { group: 'Writing', tags: ['法学论文', '案例分析', '讲稿', '公众号'] },
    { group: 'Law', tags: ['经济法', '民法', '刑法', '国际法', '证据法'] },
    { group: 'Tools', tags: ['Notion', 'Markdown', 'LaTeX', 'OCR', 'Git'] },
    { group: 'Web', tags: ['Next.js', 'React', 'CSS', 'Vercel'] }
  ]
}
