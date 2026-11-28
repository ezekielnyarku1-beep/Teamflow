import { useRef } from 'react'
import { Link } from 'react-router'
import { prefetchIssue } from '../lib/queries.js'
import ContextLink from './ContextLink.jsx'

export default function IssueLink({ identifier, contextActions = false, ...props }) {
  const timer = useRef(0)
  const IssueAnchor = contextActions ? ContextLink : Link
  return (
    <IssueAnchor
      to={`/issue/${identifier}`}
      {...(contextActions && { name: identifier, openLabel: 'Open issue' })}
      onPointerEnter={() => {
        timer.current = setTimeout(() => prefetchIssue(identifier), 80)
      }}
      onPointerLeave={() => clearTimeout(timer.current)}
      onFocus={() => prefetchIssue(identifier)}
      {...props}
    />
  )
}
