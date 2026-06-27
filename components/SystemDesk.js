import { useEffect, useState } from 'react'

import { AdminContentSync } from '@/components/law-tech/AdminContentSync'

function StatePill({ ok, children }) {
  return <span className={`system-state-pill ${ok ? 'is-ok' : 'is-warn'}`}><i />{children}</span>
}

export function SystemDesk() {
  const [state, setState] = useState('loading')
  const [health, setHealth] = useState(null)

  async function load() {
    setState('loading')
    try {
      const response = await fetch('/api/admin/health')
      if (!response.ok) throw new Error('health')
      setHealth(await response.json())
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useEffect(() => { load() }, [])

  return <div className='system-desk'>
    <section className='system-desk-hero'>
      <div><span>Workspace settings</span><h2>连接状态与内容同步</h2><p>这里只展示真正需要维护的连接。密钥不会在页面中回显；正常状态也不需要频繁操作。</p></div>
      <AdminContentSync compact={false} />
    </section>

    <section className='system-desk-grid'>
      <article>
        <header><span>Database</span><h3>数据服务</h3></header>
        {state === 'loading' ? <p>正在检测…</p> : state === 'error' ? <><StatePill ok={false}>检测失败</StatePill><button type='button' onClick={load}>重新检测</button></> : <>
          <StatePill ok={Boolean(health?.databaseReachable)}>{health?.databaseReachable ? '数据库可连接' : '数据库不可用'}</StatePill>
          <dl><div><dt>Supabase</dt><dd>{health?.supabaseConfigured ? '已配置' : '未配置'}</dd></div><div><dt>Storage</dt><dd>{health?.storageConfigured ? '已配置' : '未配置'}</dd></div><div><dt>数据表</dt><dd>{health?.tables?.filter(table => table.ok).length || 0}/{health?.tables?.length || 0}</dd></div></dl>
        </>}
      </article>
      <article>
        <header><span>Content</span><h3>Notion 与公开内容</h3></header>
        {state === 'ready' ? <div className='system-connection-list'>
          <StatePill ok={Boolean(health?.notionConfigured)}>{health?.notionConfigured ? 'Notion 数据源已配置' : 'Notion 数据源未配置'}</StatePill>
          <StatePill ok={Boolean(health?.algoliaSearchConfigured)}>{health?.algoliaSearchConfigured ? '全文搜索可用' : '使用站内索引搜索'}</StatePill>
          <StatePill ok={Boolean(health?.algoliaAdminConfigured)}>{health?.algoliaAdminConfigured ? '全文索引可更新' : '全文索引只读或未配置'}</StatePill>
        </div> : null}
        <p>管理员同步会清除内容索引缓存、重新读取 Notion、更新公开页面，并在配置完成时同步 Algolia 全文索引。</p>
        <small>普通访客不会看到同步按钮。</small>
      </article>
      <article>
        <header><span>Safety</span><h3>权限边界</h3></header>
        <p>工作台页面、内容管理和同步接口都要求管理员会话；公开页面只读取明确发布的内容。</p>
        <small>私密与密码内容不会进入全文索引。</small>
      </article>
    </section>
  </div>
}
