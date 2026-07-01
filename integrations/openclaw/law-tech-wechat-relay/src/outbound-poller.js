import { spawn } from 'node:child_process'
import process from 'node:process'

const args = new Set(process.argv.slice(2))
const once = args.has('--once')
const probe = args.has('--probe')
const baseUrl = String(
  process.env.LAW_TECH_BASE_URL ||
  process.env.LAW_TECH_CAPTURE_URL ||
  'https://preview.law-tech.dev'
).replace(/\/api\/schedule\/capture\/?$/, '').replace(/\/$/, '')
const token = String(process.env.WECHAT_CAPTURE_TOKEN || '').trim()
const target = String(
  process.env.LAW_TECH_WECHAT_TARGET ||
  process.env.WECHAT_OWNER ||
  ''
).trim()
const workerId = String(
  process.env.LAW_TECH_WECHAT_WORKER_ID ||
  `wechat-relay-${process.pid}`
)
const intervalMs = Math.max(
  10_000,
  Number(process.env.LAW_TECH_WECHAT_POLL_MS || 30_000)
)
const modelSyncMs = Math.max(
  60_000,
  Number(process.env.OPENCLAW_MODEL_SYNC_MS || 300_000)
)
let lastModelSyncAt = 0

function headers() {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json'
  }
}

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `${pathname} failed: ${response.status}`)
  }
  return payload
}

function runCommand(commandArgs, { dryRun = false } = {}) {
  return new Promise((resolve, reject) => {
    const command = process.env.OPENCLAW_BIN || 'openclaw'
    const finalArgs = [...commandArgs]
    if (dryRun) finalArgs.push('--dry-run')
    const child = spawn(command, finalArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${command} exited with ${code}`))
        return
      }
      let parsed = null
      try { parsed = JSON.parse(stdout) } catch {}
      resolve({ stdout: stdout.trim(), parsed })
    })
  })
}

function runOpenClawMessage(message, dryRun = false) {
  return runCommand([
    'message',
    'send',
    '--channel',
    'openclaw-weixin',
    '--target',
    target,
    '--message',
    message,
    '--json'
  ], { dryRun })
}

async function currentOpenClawModel() {
  const result = await runCommand([
    'config',
    'get',
    'agents.defaults.model.primary',
    '--json'
  ])
  if (typeof result.parsed === 'string') return result.parsed
  return String(result.parsed || result.stdout || '')
    .replace(/^"|"$/g, '')
    .trim()
}

async function heartbeat(currentModel) {
  return jsonRequest('/api/integrations/openclaw/heartbeat', {
    method: 'POST',
    body: JSON.stringify({
      currentModel,
      workerId,
      version: 'law-tech-relay-v2'
    })
  })
}

async function syncRuntime({ force = false } = {}) {
  const now = Date.now()
  if (!force && now - lastModelSyncAt < modelSyncMs) return null
  lastModelSyncAt = now
  const runtime = await jsonRequest('/api/integrations/openclaw/runtime-config')
  let currentModel = await currentOpenClawModel().catch(() => '')
  if (
    runtime.enabled !== false &&
    runtime.model &&
    runtime.model !== currentModel
  ) {
    await runCommand(['models', 'set', runtime.model])
    currentModel = runtime.model
    console.log(`✓ OpenClaw 模型已同步：${runtime.model}`)
  }
  await heartbeat(currentModel)
  return { runtime, currentModel }
}

async function prepare() {
  return jsonRequest('/api/messages/outbound/prepare', {
    method: 'POST',
    body: JSON.stringify({ workerId })
  })
}

async function claim() {
  const payload = await jsonRequest('/api/messages/outbound/claim', {
    method: 'POST',
    body: JSON.stringify({ workerId })
  })
  return payload.delivery || null
}

async function acknowledge(delivery, result, error = null) {
  const retryable = Number(delivery.attempts || 0) < 3
  return jsonRequest(`/api/messages/outbound/${delivery.id}/ack`, {
    method: 'POST',
    body: JSON.stringify(error ? {
      status: 'failed',
      retryable,
      error: error instanceof Error ? error.message : String(error),
      metadata: { workerId }
    } : {
      status: 'sent',
      externalId:
        result?.parsed?.messageId ||
        result?.parsed?.id ||
        '',
      metadata: {
        workerId,
        channel: 'openclaw-weixin'
      }
    })
  })
}

async function cycle() {
  try {
    await syncRuntime()
  } catch (error) {
    console.error(`[openclaw-runtime] ${error.message}`)
  }
  await prepare()
  let sent = 0
  while (true) {
    const delivery = await claim()
    if (!delivery) break
    const message = [
      delivery.body_text,
      delivery.object_url
        ? `\n${String(delivery.object_url).startsWith('http')
            ? delivery.object_url
            : `${baseUrl}${delivery.object_url}`}`
        : ''
    ].filter(Boolean).join('\n')
    try {
      const result = await runOpenClawMessage(message)
      await acknowledge(delivery, result)
      sent += 1
      console.log(`✓ 微信已发送：${delivery.purpose} ${delivery.id}`)
    } catch (error) {
      await acknowledge(delivery, null, error)
      console.error(`✗ 微信发送失败：${delivery.id} ${error.message}`)
    }
  }
  return sent
}

async function main() {
  if (!token) throw new Error('WECHAT_CAPTURE_TOKEN is required')
  if (!target) throw new Error('LAW_TECH_WECHAT_TARGET or WECHAT_OWNER is required')

  if (probe) {
    await syncRuntime({ force: true })
    await runOpenClawMessage('law-tech.dev 微信发送通道探测（dry-run）', true)
    console.log('✓ OpenClaw 模型同步与 openclaw-weixin dry-run 探测通过')
    return
  }

  do {
    try {
      await cycle()
    } catch (error) {
      console.error(`[wechat-outbound] ${error.message}`)
    }
    if (once) break
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  } while (true)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
