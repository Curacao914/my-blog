const LOCAL_QUOTES = [
  { text: '系统负责记住，你负责改变主意。', from: 'law-tech.dev' },
  { text: '把问题留住，答案可以晚一点来。', from: 'law-tech.dev' },
  { text: '有些绕路后来会变成地图。', from: 'law-tech.dev' },
  { text: '先找到真正的问题，再考虑写得漂亮。', from: 'law-tech.dev' },
  { text: '法学之外还有风，记得开窗。', from: 'law-tech.dev' },
  { text: '答案会过期，值得追的问题通常不会。', from: 'law-tech.dev' }
]

const CACHE_MS = 15 * 60 * 1000
let cached = null
let cachedAt = 0

function localQuote() {
  const bucket = Math.floor(Date.now() / CACHE_MS)
  return LOCAL_QUOTES[Math.abs(bucket) % LOCAL_QUOTES.length]
}

async function remoteQuote() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1800)
  try {
    const response = await fetch('https://v1.hitokoto.cn/?c=d&c=e&c=i&c=k&encode=json&max_length=38', {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    })
    if (!response.ok) throw new Error(`Hitokoto ${response.status}`)
    const data = await response.json()
    const text = String(data?.hitokoto || '').trim()
    if (!text || text.length > 48) throw new Error('Invalid quote')
    return {
      text,
      from: String(data?.from_who || data?.from || '一言').trim(),
      href: data?.uuid ? `https://hitokoto.cn?uuid=${encodeURIComponent(data.uuid)}` : 'https://hitokoto.cn'
    }
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  if (cached && Date.now() - cachedAt < CACHE_MS) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
    return res.status(200).json({ ok: true, ...cached })
  }

  try {
    cached = await remoteQuote()
  } catch {
    cached = localQuote()
  }
  cachedAt = Date.now()
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
  return res.status(200).json({ ok: true, ...cached })
}
