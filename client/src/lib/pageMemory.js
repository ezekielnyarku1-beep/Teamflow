const storageKey = (kind, locationKey) => `overview-teams-${kind}-${locationKey}`

export function remember(kind, locationKey, value) {
  try {
    window.sessionStorage.setItem(storageKey(kind, locationKey), JSON.stringify(value))
  } catch {
    return false
  }
  return true
}

export function recall(kind, locationKey) {
  try {
    return JSON.parse(window.sessionStorage.getItem(storageKey(kind, locationKey)))
  } catch {
    return null
  }
}
