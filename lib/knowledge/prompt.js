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
  seedText,
  domain = '',
  context = ''
} = {}) {
  const seed = requiredSeed(seedText)
  const cleanDomain = cleanText(domain)
  const cleanContext = cleanText(context)
  const details = [
    `待探索的问题或种子：${seed}`,
    ...(cleanDomain ? [`相关领域：${cleanDomain}`] : []),
    ...(cleanContext ? [`已有上下文：${cleanContext}`] : [])
  ]

  return [
    '请围绕下面的种子进行可靠、可继续探索的中文研究，并直接输出可编辑的 Markdown。',
    '',
    ...details,
    '',
    '请根据问题本身自行选择最合适的结构、层级与篇幅，不要套用预设章节或固定回答模板。',
    '写作时请遵守这些必要要求：',
    '- 清楚区分可确认的事实、基于事实的推论与仍存在的不确定性。',
    '- 对关键事实提供可核查的来源和访问日期；无法核实时直说，不要虚构来源、引文或链接。',
    '- 保留矛盾、证据缺口和之后值得追问的问题，不要为了显得完整而过度下结论。',
    '- 如果图片确有助于理解，为每张图片写明准确的 alt、出处和相对路径；可以交付“一份主 Markdown + 图片”的文件包。',
    '- Markdown 应便于人继续修改，链接与图片引用应保持可移植。'
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
