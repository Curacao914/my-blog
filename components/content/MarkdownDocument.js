import { Children, isValidElement, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'

function plainText(children) {
  return Children.toArray(children)
    .map(child => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (isValidElement(child)) return plainText(child.props.children)
      return ''
    })
    .join('')
}

function cleanHeadingText(value = '') {
  return String(value || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim()
}

export function headingId(value = '', index = 0) {
  const base = String(value || '')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/[`*_~[\]()<>{}:：，。！？、“”‘’'"/\\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section'
  return index > 0 ? `${base}-${index + 1}` : base
}

export function stripLeadingDuplicateTitle(markdown = '', title = '') {
  const source = String(markdown || '')
  if (!title.trim()) return source

  const lines = source.split('\n')
  const firstContentIndex = lines.findIndex(line => line.trim())
  if (firstContentIndex < 0) return source

  const match = lines[firstContentIndex].match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/)
  if (!match) return source

  const bodyTitle = cleanHeadingText(match[1])
  if (bodyTitle !== cleanHeadingText(title)) return source

  lines.splice(firstContentIndex, 1)
  while (lines[firstContentIndex] !== undefined && !lines[firstContentIndex].trim()) {
    lines.splice(firstContentIndex, 1)
  }
  return lines.join('\n')
}

export function extractMarkdownHeadings(markdown = '') {
  const headings = []
  const counts = new Map()
  let inFence = false

  String(markdown || '').split('\n').forEach((line, lineIndex) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return

    const match = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/)
    if (!match) return

    const title = cleanHeadingText(match[2])
    if (!title) return
    const key = title.toLocaleLowerCase('zh-CN')
    const occurrence = counts.get(key) || 0
    counts.set(key, occurrence + 1)
    headings.push({
      level: match[1].length,
      title,
      id: headingId(title, occurrence),
      line: lineIndex + 1
    })
  })

  return headings
}

function buildHeadingComponents(headings) {
  let cursor = 0

  function component(level) {
    const Tag = `h${level}`
    return function MarkdownHeading({ children }) {
      const text = cleanHeadingText(plainText(children))
      let heading = headings[cursor]
      if (!heading || heading.title !== text || heading.level !== level) {
        heading = headings.slice(cursor).find(item => item.title === text && item.level === level)
      }
      if (heading) cursor = Math.max(cursor + 1, headings.indexOf(heading) + 1)
      return <Tag id={heading?.id || headingId(text)}>{children}</Tag>
    }
  }

  return {
    h1: component(1),
    h2: component(2),
    h3: component(3),
    h4: component(4),
    a({ href, children }) {
      const external = /^https?:\/\//i.test(href || '')
      return <a href={href} rel={external ? 'noreferrer' : undefined} target={external ? '_blank' : undefined}>{children}</a>
    }
  }
}

export function MarkdownDocument({
  markdown = '',
  title = '',
  className = '',
  articleRef,
  emptyText = '暂无正文。'
}) {
  const body = useMemo(() => stripLeadingDuplicateTitle(markdown, title), [markdown, title])
  const headings = useMemo(() => extractMarkdownHeadings(body), [body])
  const components = buildHeadingComponents(headings)

  return <article ref={articleRef} className={`markdown-document ${className}`.trim()}>
    {body.trim() ? <ReactMarkdown components={components}>{body}</ReactMarkdown> : <p>{emptyText}</p>}
  </article>
}
