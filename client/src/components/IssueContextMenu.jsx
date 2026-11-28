import EmptyState from './EmptyState.jsx'
import { Search } from './EmptyPictures.jsx'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, CircleDot, Copy, Flag, Folder, Tag, Trash2, UserRound } from 'lucide-react'
import Avatar from './Avatar.jsx'
import Dialog from './Dialog.jsx'
import PriorityIcon from './PriorityIcon.jsx'
import StatusIcon from './StatusIcon.jsx'
import { priorities, priorityLabel, statusLabel, statuses } from '../lib/issueOptions.js'
import { useDeleteIssue, useLabels, useMe, useProjects, useTeam, useUpdateIssue } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'
import { iconProps } from '../lib/icons.js'
import './contextMenu.css'

const edgeGap = 8
const compactMenu = () => window.matchMedia('(max-width: 768px), (pointer: coarse)').matches
const fieldItems = [
  { key: 'status', label: 'Status', icon: CircleDot },
  { key: 'priority', label: 'Priority', icon: Flag },
  { key: 'assignee', label: 'Assignee', icon: UserRound },
  { key: 'labels', label: 'Labels', icon: Tag },
  { key: 'project', label: 'Project', icon: Folder },
]

function placeOnScreen(element, left, top) {
  element.style.left = `${Math.max(edgeGap, Math.min(left, document.documentElement.clientWidth - element.offsetWidth - edgeGap))}px`
  element.style.top = `${Math.max(edgeGap, Math.min(top, document.documentElement.clientHeight - element.offsetHeight - edgeGap))}px`
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

function Submenu({ issue, item, menuRef, anchorIndex, onPick, onBack, onTabOut }) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const panelRef = useRef(null)
  const backRef = useRef(null)
  const searchRef = useRef(null)
  const { options, loading } = useSubmenuOptions(issue, item.key)
  const shown = options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()))
  const current = Math.min(active, Math.max(shown.length - 1, 0))
  const searchable = item.key !== 'copy'

  useLayoutEffect(() => {
    const panel = panelRef.current
    const menu = menuRef.current.getBoundingClientRect()
    if (compactMenu()) {
      placeOnScreen(panel, menu.left, menu.top)
      return
    }
    const row = menuRef.current.children[anchorIndex].getBoundingClientRect()
    const width = panel.offsetWidth
    const right = menu.right + 4
    placeOnScreen(panel, right + width + edgeGap > document.documentElement.clientWidth ? menu.left - width - 4 : right, row.top - 5)
  }, [menuRef, anchorIndex, shown.length])

  useLayoutEffect(() => {
    const focusTarget = compactMenu() ? panelRef.current : searchRef.current ?? panelRef.current
    focusTarget.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    document.getElementById(`${listId}-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current, listId])

  function handleKey(event) {
    const moves = { ArrowDown: current + 1, ArrowUp: current - 1 }
    const searching = event.target === searchRef.current
    if (event.key === 'Tab') {
      const edge = event.shiftKey
        ? event.target === backRef.current || event.target === panelRef.current
        : event.target === (searchRef.current ?? backRef.current)
      if (!compactMenu() || edge) onTabOut(event)
      return
    }
    if (event.key in moves) {
      event.preventDefault()
      setActive(Math.max(0, Math.min(moves[event.key], shown.length - 1)))
    } else if (event.key === 'Enter' && shown[current] && event.target.tagName !== 'BUTTON') {
      event.preventDefault()
      onPick(item.key, shown[current])
    } else if (event.key === 'Escape' || (event.key === 'ArrowLeft' && !searching)) {
      event.preventDefault()
      event.stopPropagation()
      onBack()
    } else if (!searching && /^[0-9]$/.test(event.key) && !query && shown[Number(event.key)]) {
      event.preventDefault()
      onPick(item.key, shown[Number(event.key)])
    }
  }

  return (
    <div ref={panelRef} className="popover-panel context-menu context-submenu" tabIndex={-1} onKeyDown={handleKey}>
      <button ref={backRef} type="button" className="context-menu-back" onClick={onBack} aria-label={`Back to issue actions from ${item.label.toLowerCase()}`}>
        <ArrowLeft {...iconProps} /><span>{item.label}</span>
      </button>
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
      {!loading && !shown.length && <EmptyState illustration={Search} title="No matches" description="Try another search term." compact />}
      <ul id={listId} className="picker" role="menu" aria-label={item.label}>
        {shown.map((option, index) => (
          <li
            key={option.value ?? 'none'}
            id={`${listId}-${index}`}
            role={item.key === 'copy' ? 'menuitem' : item.key === 'labels' ? 'menuitemcheckbox' : 'menuitemradio'}
            aria-checked={item.key === 'copy' ? undefined : Boolean(option.selected)}
            className={index === current ? 'is-active' : undefined}
            onPointerMove={event => { if (event.pointerType === 'mouse') setActive(index) }}
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

export default function IssueContextMenu({ issue, x, y, trigger, onClose }) {
  const me = useMe()
  const navigate = useNavigate()
  const { showToast } = useShell()
  const update = useUpdateIssue()
  const remove = useDeleteIssue()
  const { identifier } = issue
  const menuId = useId()
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const [active, setActive] = useState(0)
  const [openKey, setOpenKey] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const canDelete = me.data?.role === 'ADMIN' || issue.creatorId === me.data?.id

  function dismiss() {
    if (confirming) rootRef.current?.querySelector('dialog[open]')?.close()
    onClose()
    trigger?.focus({ preventScroll: true })
  }

  function tabOut(event) {
    event.stopPropagation()
    dismiss()
  }

  function changeIssue(changes, message, close) {
    if (close) dismiss()
    showToast(message)
    update.mutateAsync({ identifier, changes }).catch(error => showToast(`${identifier} was not changed: ${error.message}`))
  }

  async function copyIssue(kind) {
    dismiss()
    try {
      await navigator.clipboard.writeText(kind === 'id' ? identifier : `${window.location.origin}/issue/${identifier}`)
      showToast(kind === 'id' ? `Copied ${identifier}` : 'Link copied')
    } catch {
      showToast('Your browser did not allow copying.')
    }
  }

  function openIssue() {
    onClose()
    navigate(`/issue/${identifier}`)
  }

  function deleteIssue() {
    onClose()
    remove.mutateAsync(identifier).then(
      () => showToast(`Deleted ${identifier}`),
      error => showToast(`${identifier} was not deleted: ${error.message}`),
    )
  }

  const items = [
    ...fieldItems,
    { key: 'divider-1' },
    { key: 'copy', label: 'Copy', icon: Copy },
    { key: 'open', label: 'Open issue', icon: ArrowUpRight, run: openIssue },
    ...(canDelete ? [{ key: 'divider-2' }, { key: 'delete', label: 'Delete…', icon: Trash2, danger: true, run: () => setConfirming(true) }] : []),
  ]
  const choosable = items.map((item, index) => (item.label ? index : null)).filter(index => index !== null)
  const current = Math.min(active, choosable.at(-1))
  const hasSubmenu = item => fieldItems.includes(item) || item.key === 'copy'

  useLayoutEffect(() => {
    if (menuRef.current) placeOnScreen(menuRef.current, x, y)
  }, [x, y, confirming])

  useLayoutEffect(() => {
    if (!confirming && !openKey) menuRef.current?.focus({ preventScroll: true })
  }, [confirming, openKey])

  useLayoutEffect(() => {
    menuRef.current?.children[current]?.scrollIntoView({ block: 'nearest' })
  }, [current])

  useEffect(() => {
    if (confirming) return undefined
    const closeOutside = event => {
      if (!(event.target instanceof Node && rootRef.current?.contains(event.target))) onClose()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('focusin', closeOutside)
    window.addEventListener('scroll', closeOutside, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('focusin', closeOutside)
      window.removeEventListener('scroll', closeOutside, true)
      window.removeEventListener('resize', onClose)
    }
  }, [confirming, onClose])

  function choose(index) {
    const item = items[index]
    setActive(index)
    if (hasSubmenu(item)) setOpenKey(item.key)
    else item.run()
  }

  function backToMenu() {
    setOpenKey(null)
  }

  function handleMenuKey(event) {
    if (confirming || openKey) return
    const position = choosable.indexOf(current)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive(choosable[(position + step + choosable.length) % choosable.length])
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActive(event.key === 'Home' ? choosable[0] : choosable.at(-1))
    } else if (event.key === 'Enter' || event.key === ' ' || (event.key === 'ArrowRight' && hasSubmenu(items[current]))) {
      event.preventDefault()
      choose(current)
    } else if (event.key === 'Tab') {
      tabOut(event)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    }
  }

  function pick(key, option) {
    if (key === 'copy') return copyIssue(option.value)
    if (key === 'labels') {
      const ids = issue.labels.map(label => label.id)
      const next = option.selected ? ids.filter(id => id !== option.value) : [...ids, option.value]
      return changeIssue({ labelIds: next }, `Label ${option.label} ${option.selected ? 'removed' : 'added'}`, false)
    }
    if (option.selected) return dismiss()
    const changes = {
      status: () => [{ status: option.value }, `Status changed to ${statusLabel(option.value)}`],
      priority: () => [{ priority: option.value }, `Priority changed to ${priorityLabel(option.value)}`],
      assignee: () => [{ assigneeId: option.value }, option.value ? `Assigned to ${option.label}` : 'Assignee removed'],
      project: () => [{ projectId: option.value }, option.value ? `Project changed to ${option.label}` : 'Project removed'],
    }[key]()
    changeIssue(...changes, true)
  }

  return createPortal(
    <div ref={rootRef} className="context-menu-root" data-submenu-open={Boolean(openKey)} onContextMenu={event => event.preventDefault()}>
      {confirming ? (
        <Dialog label="Delete issue" className="is-form" onClose={dismiss}>
          <div className="dialog-form">
            <h2>Delete this issue?</h2>
            <p className="muted">
              {issue.identifier} {issue.title} will be deleted with its comments and history. This can&apos;t be undone.
            </p>
            <div className="dialog-actions">
              <button type="button" className="button" data-autofocus onClick={dismiss}>
                Cancel
              </button>
              <button type="button" className="button is-danger" onClick={deleteIssue}>
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
          aria-activedescendant={`${menuId}-${current}`}
          tabIndex={-1}
          onKeyDown={handleMenuKey}
        >
          {items.map((item, index) =>
            item.label ? (
              <li
                key={item.key}
                id={`${menuId}-${index}`}
                role="menuitem"
                aria-haspopup={hasSubmenu(item) ? 'menu' : undefined}
                aria-expanded={hasSubmenu(item) ? openKey === item.key : undefined}
                className={[index === current && 'is-active', item.danger && 'is-danger'].filter(Boolean).join(' ') || undefined}
                onClick={() => choose(index)}
              >
                <item.icon {...iconProps} />
                <span className="picker-label">{item.label}</span>
                {hasSubmenu(item) && <ChevronRight {...iconProps} className="context-menu-arrow" />}
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
          onTabOut={tabOut}
        />
      )}
    </div>,
    document.body,
  )
}
