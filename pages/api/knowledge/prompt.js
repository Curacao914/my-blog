import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { buildKnowledgePrompt } from '@/lib/knowledge/prompt'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

const SYSTEM_PROMPT = `你负责把用户自由表达的知识需求整理为可直接交给另一个模型的中文提示词。
必须完整保留用户明确表达的全部目标、背景、限制、偏好和疑问，不得把内容抽取成固定字段，不得假设用户会采用任何固定结构。
可以纠正明显表述问题、提示必要歧义，并依具体需求灵活补充权威来源、事实核查、可读性、Markdown 输出和图片交付要求，但不要替用户回答问题，也不要加入与需求无关的章节。
只输出整理后的提示词，不写解释、前言、标题或评价。`

function modelText(data) {
  return String(data?.choices?.[0]?.message?.content || '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error, code: auth.code })

  const request = String(req.body?.request || '').trim().slice(0, 12000)
  if (!request) return res.status(400).json({ error: '请输入知识需求' })

  try {
    const config = await resolveUserAiConfig(auth.profile)
    const model = config.models?.writer || config.models?.default
    if (!config.apiKey || !config.baseUrl || !model) {
      return res.status(200).json({ prompt: buildKnowledgePrompt({ seedText: request }), fallback: true })
    }
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: request }
        ]
      })
    })
    const raw = await response.text()
    const data = raw ? JSON.parse(raw) : {}
    const prompt = response.ok ? modelText(data) : ''
    if (!prompt) {
      return res.status(200).json({ prompt: buildKnowledgePrompt({ seedText: request }), fallback: true })
    }
    return res.status(200).json({ prompt, model })
  } catch {
    return res.status(200).json({ prompt: buildKnowledgePrompt({ seedText: request }), fallback: true })
  }
}
