import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import Avatar from './Avatar.jsx'
import Dialog from './Dialog.jsx'
import PriorityIcon from './PriorityIcon.jsx'
import StatusIcon from './StatusIcon.jsx'
import { priorities, priorityLabel, statusLabel, statuses } from '../lib/issueOptions.js'
import { useLabels, useMe, useProjects, useTeam } from '../lib/queries.js'
import { iconProps } from '../lib/icons.js'
import './contextMenu.css'

const edgeGap = 8
const fieldItems = [
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'labels', label: 'Labels' },
  { key: 'project', label: 'Project' },
]

function placeOnScreen(element, left, top) {
  const { width, height } = element.getBoundingClientRect()
  element.style.left = `${Math.max(edgeGap, Math.min(left, window.innerWidth - width - edgeGap))}px`
  element.style.top = `${Math.max(edgeGap, Math.min(top, window.innerHeight - height - edgeGap))}px`
}

function useSubmenuOptions(issue, key) {
  const team = useTeam(issue.team.key)
  const labels = useLabels()
  const projects = useProjects({ team: issue.team.key })
  const labelIds = issue.labels.map(label => label.id)

  const options = {
    status: statuses.map(status => ({
      value: status.value,
      label: status.label,
      icon: <StatusIcon status={status.value} />,
      selected: issue.status === status.value,
    })),
    priority: priorities.map(priority => ({
      value: priority.value,
      label: priority.label,
      icon: <PriorityIcon priority={priority.value} />,
      selected: issue.priority === priority.value,
    })),
    assignee: [
      { value: null, label: 'No assignee', selected: !issue.assignee },
      ...(team.data?.members ?? []).map(member => ({
        value: member.id,
        label: member.name,
        icon: <Avatar name={member.name} />,
        selected: issue.assignee?.id === member.id,
      })),
    ],
    labels: (labels.data ?? []).map(label => ({
      value: label.id,
      label: label.name,
      icon: <span className="label-dot" style={{ background: label.color }} aria-hidden="true" />,
      selected: labelIds.includes(label.id),
    })),
    project: [
      { value: null, label: 'No project', selected: !issue.project },
      ...(projects.data ?? []).map(project => ({ value: project.id, label: project.name, selected: issue.project?.id === project.id })),
    ],
    copy: [
      { value: 'id', label: 'Copy ID' },
      { value: 'link', label: 'Copy link' },
    ],
  }
  const loading = { assignee: team.isPending, labels: labels.isPending, project: projects.isPending }
  return { options: key ? options[key] : [], loading: Boolean(loading[key]) }
}

function Submenu({ issue, item, menuRef, anchorIndex, onPick, onBack }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const { options, loading } = useSubmenuOptions(issue, item.key)
  const shown = options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()))
  const current = Math.min(active, Math.max(shown.length - 1, 0))
  const searchable = item.key !== 'copy'

  useLayoutEffect(() => {
    const panel = panelRef.current
    const menu = menuRef.current.getBoundingClientRect()
    const row = menuRef.current.children[anchorIndex].getBoundingClientRect()
    const { width } = panel.getBoundingClientRect()
    const right = menu.right + 4
    placeOnScreen(panel, right + width + edgeGap > window.innerWidth ? menu.left - width - 4 : right, row.top - 5)
  }, [menuRef, anchorIndex, shown.length])

  useEffect(() => {
    (searchRef.current ?? panelRef.current).focus()
  }, [])

  function handleKey(event) {
    const moves = { ArrowDown: current + 1, ArrowUp: current - 1 }
    if (event.key in moves) {
      event.preventDefault()
      setActive(Math.min(Math.max(moves[event.key], 0), shown.length - 1))
    } else if (event.key === 'Enter' && shown[current]) {
      event.preventDefault()
      onPick(item.key, shown[current])
    } else if (event.key === 'Escape' || (event.key === 'ArrowLeft' && !query)) {
      event.preventDefault()
      event.stopPropagation()
      onBack()
    } else if (/^[0-9]$/.test(event.key) && !query && shown[Number(event.key)]) {
      event.preventDefault()
      onPick(item.key, shown[Number(event.key)])
    }
  }

  return (
    <div ref={panelRef} className="popover-panel context-menu context-submenu" tabIndex={-1} onKeyDown={handleKey}>
      {searchable && (
        <input
          ref={searchRef}
          className="input context-menu-search"
          placeholder={`Change ${item.label.toLowerCase()}…`}
          aria-label={`Search ${item.label.toLowerCase()}`}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setActive(0)
          }}
        />
      )}
      {loading && <p className="picker-empty">Loading…</p>}
      {!loading && !shown.length && <p className="picker-empty">No matches.</p>}
      <ul className="picker" role="menu" aria-label={item.label}>
        {shown.map((option, index) => (
          <li
            key={option.value ?? 'none'}
            role={item.key === 'copy' ? 'menuitem' : item.key === 'labels' ? 'menuitemcheckbox' : 'menuitemradio'}
            aria-checked={item.key === 'copy' ? undefined : Boolean(option.selected)}
            className={index === current ? 'is-active' : undefined}
            onPointerMove={() => setActive(index)}
            onClick={() => onPick(item.key, option)}
          >
            {option.icon}
            <span className="picker-label">{option.label}</span>
            {option.selected && <Check {...iconProps} className="picker-check" />}
            {index < 10 && searchable && <kbd aria-hidden="true">{index}</kbd>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function IssueContextMenu({ issue, x, y, onChange, onCopy, onOpen, onDelete, onClose }) {
  const me = useMe()
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const [active, setActive] = useState(0)
  const [openKey, setOpenKey] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const canDelete = me.data?.role === 'ADMIN' || issue.creatorId === me.data?.id

  const items = [
    ...fieldItems,
    { key: 'divider-1' },
    { key: 'copy', label: 'Copy' },
    { key: 'open', label: 'Open issue', run: () => onOpen(issue.identifier) },
    ...(canDelete ? [{ key: 'divider-2' }, { key: 'delete', label: 'Delete…', danger: true, run: () => setConfirming(true) }] : []),
  ]
  const choosable = items.map((item, index) => (item.label ? index : null)).filter(index => index !== null)
  const hasSubmenu = item => fieldItems.includes(item) || item.key === 'copy'

  useLayoutEffect(() => {
    if (menuRef.current) placeOnScreen(menuRef.current, x, y)
  }, [x, y, confirming])

  useEffect(() => {
    if (!confirming) menuRef.current?.focus()
  }, [confirming])

  useEffect(() => {
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target)) onClose()
    }
    const closeOnScroll = event => {
      if (!rootRef.current?.contains(event.target)) onClose()
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  function choose(index) {
    const item = items[index]
    setActive(index)
    if (hasSubmenu(item)) setOpenKey(item.key)
    else item.run()
  }

  function backToMenu() {
    setOpenKey(null)
    menuRef.current?.focus()
  }

  function handleMenuKey(event) {
    if (confirming || openKey) return
    const position = choosable.indexOf(active)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive(choosable[(position + step + choosable.length) % choosable.length])
    } else if (event.key === 'Enter' || (event.key === 'ArrowRight' && hasSubmenu(items[active]))) {
      event.preventDefault()
      choose(active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
  }

  function pick(key, option) {
    if (key === 'copy') return onCopy(option.value)
    if (key === 'labels') {
      const ids = issue.labels.map(label => label.id)
      const next = option.selected ? ids.filter(id => id !== option.value) : [...ids, option.value]
      return onChange({ labelIds: next }, `Label ${option.label} ${option.selected ? 'removed' : 'added'}`, false)
    }
    const changes = {
      status: () => [{ status: option.value }, `Status changed to ${statusLabel(option.value)}`],
      priority: () => [{ priority: option.value }, `Priority changed to ${priorityLabel(option.value)}`],
      assignee: () => [{ assigneeId: option.value }, option.value ? `Assigned to ${option.label}` : 'Assignee removed'],
      project: () => [{ projectId: option.value }, option.value ? `Project changed to ${option.label}` : 'Project removed'],
    }[key]()
    onChange(...changes, true)
  }

  return createPortal(
    <div ref={rootRef} className="context-menu-root" onContextMenu={event => event.preventDefault()}>
      {confirming ? (
        <Dialog label="Delete issue" className="is-form" onClose={onClose}>
          <div className="dialog-form">
            <h2>Delete this issue?</h2>
            <p className="muted">
              {issue.identifier} {issue.title} will be deleted with its comments and history. This can&apos;t be undone.
            </p>
            <div className="dialog-actions">
              <button type="button" className="button" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="button is-danger" data-autofocus onClick={() => onDelete(issue.identifier)}>
                Delete issue
              </button>
            </div>
          </div>
        </Dialog>
      ) : (
        <ul
          ref={menuRef}
          className="popover-panel context-menu picker"
          role="menu"
          aria-label={`Actions for ${issue.identifier}`}
          tabIndex={-1}
          onKeyDown={handleMenuKey}
        >
          {items.map((item, index) =>
            item.label ? (
              <li
                key={item.key}
                role="menuitem"
                aria-haspopup={hasSubmenu(item) ? 'menu' : undefined}
                aria-expanded={hasSubmenu(item) ? openKey === item.key : undefined}
                className={[index === active && 'is-active', item.danger && 'is-danger'].filter(Boolean).join(' ') || undefined}
                onPointerEnter={() => {
                  setActive(index)
                  setOpenKey(hasSubmenu(item) ? item.key : null)
                }}
                onClick={() => choose(index)}
              >
                <span className="picker-label">{item.label}</span>
                {hasSubmenu(item) && <span className="context-menu-arrow" aria-hidden="true">›</span>}
              </li>
            ) : (
              <li key={item.key} role="separator" className="context-menu-divider" />
            ),
          )}
        </ul>
      )}
      {!confirming && openKey && (
        <Submenu
          key={openKey}
          issue={issue}
          item={items.find(item => item.key === openKey)}
          menuRef={menuRef}
          anchorIndex={items.findIndex(item => item.key === openKey)}
          onPick={pick}
          onBack={backToMenu}
        />
      )}
    </div>,
    document.body,
  )
}
