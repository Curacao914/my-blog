const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('homepage and writing studio polish', () => {
  const home = read('pages/index.js')
  const header = read('components/law-tech/PublicHeader.js')
  const signal = read('components/law-tech/PublicHeaderSignal.js')
  const homeData = read('lib/domain/publicHome.js')
  const writing = read('components/WritingDesk.js')
  const publishing = read('components/WritingPublishDialog.js')
  const tools = read('pages/tools/index.js')
  const publicationApi = read('pages/api/writing/publication.js')
  const summaryApi = read('pages/api/content/summary.js')

  it('uses content, topics and covered cards rather than personal advertising', () => {
    expect(home).toContain('FeaturedContent')
    expect(home).toContain('home-topic-strip')
    expect(home).toContain('home-content-thumb')
    expect(home).toContain('publicHomeQuickLinks')
    expect(home).not.toContain('郭鑫 / Curacao')
    expect(home).not.toContain('北京大学法学院')
    expect(home).not.toContain('意义有什么意义')
  })

  it('uses the left header area for local time and an editable line corpus', () => {
    expect(header).toContain('PublicHeaderSignal')
    expect(signal).toContain('publicHomeDailyLines')
    expect(signal).toContain('window.setInterval')
    expect(signal).toContain("href='/'")
    expect(homeData).toContain('法学之外还有风')
    expect(header).not.toContain("className='brand-mark'")
  })

  it('keeps search compact and lets the tool dock grow horizontally', () => {
    expect(home).toContain("placeholder='搜索内容'")
    expect(home).toContain('home-command-links')
    expect(home).toContain('overflow-x:auto')
    expect(home).toContain('全部工具')
  })

  it('always sends public tools to the production domain from Preview', () => {
    expect(homeData).toContain('https://law-tech.dev/ocr/')
    expect(homeData).toContain('https://law-tech.dev/citation/')
    expect(tools).toContain('https://law-tech.dev/ocr/')
    expect(tools).toContain('https://law-tech.dev/citation/')
  })

  it('keeps save status transient and opens publication settings in place', () => {
    expect(writing).toContain('WritingPublishDialog')
    expect(writing).toContain('openPublishSettings')
    expect(writing).toContain("saveState === 'saving' ? '保存中' : '保存'")
    expect(writing).toContain("current === '已保存' ? '' : current")
    expect(writing).not.toContain("<Link href='/desk/publish'>发布设置</Link>")
  })

  it('publishes writing drafts with metadata and offers AI summaries', () => {
    expect(publishing).toContain('封面图片 URL')
    expect(publishing).toContain('AI 生成')
    expect(publishing).toContain('/api/writing/publication')
    expect(publicationApi).toContain("source: 'manual'")
    expect(publicationApi).toContain("permission: 'writing'")
    expect(summaryApi).toContain('resolveUserAiConfig')
    expect(summaryApi).toContain('70—130 字')
  })
})
