import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { extractCourseModelContent, parseJsonResponse } from '@/lib/course/aiAdapter'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

function cleanSummary(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 220)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireWorkspaceRequest(req, { permission: 'writing' })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  try {
    const markdown = String(req.body?.markdown || '').trim().slice(0, 40_000)
    const title = String(req.body?.title || '').trim().slice(0, 160)
    if (!markdown) return res.status(400).json({ ok: false, error: '正文为空，无法生成摘要' })

    const config = await resolveUserAiConfig(auth.profile)
    const model = config.models?.writer || config.models?.default
    if (!config.apiKey || !config.baseUrl || !model) return res.status(409).json({ ok: false, error: '请先在系统设置中配置 AI 模型' })

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你负责为中文文章或课程笔记撰写卡片摘要。摘要应为一段自然中文，通常 70—130 字，准确概括主题、核心问题与主要结论；不得使用“本文将”“作者认为”等模板开头，不得评价质量，不得补充正文不存在的信息。只返回 JSON：{"summary":"..."}。'
          },
          { role: 'user', content: `标题：${title || '未命名'}\n\n正文：\n${markdown}` }
        ]
      })
    })
    const raw = await response.text()
    if (!response.ok) throw new Error(`摘要模型调用失败：${response.status}`)
    const data = raw ? JSON.parse(raw) : {}
    const parsed = parseJsonResponse(extractCourseModelContent(data))
    const summary = cleanSummary(parsed.summary)
    if (!summary) throw new Error('模型没有返回可用摘要')
    return res.status(200).json({ ok: true, summary, model })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : '摘要生成失败' })
  }
}
