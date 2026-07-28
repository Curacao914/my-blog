function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function requiredSeed(seedText) {
  const seed = cleanText(seedText)
  if (!seed) {
    const error = new TypeError('Knowledge seed is required')
    error.status = 400
    error.code = 'knowledge_seed_required'
    throw error
  }
  return seed
}

export function buildKnowledgePrompt({
  seedText
} = {}) {
  const seed = requiredSeed(seedText)

  return [
    '请严格按照用户需求完成内容，不得新增研究问题、分论点或内容范围。用户需求是内容范围的唯一依据。',
    '',
    '<用户需求>',
    seed,
    '</用户需求>',
    '',
    '请按以下交付规范组织结果：',
    '- 主文件命名为 index.md，使用清晰的 Markdown 标题层级；标题层级服务于阅读，不得借此扩写用户未提出的内容。',
    '- 开头使用一个一级标题，随后用一小段摘要概括实际完成的内容。',
    '- 对关键事实提供可核查的来源和访问日期；无法核实时直说，不要虚构来源、引文或链接。',
    '- 在正文末尾设置“参考来源”，列出实际使用的来源及链接。',
    '- 如果图片有助于理解，将图片放入 images/ 目录；Markdown 使用相对路径 images/文件名，并为每张图片写明准确的 alt 和出处。',
    '- 最终交付一个 ZIP，根目录包含 index.md，图片统一放在 images/；若没有图片，可只交付 index.md。',
    '- 不输出额外说明、生成过程、聊天前言或后续操作建议。'
  ].join('\n')
}

export function promptDownloadName(seedText) {
  const safe = requiredSeed(seedText)
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '')

  return `${safe || 'knowledge-prompt'}.md`
}
