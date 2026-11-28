import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { ArrowUpRight, Link2, MoreHorizontal } from 'lucide-react'
import { iconProps } from '../lib/icons.js'
import { useShell } from '../lib/shellContext.js'
import './contextMenu.css'

function LinkMenu({ anchor, label, menuId, items, onClose }) {
  const menuRef = useRef(null)
  const [active, setActive] = useState(0)
  const current = Math.min(active, items.length - 1)

  useLayoutEffect(() => {
    const menu = menuRef.current
    menu.showPopover?.()
    const edge = 8
    const { clientWidth, clientHeight } = document.documentElement
    const x = anchor.alignEnd ? anchor.x - menu.offsetWidth : anchor.x
    menu.style.left = `${Math.max(edge, Math.min(x, clientWidth - menu.offsetWidth - edge))}px`
    menu.style.top = `${Math.max(edge, Math.min(anchor.y, clientHeight - menu.offsetHeight - edge))}px`
    menu.focus({ preventScroll: true })

    const dismissOutside = event => {
      if (event.target instanceof Node && (menu.contains(event.target) || (anchor.alignEnd && anchor.trigger.contains(event.target)))) return
      onClose()
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    window.addEventListener('scroll', dismissOutside, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
      window.removeEventListener('scroll', dismissOutside, true)
      window.removeEventListener('resize', onClose)
      menu.hidePopover?.()
    }
  }, [anchor, onClose])

  useLayoutEffect(() => {
    menuRef.current.children[current]?.scrollIntoView({ block: 'nearest' })
  }, [current])

  function choose(index) {
    onClose(true)
    items[index].run()
  }

  function handleKey(event) {
    const moves = { ArrowDown: (current + 1) % items.length, ArrowUp: (current + items.length - 1) % items.length, Home: 0, End: items.length - 1 }
    if (Object.hasOwn(moves, event.key)) {
      event.preventDefault()
      setActive(moves[event.key])
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(current)
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      event.stopPropagation()
      onClose(true)
    }
  }

  return createPortal(
    <ul id={menuId} ref={menuRef} popover="manual" className="popover-panel context-menu picker" role="menu" aria-label={label}
      aria-activedescendant={`${menuId}-${current}`} tabIndex={-1} onKeyDown={handleKey}
      onContextMenu={event => event.preventDefault()}>
      {items.map(({ label: text, icon: Icon, danger }, index) => (
        <li key={text} id={`${menuId}-${index}`} role="menuitem"
          className={[current === index && 'is-active', danger && 'is-danger'].filter(Boolean).join(' ') || undefined}
          onPointerMove={event => { if (event.pointerType === 'mouse') setActive(index) }}
          onClick={() => choose(index)}>
          <Icon {...iconProps} /><span className="picker-label">{text}</span>
        </li>
      ))}
    </ul>,
    anchor.trigger.closest('dialog[open]') ?? document.body,
  )
}

export default function ContextLink({ name, openLabel = 'Open', actions = [], showActions = false, children, ...linkProps }) {
  const { showToast } = useShell()
  const locationKey = useLocation().key
  const menuId = useId()
  const [anchor, setAnchor] = useState(null)
  if (anchor && anchor.locationKey !== locationKey) setAnchor(null)
  const linkRef = useRef(null)
  const label = name ? `Actions for ${name}` : 'Link actions'
  const close = useCallback(restoreFocus => {
    setAnchor(null)
    if (restoreFocus === true) anchor?.trigger.focus({ preventScroll: true })
  }, [anchor])

  function open(event, alignEnd = false) {
    event.preventDefault()
    const trigger = event.currentTarget
    if (anchor?.trigger === trigger && alignEnd) return close(true)
    const box = trigger.getBoundingClientRect()
    setAnchor({
      trigger,
      locationKey,
      alignEnd,
      x: alignEnd ? box.right : event.clientX || box.left,
      y: alignEnd ? box.bottom + 4 : event.clientY || box.bottom,
    })
  }

  function handleKey(event) {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) open(event)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(linkRef.current.href)
      showToast('Link copied')
    } catch {
      showToast('Could not copy the link')
    }
  }

  const items = [
    { label: openLabel, icon: ArrowUpRight, run: () => linkRef.current?.click() },
    { label: 'Copy link', icon: Link2, run: copyLink },
    ...actions,
  ]
  const link = (
    <Link {...linkProps} ref={linkRef} onContextMenu={open} onKeyDown={handleKey}
      aria-haspopup="menu" aria-expanded={Boolean(anchor && !anchor.alignEnd)}
      aria-controls={anchor && !anchor.alignEnd ? menuId : undefined}>
      {children}
    </Link>
  )
  const menu = anchor && <LinkMenu anchor={anchor} label={label} menuId={menuId} items={items} onClose={close} />

  return showActions ? (
    <div className="context-link-row">
      {link}
      <button type="button" className="icon-button context-link-button" aria-label={label} aria-haspopup="menu"
        aria-expanded={Boolean(anchor?.alignEnd)} aria-controls={anchor?.alignEnd ? menuId : undefined}
        onClick={event => open(event, true)}>
        <MoreHorizontal {...iconProps} />
      </button>
      {menu}
    </div>
  ) : <>{link}{menu}</>
}
