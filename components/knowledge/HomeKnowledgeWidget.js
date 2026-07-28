import Link from 'next/link'
import { useEffect, useState } from 'react'

import { LawTechIcon } from '@/components/LawTechIcons'

export function HomeKnowledgeWidget() {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    let cancelled = false

    fetch('/api/knowledge?showOnHome=true&limit=3', {
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!cancelled && Array.isArray(data?.entries)) {
          setEntries(data.entries.slice(0, 3))
        }
      })
      .catch(() => null)

    return () => { cancelled = true }
  }, [])

  return (
    <section className='home-knowledge-widget' aria-label='轻知识'>
      <header>
        <span><LawTechIcon name='spark' size={14} />轻知识</span>
        <Link href='/desk/knowledge'>打开 ↗</Link>
      </header>
      {entries.length ? (
        <div>
          <small>正在探索</small>
          {entries.map(entry => (
            <Link href={`/desk/knowledge/${entry.id}`} key={entry.id}>
              {entry.title || '未命名知识'}
            </Link>
          ))}
        </div>
      ) : (
        <Link className='home-knowledge-empty' href='/desk/knowledge'>
          <strong>捕捉一个念头</strong>
          <span>生成提示词，导入外部模型的回答</span>
        </Link>
      )}
      <style jsx>{`
        .home-knowledge-widget {
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid rgba(73, 92, 84, .16);
          border-radius: 16px;
          background: rgba(250, 252, 249, .78);
          box-shadow: 0 10px 28px rgba(52, 70, 62, .07);
          color: #32433c;
          backdrop-filter: blur(16px);
        }
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 9px;
          font-size: 12px;
        }
        header span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          letter-spacing: .06em;
        }
        header a {
          color: #71837b;
          text-decoration: none;
        }
        div {
          display: grid;
          gap: 5px;
        }
        div small {
          color: #83928c;
          font-size: 10px;
          letter-spacing: .08em;
        }
        div a {
          overflow: hidden;
          color: #35473f;
          font-size: 13px;
          line-height: 1.45;
          text-decoration: none;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        div a:hover,
        header a:hover {
          color: #17785b;
        }
        .home-knowledge-empty {
          display: grid;
          gap: 3px;
          color: inherit;
          text-decoration: none;
        }
        .home-knowledge-empty strong {
          font-size: 13px;
          font-weight: 650;
        }
        .home-knowledge-empty span {
          color: #7c8c85;
          font-size: 11px;
          line-height: 1.45;
        }
      `}</style>
    </section>
  )
}
