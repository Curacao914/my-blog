import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { createPortal } from 'react-dom'

import { LawTechIcon } from '@/components/LawTechIcons'

const STORAGE_KEY = 'lawtech-system-windows-v1'
const DEFAULT_RECORD = {
  status: 'open',
  layout: 'default',
  updatedAt: 0
}

const SystemWindowContext = createContext(null)

function cleanPath(value = '/') {
  return String(value || '/').split('?')[0].split('#')[0] || '/'
}

function routeWindowMeta(pathname = '/') {
  const path = cleanPath(pathname)
  if (path === '/') return { id: 'home:main', title: '首页', href: '/', kind: 'home' }
  if (path.startsWith('/desk')) return { id: 'desk:workspace', title: '工作台', href: path, kind: 'desk' }
  if (path.startsWith('/content')) return { id: `public:${path}`, title: '内容库', href: path, kind: 'content' }
  if (path.startsWith('/archive')) return { id: `public:${path}`, title: '时间归档', href: path, kind: 'archive' }
  if (path.startsWith('/search')) return { id: `public:${path}`, title: '搜索', href: path, kind: 'search' }
  if (path.startsWith('/tools')) return { id: `public:${path}`, title: '工具', href: path, kind: 'tools' }
  if (path.startsWith('/about')) return { id: `public:${path}`, title: '关于', href: path, kind: 'about' }
  return { id: `public:${path}`, title: '窗口', href: path, kind: 'content' }
}

function normalizeRecord(record = {}) {
  return {
    ...DEFAULT_RECORD,
    ...record,
    id: String(record.id || ''),
    title: String(record.title || '窗口'),
    href: cleanPath(record.href || '/'),
    kind: String(record.kind || 'content'),
    status: ['open', 'minimized', 'closed'].includes(record.status) ? record.status : 'open',
    layout: ['default', 'focus', 'left', 'right'].includes(record.layout) ? record.layout : 'default',
    updatedAt: Number(record.updatedAt || Date.now())
  }
}

function readStoredWindows() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '{}')
    if (!raw || typeof raw !== 'object') return {}
    return Object.fromEntries(
      Object.entries(raw)
        .map(([id, value]) => [id, normalizeRecord({ ...value, id })])
        .filter(([, value]) => value.id)
    )
  } catch {
    return {}
  }
}

function windowClassName(record = DEFAULT_RECORD) {
  const status = record.status || 'open'
  const layout = record.layout || 'default'
  return [
    'system-managed-window',
    `is-window-${status}`,
    `is-window-layout-${layout}`,
    status !== 'open' ? 'is-window-hidden' : ''
  ].filter(Boolean).join(' ')
}

function candidateFromNode(node) {
  if (!node || typeof node.closest !== 'function') return null
  const scope = node.closest('[data-quicklook]:not([data-quicklook="false"])')
  if (!scope) return null
  const link = scope.matches('a[href]') ? scope : scope.querySelector('a[href]')
  if (!link) return null
  const href = link.getAttribute('href') || ''
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return null
  const titleNode = scope.querySelector('[data-quicklook-title],h1,h2,h3,strong')
  const metaNode = scope.querySelector('[data-quicklook-meta],small,time,.eyebrow')
  const imageNode = scope.querySelector('img')
  const backgroundNode = scope.querySelector('[style*="background-image"]')
  const style = backgroundNode?.getAttribute('style') || ''
  const match = style.match(/url\(["']?([^"')]+)["']?\)/)
  const title = String(titleNode?.textContent || link.getAttribute('aria-label') || link.getAttribute('title') || '预览').trim()
  return {
    href,
    title,
    meta: String(metaNode?.textContent || '').trim(),
    image: imageNode?.currentSrc || imageNode?.src || match?.[1] || ''
  }
}

function MissionControl({ open, records, onClose, onRestore, onDismiss }) {
  if (!open || typeof document === 'undefined') return null
  const windows = Object.values(records)
    .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
    .slice(0, 7)

  function statusLabel(status) {
    if (status === 'minimized') return '已最小化'
    if (status === 'closed') return '最近关闭'
    return '正在使用'
  }

  return createPortal(
    <div className='system-window-shelf-layer' role='dialog' aria-label='窗口总览'>
      <button className='system-window-shelf-dismiss' type='button' aria-label='关闭窗口总览' onClick={onClose} />
      <section className='system-window-shelf'>
        <header>
          <div>
            <strong>窗口</strong>
            <small>{windows.length ? `${windows.length} 个` : '无'}</small>
          </div>
          <button type='button' onClick={onClose} aria-label='关闭'>×</button>
        </header>
        <div className='system-window-shelf-list'>
          {windows.length ? windows.map(item => (
            <article className='system-window-shelf-entry' key={item.id}>
              <button className='system-window-shelf-open' type='button' onClick={() => onRestore(item.id)}>
                <i className={`system-window-shelf-state is-${item.status}`} aria-hidden='true' />
                <span className='system-window-shelf-icon' aria-hidden='true'>
                  <LawTechIcon name={item.kind === 'home' ? 'home' : item.kind === 'desk' ? 'desk' : item.kind} size={15} />
                </span>
                <span className='system-window-shelf-copy'>
                  <strong>{item.title}</strong>
                  <small>{statusLabel(item.status)}</small>
                </span>
              </button>
              {item.status !== 'closed' ? (
                <button className='system-window-shelf-close' type='button' onClick={() => onDismiss(item.id)} aria-label={`关闭${item.title}`}>×</button>
              ) : null}
            </article>
          )) : <p className='system-window-shelf-empty'>没有窗口</p>}
        </div>
      </section>
    </div>,
    document.body
  )
}

function QuickLook({ value, onClose }) {
  if (!value) return null
  return createPortal(
    <div className='system-quick-look' role='dialog' aria-modal='true' aria-label={`${value.title} 快速查看`}>
      <button className='system-overlay-backdrop' type='button' aria-label='关闭快速查看' onClick={onClose} />
      <section className='system-quick-look-panel'>
        <header><span>Quick Look</span><button type='button' onClick={onClose} aria-label='关闭'>×</button></header>
        <div className={`system-quick-look-cover ${value.image ? 'has-image' : ''}`} style={value.image ? { backgroundImage: `url("${value.image}")` } : undefined}>
          {!value.image ? <LawTechIcon name='content' size={42} /> : null}
        </div>
        <div className='system-quick-look-copy'><small>{value.meta || '内容预览'}</small><h2>{value.title}</h2><Link href={value.href} onClick={onClose}>打开 ↗</Link></div>
      </section>
    </div>,
    document.body
  )
}

function PublicWindowBridge() {
  const router = useRouter()
  const path = cleanPath(router.asPath || router.pathname)
  const enabled = path !== '/' && !path.startsWith('/desk') && !path.startsWith('/sign-') && !path.startsWith('/access-')
  const meta = routeWindowMeta(path)
  const controller = useSystemWindow({ ...meta, enabled })
  const [mount, setMount] = useState(null)
  const [shell, setShell] = useState(null)

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    let frame = 0
    const attach = () => {
      const target = document.querySelector('.lawtech-public-page > .public-shell')
      if (!target) {
        frame = window.requestAnimationFrame(attach)
        return
      }
      if (cancelled) return
      const node = document.createElement('div')
      node.className = 'system-public-window-titlebar-mount'
      target.prepend(node)
      target.dataset.systemWindowId = meta.id
      setShell(target)
      setMount(node)
    }
    attach()
    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
      setMount(current => {
        current?.remove()
        return null
      })
      setShell(null)
    }
  }, [enabled, meta.id])

  useEffect(() => {
    if (!shell) return
    shell.classList.remove(
      'is-window-open', 'is-window-minimized', 'is-window-closed', 'is-window-hidden',
      'is-window-layout-default', 'is-window-layout-focus', 'is-window-layout-left', 'is-window-layout-right'
    )
    windowClassName(controller.record).split(' ').forEach(name => shell.classList.add(name))
  }, [controller.record, shell])

  if (!enabled || !mount) return null
  return createPortal(
    <header className='system-public-window-titlebar' onDoubleClick={controller.toggleFocus}>
      <SystemWindowControls controller={controller} />
      <strong>{meta.title}</strong>
      <span aria-hidden='true' />
    </header>,
    mount
  )
}

export function SystemWindowProvider({ children }) {
  const router = useRouter()
  const [records, setRecords] = useState({})
  const [ready, setReady] = useState(false)
  const [missionOpen, setMissionOpen] = useState(false)
  const [quickLook, setQuickLook] = useState(null)
  const hoveredCandidate = useRef(null)

  useEffect(() => {
    setRecords(readStoredWindows())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [ready, records])

  useEffect(() => {
    if (!ready) return
    const meta = routeWindowMeta(router.asPath || router.pathname)

    setRecords(current => {
      const previous = current[meta.id]
      const next = normalizeRecord({
        ...previous,
        ...meta,
        status: 'open',
        updatedAt: Date.now()
      })

      if (
        previous &&
        previous.status === 'open' &&
        previous.href === next.href &&
        previous.title === next.title
      ) return current

      return { ...current, [meta.id]: next }
    })
  }, [ready, router.asPath, router.pathname])

  const registerWindow = useCallback(meta => {
    if (!meta?.id) return
    setRecords(current => {
      const previous = current[meta.id]
      const next = normalizeRecord({
        ...previous,
        ...meta,
        status: previous?.status || 'open',
        layout: previous?.layout || 'default',
        updatedAt: previous?.updatedAt || Date.now()
      })
      if (previous && previous.title === next.title && previous.href === next.href && previous.kind === next.kind) return current
      return { ...current, [meta.id]: next }
    })
  }, [])

  const updateWindow = useCallback((id, patch = {}) => {
    setRecords(current => {
      const previous = normalizeRecord(current[id] || { id, ...routeWindowMeta(router.asPath || router.pathname) })
      const next = normalizeRecord({ ...previous, ...patch, id, updatedAt: Date.now() })
      return { ...current, [id]: next }
    })
  }, [router.asPath, router.pathname])

  const restoreWindow = useCallback(async id => {
    const target = records[id]
    if (!target) return
    updateWindow(id, { status: 'open' })
    setMissionOpen(false)
    const currentPath = cleanPath(router.asPath)
    if (target.href && cleanPath(target.href) !== currentPath) await router.push(target.href)
  }, [records, router, updateWindow])

  const dismissWindow = useCallback(id => updateWindow(id, { status: 'closed', layout: 'default' }), [updateWindow])

  useEffect(() => {
    function rememberCandidate(event) {
      hoveredCandidate.current = candidateFromNode(event.target)
    }

    function clearCandidate(event) {
      const next = candidateFromNode(event.relatedTarget)
      if (!next) hoveredCandidate.current = null
    }

    function handleKey(event) {
      const target = event.target
      const typing = target && target.matches?.(
        'input,textarea,select,button,[contenteditable="true"]'
      )

      if (event.key === 'Escape') {
        if (quickLook) setQuickLook(null)
        else if (missionOpen) setMissionOpen(false)
        return
      }

      if (
        event.code !== 'Space' ||
        typing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) return

      if (quickLook) {
        event.preventDefault()
        setQuickLook(null)
        return
      }

      const candidate =
        candidateFromNode(document.activeElement) ||
        hoveredCandidate.current

      if (!candidate) return
      event.preventDefault()
      setQuickLook(candidate)
    }

    document.addEventListener('pointerover', rememberCandidate, { passive: true })
    document.addEventListener('pointerout', clearCandidate, { passive: true })
    document.addEventListener('focusin', rememberCandidate)
    document.addEventListener('focusout', clearCandidate)
    window.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('pointerover', rememberCandidate)
      document.removeEventListener('pointerout', clearCandidate)
      document.removeEventListener('focusin', rememberCandidate)
      document.removeEventListener('focusout', clearCandidate)
      window.removeEventListener('keydown', handleKey)
    }
  }, [missionOpen, quickLook])

  const currentMeta = routeWindowMeta(router.asPath || router.pathname)
  const currentWindow = records[currentMeta.id] || normalizeRecord(currentMeta)
  const value = useMemo(() => ({
    records,
    currentWindow,
    registerWindow,
    updateWindow,
    restoreWindow,
    dismissWindow,
    openMissionControl: () => setMissionOpen(true),
    closeMissionControl: () => setMissionOpen(false)
  }), [currentWindow, dismissWindow, records, registerWindow, restoreWindow, updateWindow])

  return (
    <SystemWindowContext.Provider value={value}>
      {children}
      <PublicWindowBridge />
      <MissionControl open={missionOpen} records={records} onClose={() => setMissionOpen(false)} onRestore={restoreWindow} onDismiss={dismissWindow} />
      <QuickLook value={quickLook} onClose={() => setQuickLook(null)} />
    </SystemWindowContext.Provider>
  )
}

export function useSystemWindows() {
  const value = useContext(SystemWindowContext)
  return value || {
    records: {},
    currentWindow: normalizeRecord(routeWindowMeta('/')),
    registerWindow: () => {},
    updateWindow: () => {},
    restoreWindow: () => {},
    dismissWindow: () => {},
    openMissionControl: () => {},
    closeMissionControl: () => {}
  }
}

export function useSystemWindow({ id, title, href, kind, enabled = true }) {
  const windows = useSystemWindows()
  useEffect(() => {
    if (!enabled || !id) return
    windows.registerWindow({ id, title, href, kind })
  }, [enabled, href, id, kind, title, windows.registerWindow])

  const record = normalizeRecord(windows.records[id] || { id, title, href, kind })
  const setLayout = useCallback(layout => windows.updateWindow(id, { status: 'open', layout }), [id, windows])
  const toggleFocus = useCallback(() => setLayout(record.layout === 'focus' ? 'default' : 'focus'), [record.layout, setLayout])
  return {
    id,
    record,
    className: windowClassName(record),
    close: () => windows.updateWindow(id, { status: 'closed', layout: 'default' }),
    minimize: () => windows.updateWindow(id, { status: 'minimized' }),
    restore: () => windows.restoreWindow(id),
    setLayout,
    toggleFocus
  }
}

export function SystemWindowControls({ controller, className = '' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ left: 12, top: 48 })
  const anchorRef = useRef(null)
  const menuRef = useRef(null)
  const openTimer = useRef(null)
  const closeTimer = useRef(null)

  function clearTimers() {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current)
      openTimer.current = null
    }
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const positionMenu = useCallback(() => {
    if (typeof window === 'undefined' || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const width = 154
    const height = 166
    const margin = 10
    const preferredTop = rect.bottom + 9
    const top = preferredTop + height <= window.innerHeight - margin
      ? preferredTop
      : Math.max(margin, rect.top - height - 9)
    const left = Math.max(
      margin,
      Math.min(rect.left - 54, window.innerWidth - width - margin)
    )
    setMenuPosition({ left, top })
  }, [])

  const openMenu = useCallback(() => {
    positionMenu()
    setMenuOpen(true)
  }, [positionMenu])

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!menuOpen || typeof window === 'undefined') return undefined

    const reposition = () => positionMenu()
    const onKeyDown = event => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const onPointerDown = event => {
      if (
        anchorRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) return
      setMenuOpen(false)
    }

    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)

    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menuOpen, positionMenu])

  function beginMenu() {
    clearTimers()
    openTimer.current = window.setTimeout(openMenu, 420)
  }

  function endMenu() {
    clearTimers()
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), 240)
  }

  function choose(layout) {
    controller.setLayout(layout)
    setMenuOpen(false)
  }

  const menu = menuOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          className='system-window-layout-layer'
          style={{
            left: `${menuPosition.left}px`,
            top: `${menuPosition.top}px`
          }}
        >
          <div
            ref={menuRef}
            className='system-window-layout-menu'
            role='menu'
            aria-label='窗口排列'
            onPointerEnter={clearTimers}
            onPointerLeave={endMenu}
          >
            <button type='button' role='menuitem' onClick={() => choose('focus')}>
              放大窗口
            </button>
            <button type='button' role='menuitem' onClick={() => choose('left')}>
              置于左侧
            </button>
            <button type='button' role='menuitem' onClick={() => choose('right')}>
              置于右侧
            </button>
            <button type='button' role='menuitem' onClick={() => choose('default')}>
              恢复默认
            </button>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <>
      <div
        className={`system-window-controls ${className}`}
        onDoubleClick={event => event.stopPropagation()}
      >
        <button
          className='system-window-light is-close'
          type='button'
          aria-label='关闭窗口'
          onClick={controller.close}
        >
          <span>×</span>
        </button>
        <button
          className='system-window-light is-minimize'
          type='button'
          aria-label='最小化到程序坞'
          onClick={controller.minimize}
        >
          <span>−</span>
        </button>
        <span
          ref={anchorRef}
          className='system-window-green-wrap'
          onPointerEnter={beginMenu}
          onPointerLeave={endMenu}
        >
          <button
            className='system-window-light is-expand'
            type='button'
            aria-label='聚焦或排列窗口'
            aria-haspopup='menu'
            aria-expanded={menuOpen}
            onClick={() => {
              clearTimers()
              setMenuOpen(false)
              controller.toggleFocus()
            }}
            onContextMenu={event => {
              event.preventDefault()
              clearTimers()
              openMenu()
            }}
          >
            <span>＋</span>
          </button>
        </span>
      </div>
      {menu}
    </>
  )
}
