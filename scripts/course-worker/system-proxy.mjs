import process from 'node:process'

function integer(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : 0
}

export function parseScutilProxy(raw = '') {
  const values = {}
  for (const sourceLine of String(raw).split(/\r?\n/)) {
    const line = sourceLine.trim()
    const index = line.indexOf(' : ')
    if (index <= 0) continue
    values[line.slice(0, index).trim()] =
      line.slice(index + 3).trim()
  }

  const selected = [
    {
      enabled: values.HTTPSEnable === '1',
      host: values.HTTPSProxy,
      port: integer(values.HTTPSPort),
      source: 'macOS HTTPS'
    },
    {
      enabled: values.HTTPEnable === '1',
      host: values.HTTPProxy,
      port: integer(values.HTTPPort),
      source: 'macOS HTTP'
    }
  ].find(item => item.enabled && item.host && item.port)

  if (!selected) {
    return {
      detected: false,
      source: '',
      host: '',
      port: 0,
      url: ''
    }
  }

  return {
    detected: true,
    source: selected.source,
    host: selected.host,
    port: selected.port,
    url: `http://${selected.host}:${selected.port}`
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

export function shellExports(proxy) {
  if (!proxy?.detected) return ''
  const quoted = shellQuote(proxy.url)
  return [
    `export HTTP_PROXY=${quoted}`,
    `export HTTPS_PROXY=${quoted}`,
    `export http_proxy=${quoted}`,
    `export https_proxy=${quoted}`,
    'export NODE_USE_ENV_PROXY=1'
  ].join('\n')
}

function main() {
  const chunks = []
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => chunks.push(chunk))
  process.stdin.on('end', () => {
    const proxy = parseScutilProxy(chunks.join(''))
    if (process.argv.includes('--shell')) {
      process.stdout.write(shellExports(proxy))
      return
    }
    process.stdout.write(JSON.stringify(proxy, null, 2) + '\n')
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
