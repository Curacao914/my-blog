import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function findRelay(node) {
  if (Array.isArray(node)) {
    for (const value of node) {
      const found = findRelay(value)
      if (found) return found
    }
    return null
  }
  if (!node || typeof node !== 'object') return null
  if (node['law-tech-wechat-relay'] && typeof node['law-tech-wechat-relay'] === 'object') {
    return node['law-tech-wechat-relay']
  }
  for (const value of Object.values(node)) {
    const found = findRelay(value)
    if (found) return found
  }
  return null
}

function inspectRelay(node, result = {}) {
  if (Array.isArray(node)) {
    node.forEach(value => inspectRelay(value, result))
    return result
  }
  if (!node || typeof node !== 'object') return result
  for (const [key, value] of Object.entries(node)) {
    if (key.toLowerCase() === 'captureurl' && typeof value === 'string') result.captureUrl = value
    if (key.toLowerCase() === 'token' && typeof value === 'string') result.token = value
    inspectRelay(value, result)
  }
  return result
}

function latestTarget(openclawDir) {
  const root = path.join(openclawDir, 'openclaw-weixin', 'accounts')
  if (!fs.existsSync(root)) return ''
  const files = fs.readdirSync(root)
    .filter(name => name.endsWith('context-tokens.json'))
    .map(name => path.join(root, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      const target = Object.keys(data || {})[0]
      if (target) return target
    } catch {}
  }
  return ''
}

const openclawDir = process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw')
const config = JSON.parse(
  fs.readFileSync(path.join(openclawDir, 'openclaw.json'), 'utf8')
)
const relay = inspectRelay(findRelay(config) || config)
const captureUrl = String(relay.captureUrl || '').trim()
const baseUrl = captureUrl
  .replace(/\/api\/schedule\/capture\/?$/, '')
  .replace(/\/$/, '')

process.env.WECHAT_CAPTURE_TOKEN ||= relay.token || ''
process.env.LAW_TECH_BASE_URL ||= baseUrl || 'https://preview.law-tech.dev'
process.env.LAW_TECH_WECHAT_TARGET ||= latestTarget(openclawDir)

if (process.argv.includes('--runtime-only')) {
  process.stdout.write(JSON.stringify({
    baseUrl: process.env.LAW_TECH_BASE_URL,
    targetConfigured: Boolean(process.env.LAW_TECH_WECHAT_TARGET),
    tokenConfigured: Boolean(process.env.WECHAT_CAPTURE_TOKEN)
  }))
} else {
  await import('./outbound-poller.js')
}
