export function commandTokens(command = '') {
  return command
    .replace(/https?:\/\/[^\s，。；、]+/g, '')
    .split(/[^\u4e00-\u9fa5a-zA-Z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

export function selectRelevantItems(command, items, limit = 20) {
  const tokens = commandTokens(command)
  const wantsReading = /这篇|这篇文章|刚刚那篇|上一个链接|这个链接|链接|推文|文章|阅读|微信|https?:\/\//.test(command)
  const active = items.filter((item) => item.status !== 'done' && item.status !== 'cancelled')
  const referencesLatest = /刚刚|上一个|上一条|这篇|这条|这个|刚发|刚才/.test(command) && !/https?:\/\//.test(command)
  const latestReadingOnly = referencesLatest && wantsReading
  if (latestReadingOnly) {
    const readingItems = active.filter((item) => item.section === '阅读' || item.date === 'reading' || item.links?.length)
    const latestReading = readingItems[readingItems.length - 1]
    return latestReading ? [latestReading] : []
  }
  if (referencesLatest) {
    const latestActive = active[active.length - 1]
    return latestActive ? [latestActive] : []
  }

  const scored = active.map((item) => {
    const haystack = [item.title, item.section, item.summary, item.note, item.time, item.place].join(' ')
    const score =
      tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 2 : 0), 0) +
      (wantsReading && (item.section === '阅读' || item.date === 'reading' || item.links?.length) ? 3 : 0)
    return { item, score }
  })

  const matched = scored.filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ item }) => item)
  const fallback = active.slice(0, 12)
  return (matched.length ? matched : fallback).slice(0, limit)
}
