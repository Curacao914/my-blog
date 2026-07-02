const fs = require('fs')
const path = require('path')

const root = process.cwd()
const output = path.join(root, 'docs', 'PRODUCT-COPY-INVENTORY.json')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

function sourceFiles() {
  return [
    ...walk(path.join(root, 'components')),
    ...walk(path.join(root, 'pages', 'desk')),
    ...walk(path.join(root, 'pages', 'content')),
    ...walk(path.join(root, 'pages', 'tools')),
    ...walk(path.join(root, 'pages', 'search')),
    ...walk(path.join(root, 'pages', 'about')),
    path.join(root, 'pages', 'index.js')
  ].filter(file => /\.(js|jsx|tsx)$/.test(file) && fs.existsSync(file))
}

function normalize(value = '') {
  return String(value)
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function chineseCount(value = '') {
  return (String(value).match(/[\u3400-\u9fff]/g) || []).length
}

function collectProductCopy() {
  const rows = []
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '')

    const candidates = []
    for (const match of source.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
      candidates.push(match[2])
    }
    for (const match of source.matchAll(/>([^<>{}]*[\u3400-\u9fff][^<>{}]*)</g)) {
      candidates.push(match[1])
    }

    for (const candidate of candidates) {
      const text = normalize(candidate)
      if (chineseCount(text) < 8) continue
      rows.push({
        file: path.relative(root, file).replace(/\\/g, '/'),
        text
      })
    }
  }

  return [...new Map(
    rows
      .sort((a, b) => `${a.file}:${a.text}`.localeCompare(`${b.file}:${b.text}`, 'zh-CN'))
      .map(row => [`${row.file}\n${row.text}`, row])
  ).values()]
}

if (require.main === module) {
  if (!process.argv.includes('--write')) {
    process.stdout.write(JSON.stringify(collectProductCopy(), null, 2) + '\n')
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, JSON.stringify(collectProductCopy(), null, 2) + '\n')
    process.stdout.write(`${path.relative(root, output)}\n`)
  }
}

module.exports = { collectProductCopy, sourceFiles }
