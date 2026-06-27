import { useEffect, useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function useReadingPosition(articleRef, headings = []) {
  const [progress, setProgress] = useState(0)
  const [activeId, setActiveId] = useState(headings[0]?.id || '')

  useEffect(() => {
    setActiveId(headings[0]?.id || '')
  }, [headings])

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const article = articleRef?.current
      if (!article) return

      const pageTop = window.scrollY + article.getBoundingClientRect().top
      const viewportAnchor = window.scrollY + Math.min(window.innerHeight * 0.38, 260)
      const readableDistance = Math.max(article.offsetHeight - window.innerHeight * 0.45, 1)
      setProgress(clamp((viewportAnchor - pageTop) / readableDistance, 0, 1))

      let current = headings[0]?.id || ''
      for (const heading of headings) {
        const element = document.getElementById(heading.id)
        if (!element) continue
        if (element.getBoundingClientRect().top <= Math.min(window.innerHeight * 0.28, 190)) {
          current = heading.id
        } else {
          break
        }
      }
      setActiveId(current)
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
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
    const escaped = window.CSS?.escape ? window.CSS.escape(activeId) : activeId.replace(/[\"']/g, '\\$&')
    const active = navRef.current.querySelector(`[data-heading-id="${escaped}"]`)
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  function navigate(event, id) {
    event.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
