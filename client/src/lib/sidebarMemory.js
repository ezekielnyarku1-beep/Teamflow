import { useState } from 'react'

const storageKey = name => `overview-teams-sidebar-${name}`

function readList(name) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey(name)))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function useRememberedList(name) {
  const [list, setList] = useState(() => readList(name))

  function save(next) {
    setList(next)
    try {
      window.localStorage.setItem(storageKey(name), JSON.stringify(next))
    } catch {
      return
    }
  }

  return {
    has: item => list.includes(item),
    add: item => { if (!list.includes(item)) save([...list, item]) },
    toggle: item => save(list.includes(item) ? list.filter(other => other !== item) : [...list, item]),
  }
}
