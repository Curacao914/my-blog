import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'

import { LawTechIcon } from '@/components/LawTechIcons'
import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'
import { AdminContentSync } from '@/components/law-tech/AdminContentSync'
import { PublicHeaderSignal } from '@/components/law-tech/PublicHeaderSignal'
import { LiquidGlassFilters } from '@/components/law-tech/LiquidGlassFilters'
import { useSystemWindows } from '@/components/law-tech/SystemWindowManager'
import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'

const MENU_ITEMS = [
  { key: 'home', label: '首页', href: '/' },
  { key: 'content', label: '内容', href: '/content' },
  { key: 'tools', label: '工具', href: '/tools' },
  { key: 'about', label: '关于', href: '/about' }
]

const QUICK_SEARCH = [
  { label: '内容库', href: '/content', icon: 'content' },
  { label: '时间归档', href: '/archive', icon: 'archive' },
  { label: '栏目', href: '/category', icon: 'folder' },
  { label: '标签', href: '/tag', icon: 'spark' }
]

function pickRandom(items, current = '') {
  const supplied = [...new Set((items || []).filter(Boolean))]
  const pool = supplied.length ? supplied : ['/content', '/archive', '/tools', '/about']
  if (pool.length === 1) return pool[0]
  const nextPool = pool.filter(item => item !== current)
  return nextPool[Math.floor(Math.random() * nextPool.length)] || pool[0]
}

function DockItem({ active = false, href, icon, label, onClick, windowStatus = '' }) {
  return (
    <Link
      className={`system-dock-item ${active ? 'is-active' : ''} ${windowStatus ? `is-window-${windowStatus}` : ''}`}
      href={href}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <LawTechIcon name={icon} size={17} />
      <span className='system-dock-tooltip'>{label}</span>
    </Link>
  )
}

function RandomDockLink({ randomItems = [] }) {
  const [href, setHref] = useState('/content')
  const poolKey = useMemo(() => [...new Set((randomItems || []).filter(Boolean))].join('|'), [randomItems])

  useEffect(() => {
    setHref(pickRandom(poolKey ? poolKey.split('|') : []))
  }, [poolKey])

  function openRandom(event) {
    const items = poolKey ? poolKey.split('|') : []
    const next = pickRandom(items, href)
    setHref(next)
    if (typeof window !== 'undefined') {
      event.preventDefault()
      window.location.assign(next)
    }
  }

  return (
    <a className='system-dock-item' href={href} onClick={openRandom} title='随机一页' aria-label='随机一页'>
      <LawTechIcon name='random' size={17} />
      <span className='system-dock-tooltip'>随机一页</span>
    </a>
  )
}

function SystemDock({ active = '', randomItems = [], showAbout = false }) {
  const { currentWindow, records, restoreWindow, openMissionControl } = useSystemWindows()
  const currentStatus = currentWindow?.status || 'open'
  const windowCount = Object.keys(records || {}).length

  function restoreCurrent(event) {
    if (currentStatus === 'open') return
    event.preventDefault()
    restoreWindow(currentWindow.id)
  }

  return (
    <nav className='system-dock' aria-label='系统程序坞'>
      <DockItem active={active === 'home'} href='/' icon='home' label='首页' onClick={active === 'home' ? restoreCurrent : undefined} windowStatus={active === 'home' ? currentStatus : ''} />
      <DockItem active={active === 'content'} href='/content' icon='content' label='内容库' onClick={active === 'content' ? restoreCurrent : undefined} windowStatus={active === 'content' ? currentStatus : ''} />
      <DockItem active={active === 'archive'} href='/archive' icon='archive' label='时间归档' onClick={active === 'archive' ? restoreCurrent : undefined} windowStatus={active === 'archive' ? currentStatus : ''} />
      <DockItem active={active === 'search'} href='/search' icon='search' label='搜索' onClick={active === 'search' ? restoreCurrent : undefined} windowStatus={active === 'search' ? currentStatus : ''} />
      <RandomDockLink randomItems={randomItems} />
      <DockItem active={active === 'tools'} href='/tools' icon='tools' label='工具' onClick={active === 'tools' ? restoreCurrent : undefined} windowStatus={active === 'tools' ? currentStatus : ''} />
      {showAbout ? <DockItem active={active === 'about'} href='/about' icon='about' label='关于' onClick={active === 'about' ? restoreCurrent : undefined} windowStatus={active === 'about' ? currentStatus : ''} /> : null}
      <DockItem active={active === 'desk'} href='/desk/today' icon='desk' label='工作台' onClick={active === 'desk' ? restoreCurrent : undefined} windowStatus={active === 'desk' ? currentStatus : ''} />
      <button className={`system-dock-item system-dock-overview ${windowCount ? 'has-windows' : ''}`} type='button' title='窗口总览' aria-label='窗口总览' onClick={openMissionControl}>
        <LawTechIcon name='atlas' size={17} />
        <span className='system-dock-tooltip'>窗口总览</span>
      </button>
    </nav>
  )
}

function SearchHit({ hit, onChoose }) {
  return (
    <Link className='system-search-hit' href={hit.href || '/content'} onClick={onChoose}>
      <span
        className={`system-search-cover ${hit.cover ? 'has-cover' : ''}`}
        style={hit.cover ? { backgroundImage: `url("${hit.cover}")` } : undefined}
        aria-hidden='true'
      >
        {!hit.cover ? <LawTechIcon name='content' size={14} /> : null}
      </span>
      <span>
        <strong>{hit.title || '未命名内容'}</strong>
        <small>{hit.category || hit.collection || '内容'}</small>
      </span>
      <i aria-hidden='true'>↗</i>
    </Link>
  )
}

function SystemSearch() {
  const router = useRouter()
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [state, setState] = useState('idle')
  const [hits, setHits] = useState([])
  const [available, setAvailable] = useState(null)

  useEffect(() => {
    function focusSearch(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
      }
    }
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', focusSearch)
    window.addEventListener('keydown', closeEscape)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      window.removeEventListener('keydown', focusSearch)
      window.removeEventListener('keydown', closeEscape)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [])

  useEffect(() => {
    const keyword = query.trim()
    if (keyword.length < 2) {
      setHits([])
      setAvailable(null)
      setState('idle')
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setState('loading')
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}&hitsPerPage=6`, {
          signal: controller.signal
        })
        const data = await response.json()
        setHits(Array.isArray(data?.hits) ? data.hits : [])
        setAvailable(Boolean(data?.available))
        setState('ready')
      } catch (error) {
        if (error?.name === 'AbortError') return
        setHits([])
        setAvailable(false)
        setState('ready')
      }
    }, 220)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function submit(event) {
    event.preventDefault()
    const keyword = query.trim()
    setOpen(false)
    void router.push(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search')
  }

  const showPanel = open
  const shortQuery = query.trim().length < 2

  return (
    <div className='system-search-root' ref={rootRef}>
      <form className='system-menu-search' onSubmit={submit} role='search'>
        <LawTechIcon name='search' size={14} />
        <input
          ref={inputRef}
          name='q'
          type='search'
          autoComplete='off'
          placeholder='搜索标题、内容或标签'
          aria-label='搜索公开内容'
          aria-expanded={showPanel}
          onChange={event => { setQuery(event.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          value={query}
        />
        <kbd>⌘K</kbd>
      </form>

      {showPanel ? (
        <div className='system-search-popover' role='dialog' aria-label='搜索建议'>
          {shortQuery ? (
            <div className='system-search-quick'>
              <span>快速前往</span>
              <div>
                {QUICK_SEARCH.map(item => (
                  <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>
                    <LawTechIcon name={item.icon} size={15} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {!shortQuery && state === 'loading' ? <p className='system-search-state'>正在搜索…</p> : null}
          {!shortQuery && state === 'ready' && hits.length ? (
            <div className='system-search-hits'>
              {hits.map(hit => <SearchHit hit={hit} key={hit.id || hit.href} onChoose={() => setOpen(false)} />)}
            </div>
          ) : null}
          {!shortQuery && state === 'ready' && !hits.length ? (
            <p className='system-search-state'>{available === false ? '全文索引未连接；按回车使用站内搜索。' : '没有找到匹配内容。'}</p>
          ) : null}

          {!shortQuery ? (
            <button className='system-search-all' type='button' onClick={submit}>
              在搜索页查看“{query.trim()}” <span>↗</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function menuIsActive(active, key) {
  if (key === 'content') return ['content', 'archive', 'search'].includes(active)
  return active === key
}

export function PublicHeader({ active = '', randomItems = [], showDock = true, ownerNavigation = false }) {
  const { session } = useWorkspaceSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const showAbout = ownerNavigation || (mounted && Boolean(session?.isOwner))
  const menuItems = useMemo(() => MENU_ITEMS.filter(item => item.key !== 'about' || showAbout), [showAbout])
  return (
    <>
      <LiquidGlassFilters />
      <header className='public-header system-menu-bar'>
        <div className='system-menu-leading'><PublicHeaderSignal /></div>
        <nav className='public-nav system-menu-nav' aria-label='公开导航'>
          {menuItems.map(item => (
            <Link key={item.href} href={item.href} aria-current={menuIsActive(active, item.key) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className='system-menu-trailing'>
          <SystemSearch />
          <div className='public-header-actions'>
            <AdminContentSync compact />
            <WorkspaceAccountMenu placement='public' />
          </div>
        </div>
      </header>
      {showDock ? <SystemDock active={active} randomItems={randomItems} showAbout={showAbout} /> : null}
    </>
  )
}
