import { useCallback, useState } from 'react'
import { useLocation } from 'react-router'

export function useIssueMenu(issues) {
  const locationKey = useLocation().key
  const [anchor, setAnchor] = useState(null)
  if (anchor && anchor.locationKey !== locationKey) setAnchor(null)
  const closeIssueMenu = useCallback(() => setAnchor(null), [])
  const issue = anchor && issues?.find(item => item.identifier === anchor.identifier)

  function openIssueMenu(item, event) {
    event.preventDefault()
    const target = event.currentTarget
    const box = target.getBoundingClientRect()
    const trigger = target.contains(document.activeElement) ? document.activeElement : target
    setAnchor({ identifier: item.identifier, x: event.clientX || box.left + 16, y: event.clientY || box.bottom, trigger, locationKey })
  }

  return { openIssueMenu, closeIssueMenu, issue, anchor }
}
