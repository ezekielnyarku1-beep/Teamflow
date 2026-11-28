import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Activity, ArrowLeft, Check, ChevronRight, MessageSquare, Plus, UsersRound } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import ContextLink from '../components/ContextLink.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { People } from '../components/EmptyPictures.jsx'
import QueryState from '../components/QueryState.jsx'
import { describeChange, startOfToday, timeAgo } from '../lib/activityText.js'
import { countOf, formatDateTime } from '../lib/format.js'
import { iconProps } from '../lib/icons.js'
import { useTeamMomentum } from '../lib/queries.js'
import './momentum.css'

const memberLimit = 5
const activityLimit = 5
const issueMarker = '\u0000'
const dateRange = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function Summary({ total, active, done, actions }) {
  return (
    <dl className="momentum-summary" aria-label="Team summary">
      <div className="momentum-stat is-people">
        <dt><UsersRound {...iconProps} />Active today</dt>
        <dd><strong>{active}</strong><span>of {countOf(total, 'member')}</span></dd>
      </div>
      <div className="momentum-stat is-completed">
        <dt><Check {...iconProps} />Marked done</dt>
        <dd><strong>{done}</strong><span>Last 7 days</span></dd>
      </div>
      <div className="momentum-stat is-updates">
        <dt><Activity {...iconProps} />Updates logged</dt>
        <dd><strong>{actions}</strong><span>Last 7 days</span></dd>
      </div>
    </dl>
  )
}

function Members({ members, activeCount }) {
  const [activeOnly, setActiveOnly] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const matching = activeOnly ? members.filter(member => member.actionsToday > 0) : members
  const shown = expanded ? matching : matching.slice(0, memberLimit)

  function filter(onlyActive) {
    setActiveOnly(onlyActive)
    setExpanded(false)
  }

  return (
    <section className="momentum-card" aria-labelledby="momentum-members">
      <header className="momentum-card-header">
        <div>
          <h2 id="momentum-members">Team members</h2>
          <p>Activity over the last 7 days</p>
        </div>
        <div className="segmented momentum-filter" role="group" aria-label="Filter team members">
          <button type="button" aria-pressed={!activeOnly} onClick={() => filter(false)}>All <span>{members.length}</span></button>
          <button type="button" aria-pressed={activeOnly} onClick={() => filter(true)}>Active today <span>{activeCount}</span></button>
        </div>
      </header>
      {shown.length ? (
        <ul id="momentum-member-list" className="momentum-members" role="list">
          {shown.map(member => (
            <li key={member.id}>
              <ContextLink to={`/people/${member.id}`} className="momentum-person"
                name={member.name} openLabel="Open activity">
                <Avatar name={member.name} />
                <span className="momentum-person-name">
                  <strong>{member.name}</strong>
                  {member.actionsToday > 0 ? <span className="momentum-active">Active today</span> : member.lastActiveAt ? (
                    <span>Last active <time dateTime={member.lastActiveAt} title={formatDateTime(member.lastActiveAt)}>{timeAgo(member.lastActiveAt)}</time></span>
                  ) : <span>No activity yet</span>}
                </span>
                <span className="momentum-person-counts">
                  <span>{countOf(member.actionsThisWeek, 'update')}</span>
                  {member.doneThisWeek > 0 && <span className="momentum-done">{member.doneThisWeek} done</span>}
                </span>
                <ChevronRight {...iconProps} className="momentum-person-arrow" />
              </ContextLink>
            </li>
          ))}
        </ul>
      ) : <p className="momentum-message" role="status">No activity recorded today.</p>}
      {matching.length > memberLimit && (
        <div className="momentum-card-footer">
          <button type="button" className="button" aria-expanded={expanded} aria-controls="momentum-member-list"
            onClick={() => setExpanded(value => !value)}>
            {expanded ? 'Show fewer members' : `Show all ${matching.length} members`}
          </button>
        </div>
      )}
    </section>
  )
}

function ActivityItem({ event }) {
  const completed = event.field === 'status' && event.toValue === 'DONE'
  const kind = completed ? 'done' : event.kind
  const Icon = { done: Check, commented: MessageSquare, created: Plus }[kind] ?? Activity
  const { identifier } = event.issue
  const sentence = kind === 'commented' ? `commented on ${issueMarker}` : describeChange(event, issueMarker)
  const [before, after] = sentence.split(issueMarker)

  return (
    <li className="momentum-event">
      <span className={`momentum-event-icon is-${kind}`}><Icon {...iconProps} /></span>
      <div>
        <p>
          <strong>{event.memberName}</strong> {before}
          <ContextLink to={`/issue/${identifier}`} name={identifier} openLabel="Open issue">{identifier}</ContextLink>
          {after}
        </p>
        <time dateTime={event.at} title={formatDateTime(event.at)}>{timeAgo(event.at)}</time>
      </div>
    </li>
  )
}

function RecentActivity({ events }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? events : events.slice(0, activityLimit)

  return (
    <section className="momentum-card" aria-labelledby="momentum-recent">
      <header className="momentum-card-header">
        <div>
          <h2 id="momentum-recent">Recent activity</h2>
          <p>Issue updates and comments</p>
        </div>
      </header>
      {shown.length ? (
        <ol id="momentum-event-list" className="momentum-events" role="list">
          {shown.map(event => <ActivityItem key={`${event.kind}-${event.id}`} event={event} />)}
        </ol>
      ) : <p className="momentum-message">New activity will appear here as the team works on issues.</p>}
      {events.length > activityLimit && (
        <div className="momentum-card-footer">
          <button type="button" className="button" aria-expanded={expanded} aria-controls="momentum-event-list"
            onClick={() => setExpanded(value => !value)}>
            {expanded ? 'Show less activity' : 'Show more activity'}
          </button>
        </div>
      )}
    </section>
  )
}

function Momentum({ data, today }) {
  const { team, since } = data
  const members = [...data.members].sort((a, b) =>
    (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '') || a.name.localeCompare(b.name),
  )
  const activeCount = members.filter(member => member.actionsToday > 0).length
  const actions = members.reduce((sum, member) => sum + member.actionsThisWeek, 0)
  const done = members.reduce((sum, member) => sum + member.doneThisWeek, 0)
  const events = members.flatMap(member => member.recent.map(event => ({ ...event, memberName: member.name })))
    .sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="momentum-content">
      <header className="momentum-heading">
        <div>
          <Link to={`/team/${team.key}`} className="momentum-team">
            <ArrowLeft {...iconProps} />{team.name}
          </Link>
          <h1>Momentum</h1>
        </div>
        {since && <span className="momentum-dates">{dateRange.formatRange(new Date(since), new Date(today))}</span>}
      </header>
      {members.length ? (
        <>
          <Summary total={members.length} active={activeCount} done={done} actions={actions} />
          <div className="momentum-columns">
            <Members members={members} activeCount={activeCount} />
            <RecentActivity events={events} />
          </div>
        </>
      ) : (
        <EmptyState illustration={People} heading="h2" title="No team members yet"
          description="Add members under Teams in Settings to see activity here." />
      )}
    </div>
  )
}

export default function TeamMomentumPage() {
  const { teamKey } = useParams()
  const [today] = useState(startOfToday)
  const momentum = useTeamMomentum(teamKey, today)

  return (
    <QueryState query={momentum} label="team momentum">
      {data => <Momentum data={data} today={today} key={data.team.key} />}
    </QueryState>
  )
}
