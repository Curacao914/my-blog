'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'

import { MarkdownDocument } from '@/components/content/MarkdownDocument'
import {
  KNOWLEDGE_KIND_LABELS,
  KNOWLEDGE_KINDS,
  KNOWLEDGE_STATE_LABELS
} from '@/lib/knowledge/model'
import {
  parseKnowledgeFile,
  rewriteKnowledgeAssetReferences
} from '@/lib/knowledge/import'
import { buildKnowledgePrompt } from '@/lib/knowledge/prompt'
import { compressKnowledgeImage } from '@/lib/knowledge/imageCompression'

function splitTags(value = '') {
  return [...new Set(
    String(value)
      .split(/[,，、\n]/)
      .map(item => item.trim())
      .filter(Boolean)
  )].slice(0, 8)
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function initialDraft(query = {}) {
  const sourceType = typeof query.sourceType === 'string' ? query.sourceType : ''
  const sourceId = typeof query.sourceId === 'string' ? query.sourceId : ''
  const sourceTitle = typeof query.sourceTitle === 'string' ? query.sourceTitle : ''
  const seed = typeof query.seed === 'string' ? query.seed : sourceTitle
  return {
    seedText: seed || '',
    title: sourceTitle || '',
    summary: '',
    bodyMarkdown: '',
    kind: 'question',
    state: 'exploring',
    domain: '',
    topic: '',
    tagsText: '',
    reviewStatus: 'needs_review',
    showOnHome: false,
    provenance: sourceType && sourceId
      ? [{ type: sourceType, id: sourceId, title: sourceTitle }]
      : []
  }
}

function EmptyList({ filtered }) {
  return (
    <div className='knowledge-empty'>
      <span aria-hidden='true'>⌁</span>
      <strong>{filtered ? '没有符合条件的内容' : '暂无内容'}</strong>
    </div>
  )
}

function KnowledgeList({ entries, loading, filtered }) {
  if (loading) return <p className='knowledge-loading'>正在读取…</p>
  if (!entries.length) return <EmptyList filtered={filtered} />
  return (
    <div className='knowledge-list'>
      {entries.map(entry => (
        <Link href={`/desk/knowledge/${entry.id}`} key={entry.id}>
          <span className={`knowledge-kind tone-${entry.kind}`}>{KNOWLEDGE_KIND_LABELS[entry.kind] || '想法'}</span>
          <div>
            <strong>{entry.title}</strong>
            <p>{entry.summary || entry.seedText || entry.bodyMarkdown.slice(0, 100)}</p>
            <small>
              {[entry.domain, KNOWLEDGE_STATE_LABELS[entry.state], formatTime(entry.updatedAt)]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </div>
          <i aria-hidden='true'>↗</i>
        </Link>
      ))}
    </div>
  )
}

export function KnowledgeDesk() {
  const router = useRouter()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [state, setState] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState(() => initialDraft())
  const [prompt, setPrompt] = useState('')
  const [assets, setAssets] = useState([])
  const [warning, setWarning] = useState('')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)

  const filtered = Boolean(query || kind || state)
  const requestUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (kind) params.set('kind', kind)
    if (state) params.set('state', state)
    const suffix = params.toString()
    return `/api/knowledge${suffix ? `?${suffix}` : ''}`
  }, [kind, query, state])

  useEffect(() => {
    if (!router.isReady) return
    const next = initialDraft(router.query)
    setDraft(next)
    if (router.query.new === '1' || next.provenance.length) setComposerOpen(true)
  }, [router.isReady, router.query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(requestUrl, { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '读取失败')
        if (!cancelled) setEntries(data.entries || [])
      })
      .catch(error => {
        if (!cancelled) setStatus(error.message || '读取失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [requestUrl])

  function updateDraft(key, value) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  async function preparePrompt() {
    if (!draft.seedText.trim()) return setStatus('请输入知识需求')
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/knowledge/prompt', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request: draft.seedText })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '生成失败')
      setPrompt(data.prompt)
    } catch (error) {
      setPrompt(buildKnowledgePrompt({ seedText: draft.seedText }))
      setStatus(error.message || '生成失败')
    } finally {
      setBusy(false)
    }
  }

  async function copyPrompt() {
    const value = prompt || buildKnowledgePrompt({ seedText: draft.seedText })
    await navigator.clipboard.writeText(value)
    setPrompt(value)
    setStatus('提示词已复制')
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    setStatus('')
    try {
      const result = await parseKnowledgeFile(file)
      setDraft(current => ({
        ...current,
        title: current.title || result.title,
        bodyMarkdown: result.markdown
      }))
      setAssets(await Promise.all(
        (result.assets || []).map(compressKnowledgeImage)
      ))
      setWarning(result.warning || '')
      setPreview(true)
    } catch (error) {
      setStatus(error.message || '导入失败')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  async function save() {
    if (!draft.title.trim() || !draft.bodyMarkdown.trim()) {
      setStatus('标题和导入结果不能为空')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const createResponse = await fetch('/api/knowledge', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          tags: splitTags(draft.tagsText)
        })
      })
      const created = await createResponse.json()
      if (!createResponse.ok) throw new Error(created.error || '保存失败')
      let saved = created.entry

      if (assets.length) {
        const uploads = []
        for (const asset of assets) {
          const response = await fetch('/api/knowledge/assets', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              itemId: saved.id,
              name: asset.name,
              relativePath: asset.path,
              altText: asset.altText,
              dataUrl: asset.dataUrl
            })
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || `图片 ${asset.name} 上传失败`)
          uploads.push({ ...data.asset, relativePath: asset.path })
        }
        const rewritten = rewriteKnowledgeAssetReferences(draft.bodyMarkdown, uploads)
        const patchResponse = await fetch(`/api/knowledge/${saved.id}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ bodyMarkdown: rewritten })
        })
        const patched = await patchResponse.json()
        if (!patchResponse.ok) throw new Error(patched.error || '图片引用保存失败')
        saved = patched.entry
      }
      await router.push(`/desk/knowledge/${saved.id}`)
    } catch (error) {
      setStatus(error.message || '保存失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='knowledge-workspace'>
      <aside className='knowledge-index'>
        <header>
          <div><span className='eyebrow'>Light knowledge</span><h2>轻知识</h2></div>
          <button type='button' onClick={() => setComposerOpen(value => !value)}>
            {composerOpen ? '收起' : '记录'}
          </button>
        </header>
        <div className='knowledge-filters'>
          <label>
            <span className='sr-only'>搜索轻知识</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder='搜索标题、正文、标签…' />
          </label>
          <select aria-label='按类型筛选' value={kind} onChange={event => setKind(event.target.value)}>
            <option value=''>全部类型</option>
            {KNOWLEDGE_KINDS.map(value => <option value={value} key={value}>{KNOWLEDGE_KIND_LABELS[value]}</option>)}
          </select>
          <select aria-label='按状态筛选' value={state} onChange={event => setState(event.target.value)}>
            <option value=''>未归档</option>
            <option value='exploring'>探索中</option>
            <option value='active'>活跃</option>
            <option value='archived'>已归档</option>
          </select>
        </div>
        <KnowledgeList entries={entries} loading={loading} filtered={filtered} />
      </aside>

      <section className={`knowledge-composer ${composerOpen ? 'is-open' : ''}`}>
        {composerOpen ? (
          <>
            <header>
              <div><span className='eyebrow'>Knowledge</span><h2>新建轻知识</h2></div>
            </header>

            <div className='knowledge-seed-row'>
              <label>
                <span>知识需求</span>
                <textarea value={draft.seedText} onChange={event => updateDraft('seedText', event.target.value)} />
              </label>
            </div>

            <div className='knowledge-prompt-actions'>
              <button type='button' onClick={() => void preparePrompt()} disabled={busy}>生成提示词</button>
              <button type='button' onClick={() => void copyPrompt()} disabled={!draft.seedText.trim()}>复制提示词</button>
            </div>
            {prompt ? <textarea className='knowledge-prompt-output' value={prompt} onChange={event => setPrompt(event.target.value)} aria-label='外部模型提示词' /> : null}

            <div className='knowledge-import-bar'>
              <label>
                <input type='file' accept='.md,.markdown,.txt,.zip' onChange={event => void importFile(event)} disabled={busy} />
                <span>{busy ? '处理中…' : '导入 Markdown / TXT / ZIP'}</span>
              </label>
              <button type='button' onClick={() => setPreview(value => !value)} disabled={!draft.bodyMarkdown.trim()}>
                {preview ? '继续编辑' : '预览'}
              </button>
            </div>
            {warning ? <p className='knowledge-warning'>{warning}</p> : null}

            <div className='knowledge-editor-grid'>
              <div className='knowledge-fields'>
                <label><span>标题</span><input value={draft.title} onChange={event => updateDraft('title', event.target.value)} /></label>
                <label><span>一句话判断</span><input value={draft.summary} onChange={event => updateDraft('summary', event.target.value)} /></label>
                <div className='knowledge-field-pair'>
                  <label><span>类型</span><select value={draft.kind} onChange={event => updateDraft('kind', event.target.value)}>{KNOWLEDGE_KINDS.map(value => <option value={value} key={value}>{KNOWLEDGE_KIND_LABELS[value]}</option>)}</select></label>
                  <label><span>标签</span><input value={draft.tagsText} onChange={event => updateDraft('tagsText', event.target.value)} placeholder='逗号分隔' /></label>
                </div>
                <label className='knowledge-home-toggle'><input type='checkbox' checked={draft.showOnHome} onChange={event => updateDraft('showOnHome', event.target.checked)} /><span>在首页“正在探索”中显示</span></label>
              </div>
              <div className='knowledge-document-input'>
                <span>导入结果</span>
                {preview ? (
                  <MarkdownDocument markdown={draft.bodyMarkdown} title={draft.title} emptyText='导入内容后在这里预览。' />
                ) : (
                  <textarea value={draft.bodyMarkdown} onChange={event => updateDraft('bodyMarkdown', event.target.value)} />
                )}
              </div>
            </div>
            <footer>
              <span>{assets.length ? `${assets.length} 张图片` : status}</span>
              <button type='button' className='is-primary' onClick={() => void save()} disabled={busy}>{busy ? '保存中…' : '审阅并保存'}</button>
            </footer>
          </>
        ) : (
          <div className='knowledge-rest-state'>
            <span aria-hidden='true'>∴</span>
            <button type='button' onClick={() => setComposerOpen(true)}>新建轻知识</button>
          </div>
        )}
      </section>
      {status && composerOpen ? <p className='knowledge-toast' role='status'>{status}</p> : null}
    </div>
  )
}
