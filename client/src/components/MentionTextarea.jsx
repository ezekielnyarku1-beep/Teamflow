import { useId, useLayoutEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'

const mentionBeforeCaret = /(^|[\s(])@([^@\n]{0,40})$/

// A textarea that suggests people after "@". Picking one inserts "@Full Name ", which the server turns into a
// mention notification.
export default function MentionTextarea({ value, onChange, people = [], onKeyDown, ...props }) {
  const ref = useRef(null)
  const pendingCaret = useRef(null)
  const listId = useId()
  const [mention, setMention] = useState(null)
  const [active, setActive] = useState(0)

  const matches = mention
    ? people.filter(person => person.name.toLowerCase().startsWith(mention.query.toLowerCase())).slice(0, 6)
    : []
  const open = matches.length > 0
  const current = Math.min(active, Math.max(0, matches.length - 1))

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return
    ref.current.focus({ preventScroll: true })
    ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
    pendingCaret.current = null
  }, [mention, value])

  function findMention(text, caret) {
    const found = mentionBeforeCaret.exec(text.slice(0, caret))
    setMention(found ? { start: caret - found[2].length - 1, query: found[2] } : null)
    setActive(0)
  }

  function choose(person) {
    const before = value.slice(0, mention.start)
    const after = value.slice(ref.current.selectionStart)
    const rest = after.replace(/^[\p{L}\p{M}\p{N}_'’-]+/u, '')
    const separator = /^[\s.,!?;:)\]]/.test(rest) ? '' : ' '
    const inserted = `@${person.name}${separator}`
    pendingCaret.current = before.length + inserted.length + (/^ /.test(rest) ? 1 : 0)
    onChange(before + inserted + rest)
    setMention(null)
  }

  function handleKeyDown(event) {
    if (open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((current + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        choose(matches[current])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setMention(null)
        return
      }
    }
    onKeyDown?.(event)
  }

  return (
    <div className="mention-field">
      <textarea
        {...props}
        ref={ref}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${current}` : undefined}
        onChange={event => {
          onChange(event.target.value)
          findMention(event.target.value, event.target.selectionStart)
        }}
        onClick={event => findMention(event.target.value, event.target.selectionStart)}
        onBlur={() => setMention(null)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul id={listId} className="suggestion-panel picker" role="listbox" aria-label="People to mention">
          {matches.map((person, index) => (
            <li
              key={person.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === current}
              className={index === current ? 'is-active' : undefined}
              onMouseDown={event => event.preventDefault()}
              onClick={() => choose(person)}
              onPointerMove={event => { if (event.pointerType === 'mouse') setActive(index) }}
            >
              <Avatar name={person.name} />
              <span className="picker-label">{person.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Shows a comment with "@Full Name" highlighted for people in the team.
export function MentionText({ text, people = [] }) {
  const names = people.map(person => person.name.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
  if (!names.length) return text
  const pattern = new RegExp(`(^|[\\s(])(@(?:${names.map(escapeRegExp).join('|')}))(?=$|[\\s.,!?;:)])`, 'gi')
  const parts = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index + match[1].length
    parts.push(text.slice(last, start), <span key={start} className="mention">{match[2]}</span>)
    last = start + match[2].length
  }
  parts.push(text.slice(last))
  return parts
}
