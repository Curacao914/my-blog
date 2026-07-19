const fs = require('fs')
const path = require('path')
const {
  collectProductCopy,
  sourceFiles
} = require('../../scripts/productCopyInventory')

describe('user-facing product copy', () => {
  it('does not expose implementation notes or explanatory filler', () => {
    const rawForbiddenText = [
      'TextPack v1',
      'MVP',
      'TODO',
      '占位',
      '等待后续实现',
      '后续接入',
      '生成预览后，这里会显示',
      'worker-step',
      'provider adapter',
      'workflow JSON',
      '本地处理服务'
    ]

    const uiForbiddenText = [
      '到点后由 OpenClaw Relay 拉取并发送，不经过大模型。',
      '站内消息队列 → OpenClaw Relay → openclaw-weixin → 微信私聊。',
      '通知文本由站内确定，Agent 不参与改写。',
      '先进入文件夹，再打开文章；资料的位置和阅读状态彼此独立。',
      '只在日程中创建关联任务，原文仍留在资料库。',
      '需要真实来源',
      '候选文章只在时间到期时换一部分',
      '继续使用本地缓存与定时更新',
      '保留人工查看入口，但不让普通课程卡在确认门口',
      '缓存尚未自动更新时'
    ]

    const implementationPatterns = [
      /(?:消息队列|Relay|Agent).{0,30}(?:拉取|发送|改写|参与)/,
      /(?:不经过|不使用|不参与).{0,16}(?:模型|Agent|中间方案)/,
      /(?:只负责|彼此独立|真实来源)/,
      /(?:source of truth|fallback|adapter|schemaVersion)/i
    ]

    const offenders = []

    for (const file of sourceFiles()) {
      const source = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '')
      for (const phrase of rawForbiddenText) {
        if (source.includes(phrase)) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${phrase}`)
        }
      }
    }

    for (const row of collectProductCopy()) {
      for (const phrase of uiForbiddenText) {
        if (row.text.includes(phrase)) offenders.push(`${row.file}: ${phrase}`)
      }
      for (const pattern of implementationPatterns) {
        if (pattern.test(row.text)) offenders.push(`${row.file}: ${pattern}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('keeps an explicitly reviewed inventory of longer interface copy', () => {
    const inventoryPath = path.join(
      process.cwd(),
      'docs',
      'PRODUCT-COPY-INVENTORY.json'
    )
    const expected = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'))
    expect(collectProductCopy()).toEqual(expected)
  })
})
