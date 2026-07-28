'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'

import { MarkdownDocument } from '@/components/content/MarkdownDocument'
import {
  KNOWLEDGE_KIND_LABELS,
  KNOWLEDGE_KINDS,
  KNOWLEDGE_STATE_LABELS
} from '@/lib/knowledge/model'

function tagsText(tags = []) {
  return Array.isArray(tags) ? tags.join('，') : ''
}

function splitTags(value = '') {
  return [...new Set(String(value).split(/[,，、\n]/).map(item => item.trim()).filter(Boolean))].slice(0, 8)
}

export function KnowledgeDetail({ id }) {
  const router = useRouter()
  const [entry, setEntry] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [relations, setRelations] = useState([])

  const load = useCallback(async () => {
    setStatus('')
    try {
      const response = await fetch(`/api/knowledge/${id}`, { credentials: 'same-origin', cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '读取失败')
      setEntry(data.entry)
      setDraft({ ...data.entry, tagsText: tagsText(data.entry.tags) })
      const relationResponse = await fetch(
        `/api/knowledge/${id}/relations`,
        { credentials: 'same-origin', cache: 'no-store' }
      )
      if (relationResponse.ok) {
        const relationData = await relationResponse.json()
        setRelations(relationData.relations || [])
      }
    } catch (error) {
      setStatus(error.message || '读取失败')
    }
  }, [id])

  useEffect(() => {
    if (id) void load()
  }, [id, load])

  function update(key, value) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  async function save(patch = null) {
    if (!draft) return
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch || {
          title: draft.title,
          summary: draft.summary,
          bodyMarkdown: draft.bodyMarkdown,
          kind: draft.kind,
          state: draft.state,
          domain: draft.domain,
          topic: draft.topic,
          tags: splitTags(draft.tagsText),
          reviewStatus: draft.reviewStatus,
          showOnHome: draft.showOnHome
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '保存失败')
      let nextEntry = data.entry
      if (!patch || Object.keys(patch).some(key => key !== 'state')) {
        const organizeResponse = await fetch('/api/knowledge/organize', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ itemId: id })
        })
        if (organizeResponse.ok) {
          const organized = await organizeResponse.json()
          if (organized.entry) nextEntry = organized.entry
        }
      }
      setEntry(nextEntry)
      setDraft({ ...nextEntry, tagsText: tagsText(nextEntry.tags) })
      setEditing(false)
      setStatus(patch?.state === 'archived' ? '已归档' : '已保存')
    } catch (error) {
      setStatus(error.message || '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function developIntoWriting() {
    if (!entry) return
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/notes?scope=writing', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'writing',
          title: entry.title,
          bodyMarkdown: [
            `# ${entry.title}`,
            '',
            entry.summary ? `> ${entry.summary}` : '',
            '',
            entry.bodyMarkdown,
            '',
            '---',
            `来源：轻知识 / ${entry.id}`
          ].filter(Boolean).join('\n')
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '转入写作失败')
      await router.push(`/desk/writing?noteId=${encodeURIComponent(data.note.id)}`)
    } catch (error) {
      setStatus(error.message || '转入写作失败')
      setBusy(false)
    }
  }

  async function decideRelation(relationId, decision) {
    setBusy(true)
    try {
      const response = await fetch(`/api/knowledge/${id}/relations`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ relationId, status: decision })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '关联更新失败')
      setRelations(current => decision === 'dismissed'
        ? current.filter(item => item.id !== relationId)
        : current.map(item => item.id === relationId ? { ...item, ...data.relation } : item))
    } catch (error) {
      setStatus(error.message || '关联更新失败')
    } finally {
      setBusy(false)
    }
  }

  if (!entry || !draft) {
    return <div className='knowledge-detail-state'><p>{status || '正在读取…'}</p><Link href='/desk/knowledge'>返回轻知识</Link></div>
  }

  return (
    <article className='knowledge-detail'>
      <header className='knowledge-detail-head'>
        <div>
          <Link href='/desk/knowledge'>← 轻知识</Link>
          <div className='knowledge-detail-meta'>
            <span className={`knowledge-kind tone-${entry.kind}`}>{KNOWLEDGE_KIND_LABELS[entry.kind]}</span>
            <span>{KNOWLEDGE_STATE_LABELS[entry.state]}</span>
            {entry.domain ? <span>{entry.domain}</span> : null}
            <span>v{entry.version}</span>
          </div>
          {editing ? (
            <input className='knowledge-detail-title-input' value={draft.title} onChange={event => update('title', event.target.value)} />
          ) : <h1>{entry.title}</h1>}
          {editing ? (
            <input value={draft.summary} onChange={event => update('summary', event.target.value)} placeholder='一句话判断' />
          ) : entry.summary ? <p>{entry.summary}</p> : null}
        </div>
        <div className='knowledge-detail-actions'>
          <button type='button' onClick={() => setEditing(value => !value)}>{editing ? '取消' : '编辑'}</button>
          <button type='button' onClick={() => void developIntoWriting()} disabled={busy}>发展为写作</button>
          <button type='button' onClick={() => void save({ state: 'archived' })} disabled={busy || entry.state === 'archived'}>归档</button>
        </div>
      </header>

      {editing ? (
        <div className='knowledge-detail-editor'>
          <div className='knowledge-detail-fields'>
            <label><span>类型</span><select value={draft.kind} onChange={event => update('kind', event.target.value)}>{KNOWLEDGE_KINDS.map(value => <option value={value} key={value}>{KNOWLEDGE_KIND_LABELS[value]}</option>)}</select></label>
            <label><span>状态</span><select value={draft.state} onChange={event => update('state', event.target.value)}><option value='exploring'>探索中</option><option value='active'>活跃</option><option value='archived'>已归档</option></select></label>
            <label><span>领域</span><input value={draft.domain} onChange={event => update('domain', event.target.value)} /></label>
            <label><span>专题</span><input value={draft.topic} onChange={event => update('topic', event.target.value)} /></label>
            <label><span>标签</span><input value={draft.tagsText} onChange={event => update('tagsText', event.target.value)} /></label>
            <label className='knowledge-home-toggle'><input type='checkbox' checked={draft.showOnHome} onChange={event => update('showOnHome', event.target.checked)} /><span>首页显示</span></label>
          </div>
          <textarea value={draft.bodyMarkdown} onChange={event => update('bodyMarkdown', event.target.value)} />
          <footer><span>{status}</span><button type='button' className='is-primary' onClick={() => void save()} disabled={busy}>{busy ? '保存中…' : '保存修改'}</button></footer>
        </div>
      ) : (
        <>
          <div className='knowledge-detail-tags'>{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          <MarkdownDocument markdown={entry.bodyMarkdown} title={entry.title} className='knowledge-reading-document' />
          {entry.provenance?.length ? (
            <section className='knowledge-provenance'>
              <span className='eyebrow'>Sources</span>
              <h2>来源线索</h2>
              {entry.provenance.map((source, index) => (
                <p key={`${source.type}:${source.id}:${index}`}>
                  <strong>{source.title || source.type || '来源'}</strong>
                  {source.url ? <a href={source.url} target='_blank' rel='noreferrer'>查看 ↗</a> : null}
                </p>
              ))}
            </section>
          ) : null}
          <section className='knowledge-relations'>
            <header>
              <div><span className='eyebrow'>Connections</span><h2>相关内容</h2></div>
            </header>
            {relations.length ? relations.map(relation => (
              <div className='knowledge-relation-row' key={relation.id}>
                <span>
                  {relation.targetType === 'knowledge' && relation.target
                    ? <Link href={`/desk/knowledge/${relation.targetId}`}>{relation.target.title}</Link>
                    : <strong>{relation.metadata?.title || relation.targetType}</strong>}
                  <small>{relation.metadata?.reasons?.join(' · ') || relation.note || '用户关联'}</small>
                </span>
                {relation.status === 'suggested' ? <div>
                  <button type='button' onClick={() => void decideRelation(relation.id, 'confirmed')} disabled={busy}>确认</button>
                  <button type='button' onClick={() => void decideRelation(relation.id, 'dismissed')} disabled={busy}>忽略</button>
                </div> : <i>已关联</i>}
              </div>
            )) : null}
          </section>
        </>
      )}
      {status && !editing ? <p className='knowledge-detail-status' role='status'>{status}</p> : null}
    </article>
  )
}
