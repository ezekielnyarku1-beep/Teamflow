import { useRef } from 'react'
import { Link } from 'react-router'
import { prefetchIssue } from '../lib/queries.js'

export default function IssueLink({ identifier, ...props }) {
  const timer = useRef(0)
  return (
    <Link
      to={`/issue/${identifier}`}
      onPointerEnter={() => {
        timer.current = setTimeout(() => prefetchIssue(identifier), 80)
      }}
      onPointerLeave={() => clearTimeout(timer.current)}
      onFocus={() => prefetchIssue(identifier)}
      {...props}
    />
  )
}
