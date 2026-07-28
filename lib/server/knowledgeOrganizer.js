import {
  getKnowledgeEntry,
  listKnowledgeEntries,
  updateKnowledgeEntry
} from '@/lib/server/knowledgeRepository'
import { supabaseRest } from '@/lib/server/supabase'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

const KINDS = new Set([
  'question', 'concept', 'idea', 'fact', 'observation', 'quote', 'connection'
])
const RELATIONS = new Set([
  'related', 'derived_from', 'supports', 'challenges'
])

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function clean(value, max = 160) {
  return String(value || '').trim().slice(0, max)
}

function tags(value) {
  return [...new Set(
    (Array.isArray(value) ? value : [])
      .map(item => clean(item, 40))
      .filter(Boolean)
  )].slice(0, 8)
}

function modelContent(data) {
  return String(data?.choices?.[0]?.message?.content || '').trim()
}

function parseModelJson(value) {
  const text = String(value || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  return JSON.parse(text)
}

function catalogPayload(entries, focusItemId) {
  return entries.map(entry => ({
    id: entry.id,
    current: {
      title: entry.title,
      summary: entry.summary,
      domain: entry.domain,
      topic: entry.topic,
      tags: entry.tags
    },
    content: entry.bodyMarkdown.slice(
      0,
      entry.id === focusItemId ? 16000 : 1800
    )
  }))
}

const ORGANIZER_SYSTEM = `你负责维护一个私人轻知识库的整体结构。输入包含当前全部条目。
请基于条目的实际成品内容，而不是用户最初提问的表面词语，为每条内容生成简洁标题、准确摘要、类型、标签及层级位置。
domain 是最宽的稳定上位领域，topic 是其下更具体的学科或主题，条目标题是叶节点。例如不同数学主题可共享上位领域与学科，但这只是示意，必须根据真实内容自行判断。
每次都重新审视整个目录；若新增内容表明旧分类不再合适，可以调整旧条目。不要为了整齐虚构不存在的分类，也不要创建只有一个晦涩条目才使用的冗余层级。
relations 只保留内容上确有帮助的条目间联系，避免仅因同属一个领域就全部互连。
只返回 JSON：
{"entries":[{"id":"原id","title":"标题","summary":"一句准确摘要","kind":"question|concept|idea|fact|observation|quote|connection","domain":"上位领域","topic":"下位学科或主题","tags":["标签"]}],"relations":[{"sourceId":"原id","targetId":"原id","type":"related|derived_from|supports|challenges","reason":"简短理由"}]}`

export async function organizeKnowledgeLibrary(profile, focusItemId) {
  const entries = await listKnowledgeEntries(profile.id, { limit: 100 })
  const ids = new Set(entries.map(entry => entry.id))
  if (!ids.has(focusItemId)) await getKnowledgeEntry(profile.id, focusItemId)

  const config = await resolveUserAiConfig(profile)
  const model = config.models?.writer || config.models?.default
  if (!config.apiKey || !config.baseUrl || !model) {
    return {
      entry: await getKnowledgeEntry(profile.id, focusItemId),
      updated: 0,
      organized: false
    }
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ORGANIZER_SYSTEM },
        {
          role: 'user',
          content: JSON.stringify({
            focusItemId,
            entries: catalogPayload(entries, focusItemId)
          })
        }
      ]
    })
  })
  const raw = await response.text()
  if (!response.ok) throw new Error(`知识编排模型调用失败：${response.status}`)
  const data = raw ? JSON.parse(raw) : {}
  const result = parseModelJson(modelContent(data))
  const organizedEntries = Array.isArray(result.entries) ? result.entries : []
  const returnedIds = new Set(
    organizedEntries.map(item => item?.id).filter(id => ids.has(id))
  )
  if (returnedIds.size !== ids.size) {
    throw new Error('知识编排结果不完整')
  }

  let updated = 0
  for (const item of organizedEntries) {
    if (!ids.has(item?.id)) continue
    await updateKnowledgeEntry(profile.id, item.id, {
      title: clean(item.title) || '未命名知识',
      summary: clean(item.summary, 500),
      kind: KINDS.has(item.kind) ? item.kind : 'concept',
      domain: clean(item.domain, 80),
      topic: clean(item.topic, 80),
      tags: tags(item.tags)
    })
    updated += 1
  }

  await supabaseRest(
    `/knowledge_links?owner_id=${eq(profile.id)}&origin=eq.import`,
    { method: 'DELETE' }
  )
  const relations = (Array.isArray(result.relations) ? result.relations : [])
    .filter(item =>
      ids.has(item?.sourceId) &&
      ids.has(item?.targetId) &&
      item.sourceId !== item.targetId &&
      RELATIONS.has(item.type)
    )
    .slice(0, 200)
    .map(item => ({
      owner_id: profile.id,
      source_item_id: item.sourceId,
      target_type: 'knowledge',
      target_id: item.targetId,
      relation_type: item.type,
      origin: 'import',
      status: 'confirmed',
      score: 1,
      note: clean(item.reason, 300) || null,
      metadata: { organizedBy: 'ai' }
    }))
  if (relations.length) {
    await supabaseRest('/knowledge_links', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(relations)
    })
  }

  return {
    entry: await getKnowledgeEntry(profile.id, focusItemId),
    updated,
    relations: relations.length,
    organized: true
  }
}
