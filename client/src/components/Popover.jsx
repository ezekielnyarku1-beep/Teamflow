import { useId, useLayoutEffect, useRef, useState } from 'react'

export default function Popover({ label, buttonContent, buttonClassName = 'button', triggerProps, children }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const buttonId = useId()

  useLayoutEffect(() => {
    if (!open) return undefined
    const button = buttonRef.current
    const panel = panelRef.current
    panel.showPopover?.()

    function placePanel() {
      const gap = 8
      const anchor = button.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight
      const below = viewportHeight - anchor.bottom - gap * 2
      const above = anchor.top - gap * 2
      const placeAbove = below < panel.scrollHeight && above > below
      panel.style.maxHeight = `${Math.max(0, Math.min(320, placeAbove ? above : below))}px`
      const left = Math.min(anchor.left, viewportWidth - panel.offsetWidth - gap)
      panel.style.left = `${Math.max(gap, left)}px`
      panel.style.top = `${placeAbove ? Math.max(gap, anchor.top - panel.offsetHeight - gap) : anchor.bottom + gap}px`
    }

    const closeOnOutsideClick = event => {
      if (!button.contains(event.target) && !panel.contains(event.target)) setOpen(false)
    }

    placePanel()
    window.addEventListener('resize', placePanel)
    window.addEventListener('scroll', placePanel, true)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      panel.hidePopover?.()
      window.removeEventListener('resize', placePanel)
      window.removeEventListener('scroll', placePanel, true)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [open])

  function close() {
    setOpen(false)
    document.getElementById(triggerProps?.id ?? buttonId)?.focus()
  }

  function closeOnEscape(event) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      close()
    }
  }

  return (
    <div className="popover" onKeyDown={closeOnEscape}>
      <button
        type="button"
        ref={buttonRef}
        id={buttonId}
        {...triggerProps}
        className={buttonClassName}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(isOpen => !isOpen)}
      >
        {buttonContent}
      </button>
      {open && <div className="popover-panel" popover="manual" ref={panelRef}>{children(close)}</div>}
    </div>
  )
}
