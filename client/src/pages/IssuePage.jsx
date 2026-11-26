import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import IssueDetail from '../components/IssueDetail.jsx'
import { iconProps } from '../lib/icons.js'
import { useTeam } from '../lib/queries.js'

const isTypingIn = target => target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')
const somethingOpen = () => document.querySelector('dialog[open], .context-menu, .popover-panel:popover-open')

export default function IssuePage() {
  const { identifier } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const teamKey = identifier.split('-')[0]
  const team = useTeam(teamKey)
  const teamPath = `/team/${teamKey}`
  const cameFromApp = location.key !== 'default'

  useEffect(() => {
    function backOnEscape(event) {
      if (event.key !== 'Escape' || event.defaultPrevented || somethingOpen()) return
      if (isTypingIn(event.target)) return event.target.blur()
      if (cameFromApp) navigate(-1)
      else navigate(teamPath)
    }
    document.addEventListener('keydown', backOnEscape)
    return () => document.removeEventListener('keydown', backOnEscape)
  }, [cameFromApp, navigate, teamPath])

  return (
    <div className="issue-page">
      <nav className="issue-page-bar" aria-label="Breadcrumb">
        <Link
          to={teamPath}
          className="button"
          onClick={event => {
            if (!cameFromApp || event.ctrlKey || event.metaKey || event.shiftKey) return
            event.preventDefault()
            navigate(-1)
          }}
        >
          <ArrowLeft {...iconProps} />
          Back
        </Link>
        <ol className="breadcrumb">
          <li>
            <Link to={teamPath}>{team.data?.name ?? teamKey}</Link>
          </li>
          <li aria-current="page">{identifier}</li>
        </ol>
      </nav>
      <IssueDetail key={identifier} identifier={identifier} />
    </div>
  )
}
