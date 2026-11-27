import EmptyState from './EmptyState.jsx'
import { Options } from './EmptyPictures.jsx'
import { useEffect, useId, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { iconProps } from '../lib/icons.js'
import Popover from './Popover.jsx'

function PickerList({ label, options, value, multiple, onPick }) {
  const listId = useId()
  const listRef = useRef(null)
  const selectedIndex = options.findIndex(option => (multiple ? value.includes(option.value) : option.value === value))
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0))
  const active = Math.min(activeIndex, Math.max(0, options.length - 1))

  useEffect(() => {
    listRef.current?.focus()
  }, [options.length])

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [listId, active])

  const isSelected = option => (multiple ? value.includes(option.value) : option.value === value)

  function moveWithKeys(event) {
    const moves = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: options.length - 1 }
    if (event.key in moves) {
      event.preventDefault()
      setActiveIndex(Math.min(Math.max(moves[event.key], 0), options.length - 1))
    } else if ((event.key === 'Enter' || event.key === ' ') && options[active]) {
      event.preventDefault()
      onPick(options[active].value)
    }
  }

  if (!options.length) return <EmptyState illustration={Options} title="No options yet" description="Available choices will appear here." compact />

  return (
    <ul
      ref={listRef}
      className="picker"
      role="listbox"
      tabIndex={-1}
      aria-label={label}
      aria-multiselectable={multiple || undefined}
      aria-activedescendant={`${listId}-${active}`}
      onKeyDown={moveWithKeys}
    >
      {options.map((option, index) => (
        <li
          key={option.value}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={isSelected(option)}
          className={index === active ? 'is-active' : undefined}
          onPointerMove={event => {
            if (event.pointerType === 'mouse') setActiveIndex(index)
          }}
          onClick={event => { event.preventDefault(); onPick(option.value) }}
        >
          {option.icon}
          <span className="picker-label">{option.label}</span>
          {isSelected(option) && <Check {...iconProps} className="picker-check" />}
        </li>
      ))}
    </ul>
  )
}

export default function Picker({ label, options, value, onChange, multiple = false, buttonContent, buttonClassName, triggerProps }) {
  return (
    <Popover triggerProps={triggerProps} label={label} buttonContent={buttonContent} buttonClassName={buttonClassName}>
      {close => (
        <PickerList
          label={label}
          options={options}
          value={value}
          multiple={multiple}
          onPick={picked => {
            if (multiple) {
              onChange(value.includes(picked) ? value.filter(item => item !== picked) : [...value, picked])
            } else {
              onChange(picked)
              close()
            }
          }}
        />
      )}
    </Popover>
  )
}
