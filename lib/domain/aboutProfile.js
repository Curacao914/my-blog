
export const ABOUT_PROFILE_STORAGE_KEY = 'law-tech-about-profile-v1'
export const aboutProfile = {
  name: 'Curacao',
  title: '北京大学法学院法律硕士（非法学）',
  subtitle: '法学写作、案例分析与个人网站实验。',
  intro: ['本科就读于中南财经政法大学侦查学专业，现为北京大学法学院法律硕士（非法学）。','这个网站用于整理课程、文章、读书记录、工具和工作流。'],
  education: [
    { school: '北京大学', college: '法学院', degree: '法律硕士（非法学）', period: '2025.09 — 2028.06', logo: '/law-tech/about/pku-logo.png', tone: 'pku', details: ['民法、刑法、行政法、宪法、法理学等课程训练','规范分析、案例拆解与法律技术工具'] },
    { school: '中南财经政法大学', college: '刑事司法学院', degree: '法学学士（侦查学）', period: '2021.09 — 2025.06', logo: '/law-tech/about/zuel-logo.png', tone: 'zuel', details: ['侦查学、刑事司法与证据分析训练','学生工作、学术竞赛与数字法学写作经历'] }
  ],
  tracks: [
    { label: '法学', text: '课程笔记、案例研习、论文与实务材料整理。' },
    { label: '写作', text: '经济法、民法、刑法、国际法等方向的持续写作。' },
    { label: '技术', text: '个人网站、OCR、引注、内容索引与学习工作流。' }
  ],
  skills: { 法学: ['民法','刑法','经济法','国际法','刑事诉讼法'], 写作: ['论文','案例分析','法律检索','文献综述'], 技术: ['JavaScript','Python','Next.js','OCR','RAG','Agent'], 工具: ['Markdown','LaTeX','Git','Notion','Vercel'] },
  links: [{ label: '内容库', href: '/content' }, { label: '工具', href: '/tools' }, { label: '时间归档', href: '/archive' }]
}
