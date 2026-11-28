import { useParams } from 'react-router'
import Avatar from '../components/Avatar.jsx'
import ContextLink from '../components/ContextLink.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Activity } from '../components/EmptyPictures.jsx'
import PageHeader from '../components/PageHeader.jsx'
import QueryState from '../components/QueryState.jsx'
import StatusIcon from '../components/StatusIcon.jsx'
import { dayHeading, describeChange } from '../lib/activityText.js'
import { countOf } from '../lib/format.js'
import { useMe, usePerson } from '../lib/queries.js'
import './activity.css'

const issueMark = '\u0000'

// One line of the feed, with the issue identifier as a link.
function EventText({ event }) {
  const { identifier } = event.issue
  const issue = (
    <ContextLink to={`/issue/${identifier}`} className="activity-issue" name={identifier} openLabel="Open issue">
      {identifier}
    </ContextLink>
  )
  if (event.kind === 'commented') {
    return <>commented on {issue}: <span className="activity-quote">&ldquo;{event.body}&rdquo;</span></>
  }
  const [before, after = ''] = describeChange(event, issueMark).split(issueMark)
  return <>{before}{issue}{after}</>
}

function groupByDay(events) {
  const days = new Map()
  for (const event of events) {
    const day = new Date(event.at).toLocaleDateString('en-CA')
    if (!days.has(day)) days.set(day, [])
    days.get(day).push(event)
  }
  return [...days]
}

// What one member did in the app over the last 14 days, recorded automatically from their issues, changes and comments.
export default function PersonPage() {
  const { userId } = useParams()
  const me = useMe()
  const person = usePerson(userId)
  const isMe = me.data?.id === userId

  return (
    <div className="activity-page">
      <QueryState query={person} label="this person's activity">
        {data => {
          const days = groupByDay(data.events)
          const done = data.events.filter(event => event.field === 'status' && event.toValue === 'DONE').length
          const comments = data.events.filter(event => event.kind === 'commented').length
          return (
            <>
              <PageHeader title={isMe ? 'My activity' : data.name} meta={data.teams.map(team => team.name).join(' · ') || 'No shared teams'} />
              <div className="activity-content">
                <section className="person-summary" aria-label="Last 14 days">
                  <Avatar name={data.name} />
                  <div className="person-numbers">
                    <span><strong>{data.events.length}</strong> {data.events.length === 1 ? 'action' : 'actions'}</span>
                    <span><strong>{done}</strong> completed</span>
                    <span><strong>{comments}</strong> {comments === 1 ? 'comment' : 'comments'}</span>
                    <span className="muted">in the last 14 days</span>
                  </div>
                </section>
                {days.length === 0 ? (
                  <EmptyState
                    illustration={Activity}
                    title="No activity in the last 14 days"
                    description="Creating issues, changing them and commenting all show up here automatically."
                  />
                ) : (
                  days.map(([day, events]) => (
                    <section key={day} className="activity-day" aria-labelledby={`day-${day}`}>
                      <h2 id={`day-${day}`}>
                        {dayHeading(day)} <span className="muted">· {countOf(events.length, 'action')}</span>
                      </h2>
                      <ol className="activity-feed">
                        {events.map(event => (
                          <li key={event.id} className={`activity-event is-${event.kind}`}>
                            <StatusIcon status={event.issue.status} />
                            <span className="activity-text">
                              <EventText event={event} />
                              <span className="activity-issue-title muted"> · {event.issue.title}</span>
                            </span>
                            <time className="muted" dateTime={event.at}>
                              {new Date(event.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </time>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))
                )}
              </div>
            </>
          )
        }}
      </QueryState>
    </div>
  )
}
