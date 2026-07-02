import { useEffect, useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function isScrollContainer(element) {
  if (!element || typeof window === 'undefined') return false
  const style = window.getComputedStyle(element)
  return /(auto|scroll|overlay)/.test(style.overflowY)
}

export function findReadingScrollContainer(node) {
  if (typeof window === 'undefined') return null
  let current = node?.parentElement || null

  while (current && current !== document.body && current !== document.documentElement) {
    if (isScrollContainer(current)) return current
    current = current.parentElement
  }

  return window
}

function viewportFor(target) {
  if (target === window) {
    return {
      top: 0,
      height: window.innerHeight,
      scrollTop: window.scrollY
    }
  }

  const rect = target.getBoundingClientRect()
  return {
    top: rect.top,
    height: target.clientHeight,
    scrollTop: target.scrollTop
  }
}

export function scrollToReadingHeading(article, heading, behavior = 'smooth') {
  if (!article || !heading || typeof window === 'undefined') return
  const target = findReadingScrollContainer(article)
  const viewport = viewportFor(target)
  const offset = Math.min(Math.max(viewport.height * 0.08, 24), 88)
  const headingTop = heading.getBoundingClientRect().top

  if (target === window) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + headingTop - offset),
      behavior
    })
    return
  }

  target.scrollTo({
    top: Math.max(0, target.scrollTop + headingTop - viewport.top - offset),
    behavior
  })
}

export function useReadingPosition(articleRef, headings = []) {
  const [progress, setProgress] = useState(0)
  const [activeId, setActiveId] = useState(headings[0]?.id || '')

  useEffect(() => {
    setActiveId(headings[0]?.id || '')
  }, [headings])

  useEffect(() => {
    const article = articleRef?.current
    if (!article || typeof window === 'undefined') return undefined

    const scrollTarget = findReadingScrollContainer(article)
    let frame = 0

    const update = () => {
      frame = 0
      const viewport = viewportFor(scrollTarget)
      const articleRect = article.getBoundingClientRect()
      const anchorY = viewport.top + Math.min(viewport.height * 0.34, 230)
      const readableDistance = Math.max(article.offsetHeight - viewport.height * 0.5, 1)

      setProgress(clamp((anchorY - articleRect.top) / readableDistance, 0, 1))

      let current = headings[0]?.id || ''
      for (const heading of headings) {
        const element = document.getElementById(heading.id)
        if (!element) continue
        if (element.getBoundingClientRect().top <= anchorY + 2) current = heading.id
        else break
      }
      setActiveId(previous => previous === current ? previous : current)
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    scrollTarget.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedule)
      : null
    resizeObserver?.observe(article)
    if (scrollTarget !== window) resizeObserver?.observe(scrollTarget)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      scrollTarget.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      resizeObserver?.disconnect()
    }
  }, [articleRef, headings])

  return { progress, activeId }
}

export function ReadingNavigator({
  articleRef,
  headings = [],
  className = '',
  onNavigate,
  title = '本文目录'
}) {
  const { progress, activeId } = useReadingPosition(articleRef, headings)
  const navRef = useRef(null)

  useEffect(() => {
    if (!activeId || !navRef.current) return
    const escaped = window.CSS?.escape ? window.CSS.escape(activeId) : activeId.replace(/["']/g, '\\$&')
    const active = navRef.current.querySelector(`[data-heading-id="${escaped}"]`)
    if (!active) return

    const nav = navRef.current
    const padding = 10
    const activeTop = active.offsetTop
    const activeBottom = activeTop + active.offsetHeight
    const visibleTop = nav.scrollTop + padding
    const visibleBottom = nav.scrollTop + nav.clientHeight - padding

    if (activeTop < visibleTop) nav.scrollTo({ top: Math.max(0, activeTop - padding), behavior: 'smooth' })
    else if (activeBottom > visibleBottom) nav.scrollTo({ top: activeBottom - nav.clientHeight + padding, behavior: 'smooth' })
  }, [activeId])

  function navigate(event, id) {
    event.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    scrollToReadingHeading(articleRef?.current, target)
    window.history.replaceState(null, '', `#${id}`)
    onNavigate?.()
  }

  return <div className={`reading-navigator ${className}`.trim()}>
    <div className='reading-progress-head'>
      <span>{title}</span>
      <strong>{Math.round(progress * 100)}%</strong>
    </div>
    <div className='reading-progress-track' aria-label={`阅读进度 ${Math.round(progress * 100)}%`}>
      <i style={{ transform: `scaleX(${progress})` }} />
    </div>
    {headings.length ? <nav ref={navRef}>
      {headings.map(heading => <a
        aria-current={activeId === heading.id ? 'location' : undefined}
        className={`level-${heading.level} ${activeId === heading.id ? 'active' : ''}`}
        data-heading-id={heading.id}
        href={`#${heading.id}`}
        key={`${heading.line}:${heading.id}`}
        onClick={event => navigate(event, heading.id)}
      >{heading.title}</a>)}
    </nav> : <p>正文没有可导航的标题。</p>}
  </div>
}
