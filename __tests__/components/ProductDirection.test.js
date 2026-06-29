const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('product direction and course replay plan', () => {
  const direction = read('docs/PRODUCT_DIRECTION.md')
  const course = read('docs/COURSE_REPLAY_AUTOMATION.md')
  const agents = read('AGENTS.md')

  it('keeps the three product north stars explicit', () => {
    expect(direction).toContain('思考的痕迹')
    expect(direction).toContain('存在的证明')
    expect(direction).toContain('探索的可能')
  })

  it('defines complete course loops instead of an empty phased shell', () => {
    expect(course).toContain('闭环 A：授权人工导入')
    expect(course).toContain('闭环 B：自动发现新回放')
    expect(course).toContain('闭环 C：学期可靠运行与微信回复')
    expect(course).toContain('云端转写')
    expect(course).toContain('微信：最终首选渠道')
  })

  it('never stores a pasted JWT in project documentation', () => {
    expect(course).not.toContain('eyJhbGciOi')
    expect(direction).not.toContain('eyJhbGciOi')
    expect(agents).toContain('JWT')
  })
})
