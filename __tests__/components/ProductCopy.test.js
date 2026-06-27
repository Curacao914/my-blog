const fs = require('fs')
const path = require('path')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return full
  })
}

describe('user-facing product copy', () => {
  it('does not expose implementation vocabulary on ordinary pages', () => {
    const files = [
      ...walk(path.join(process.cwd(), 'components')),
      ...walk(path.join(process.cwd(), 'pages', 'desk'))
    ].filter(file => /\.(js|jsx|tsx)$/.test(file))

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
      '今日阅读',
      '普通资料在浏览器读取；扫描资料在线识别后只保存文字。'
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
