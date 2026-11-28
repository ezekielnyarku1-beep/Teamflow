import { useId, useLayoutEffect, useRef, useState } from 'react'

export default function Popover({ label, buttonContent, buttonClassName = 'button', triggerProps, popupRole, align = 'start', children }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const buttonId = useId()
  const panelId = useId()

  useLayoutEffect(() => {
    if (!open) return undefined
    const button = buttonRef.current
    const panel = panelRef.current
    panel.showPopover?.()

    function placePanel() {
      const gap = 6
      const edge = 8
      const anchor = button.getBoundingClientRect()
      const { clientWidth, clientHeight } = document.documentElement
      panel.style.setProperty('--popover-anchor-width', `${anchor.width}px`)
      panel.style.setProperty('--popover-available-width', `${clientWidth - edge * 2}px`)

      const below = clientHeight - anchor.bottom - gap - edge
      const above = anchor.top - gap - edge
      const preferredHeight = Math.min(320, panel.scrollHeight + panel.offsetHeight - panel.clientHeight)
      const placeAbove = below < preferredHeight && above > below
      panel.dataset.side = placeAbove ? 'top' : 'bottom'
      panel.style.maxHeight = `${Math.max(0, Math.min(320, placeAbove ? above : below))}px`
      const left = align === 'end' ? anchor.right - panel.offsetWidth : anchor.left
      panel.style.left = `${Math.max(edge, Math.min(left, clientWidth - panel.offsetWidth - edge))}px`
      const top = placeAbove ? anchor.top - panel.offsetHeight - gap : anchor.bottom + gap
      panel.style.top = `${Math.max(edge, top)}px`
    }

    const closeOnOutsideClick = event => {
      if (!button.contains(event.target) && !panel.contains(event.target)) setOpen(false)
    }

    placePanel()
    panel.focus({ preventScroll: true })
    const resizeObserver = new ResizeObserver(placePanel)
    resizeObserver.observe(button)
    resizeObserver.observe(panel)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setOpen(false)
    })
    intersectionObserver.observe(button)
    window.addEventListener('resize', placePanel)
    window.addEventListener('scroll', placePanel, true)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      panel.hidePopover?.()
      window.removeEventListener('resize', placePanel)
      window.removeEventListener('scroll', placePanel, true)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [open, align])

  function close() {
    setOpen(false)
    document.getElementById(triggerProps?.id ?? buttonId)?.focus({ preventScroll: true })
  }

  function closeOnEscape(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  return (
    <div
      className="popover"
      onKeyDown={closeOnEscape}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        ref={buttonRef}
        id={buttonId}
        {...triggerProps}
        className={buttonClassName}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup={popupRole}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(isOpen => !isOpen)}
      >
        {buttonContent}
      </button>
      {open && (
        <div id={panelId} className="popover-panel" popover="manual" ref={panelRef} tabIndex={-1}>
          {children(close)}
        </div>
      )}
    </div>
  )
}
