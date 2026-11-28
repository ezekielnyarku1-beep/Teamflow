import { Ban, ListTree } from 'lucide-react'
import { iconProps } from '../lib/icons.js'

// Small markers shown on issue rows and board cards: blocked by an unfinished issue, and sub-issue progress.
export default function IssueMarkers({ issue }) {
  if (!issue.blocked && !issue.subIssues) return null
  return (
    <span className="issue-markers">
      {issue.blocked && (
        <span className="issue-marker is-blocked" title="Blocked by an unfinished issue">
          <Ban {...iconProps} size={14} />
          Blocked
        </span>
      )}
      {issue.subIssues && (
        <span className="issue-marker" title={`${issue.subIssues.done} of ${issue.subIssues.total} sub-issues done`}>
          <ListTree {...iconProps} size={14} />
          {issue.subIssues.done}/{issue.subIssues.total}
        </span>
      )}
    </span>
  )
}

export function markersText(issue) {
  return [
    issue.blocked && 'blocked',
    issue.subIssues && `${issue.subIssues.done} of ${issue.subIssues.total} sub-issues done`,
  ].filter(Boolean).map(text => `, ${text}`).join('')
}
