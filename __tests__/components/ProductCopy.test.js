const fs = require('fs')
const path = require('path')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return full
  })
}

describe('user-facing product copy', () => {
  it('does not expose implementation notes or explanatory filler', () => {
    const files = [
      ...walk(path.join(process.cwd(), 'components')),
      ...walk(path.join(process.cwd(), 'pages', 'desk')),
      path.join(process.cwd(), 'pages', 'index.js'),
      ...walk(path.join(process.cwd(), 'pages', 'about')),
      ...walk(path.join(process.cwd(), 'pages', 'tools')),
      ...walk(path.join(process.cwd(), 'pages', 'content')),
      ...walk(path.join(process.cwd(), 'pages', 'search'))
    ].filter(file => /\.(js|jsx|tsx)$/.test(file) && fs.existsSync(file))

    const forbidden = [
      'TextPack v1',
      'schemaVersion',
      'MVP',
      'TODO',
      '占位',
      '等待后续实现',
      '后续接入',
      '生成预览后，这里会显示',
      'worker-step',
      'provider adapter',
      'workflow JSON',
      '本地处理服务',
      '普通资料在浏览器读取；扫描资料在线识别后只保存文字。',
      '这里放写完的东西',
      '在同一个工作台里慢慢长出来',
      '法律、写作与技术',
      '把混乱慢慢讲清楚',
      '少一点重复劳动',
      '文章、课程笔记与项目，统一进入同一套目录与搜索',
      '公开内容保留清晰的来源',
      '不做工具箱大全',
      '账号、私人服务和管理员配置分开管理',
      '昵称与头像只影响工作台展示',
      '图片仍由图床托管',
      '日程、笔记、阅读、课程、草稿与提醒只属于当前身份',
      'AI API、模型和邮件发送配置不会与其他成员共用',
      '当前身份拥有公开发布权限',
      '密钥只会在服务端加密保存',
      '成员拥有彼此隔离的私人工作区',
      '管理员的邮件额度不会自动共享',
      '这里管理全站连接',
      '全站密钥暴露给前端',
      '随手记负责保存碎片'
    ]

    const offenders = []
    for (const file of files) {
      const text = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '')
      for (const word of forbidden) {
        if (text.includes(word)) offenders.push(`${path.relative(process.cwd(), file)}: ${word}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
