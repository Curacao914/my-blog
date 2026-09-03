import { useEffect, useRef } from 'react'

export function ReadingLibraryDialog({
  open,
  title,
  description = '',
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  busy = false,
  value = '',
  onValueChange,
  placeholder = '',
  destination = '',
  onDestinationChange,
  destinations = [],
  onConfirm,
  onClose
}) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
    const keydown = event => {
      if (event.key === 'Escape' && !busy) onClose?.()
      if (event.key === 'Enter' && !event.shiftKey && onValueChange) {
        event.preventDefault()
        onConfirm?.()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', keydown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, busy, onClose, onConfirm, onValueChange])

  if (!open) return null

  return (
    <div
      className='reading-dialog-backdrop'
      role='presentation'
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) onClose?.()
      }}
    >
      <section
        className='reading-dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby='reading-dialog-title'
      >
        <header>
          <span>Reading Library</span>
          <h3 id='reading-dialog-title'>{title}</h3>
          {description ? <p>{description}</p> : null}
        </header>

        {onValueChange ? (
          <label>
            <span>名称</span>
            <input
              ref={inputRef}
              value={value}
              onChange={event => onValueChange(event.target.value)}
              placeholder={placeholder}
              disabled={busy}
            />
          </label>
        ) : null}

        {destinations.length ? (
          <label>
            <span>目标位置</span>
            <select
              value={destination}
              onChange={event => onDestinationChange?.(event.target.value)}
              disabled={busy}
            >
              <option value=''>选择文件夹</option>
              {destinations.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <footer>
          <button type='button' onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={danger ? 'is-danger' : 'is-primary'}
            type='button'
            onClick={onConfirm}
            disabled={
              busy ||
              Boolean(onValueChange && !String(value || '').trim()) ||
              Boolean(destinations.length && !destination)
            }
          >
            {busy ? '处理中…' : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  )
}
