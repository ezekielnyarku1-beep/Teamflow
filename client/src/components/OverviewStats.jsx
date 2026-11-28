import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { formatShortDate } from '../lib/format.js'
import { iconProps } from '../lib/icons.js'
import { useIssueStats } from '../lib/queries.js'

function Tile({ label, value, warn }) {
  return (
    <div className={warn ? 'stat-tile is-warning' : 'stat-tile'}>
      <span className="stat-label">
        {warn && <TriangleAlert {...iconProps} className="stat-icon" />}
        {label}
      </span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

// Issues finished per week, Monday to Sunday, for the last 8 weeks. One series, so no legend: the title names it.
function DonePerWeek({ weeks }) {
  const [hovered, setHovered] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...weeks.map(week => week.count))
  const total = weeks.reduce((sum, week) => sum + week.count, 0)
  const last = weeks.length - 1

  return (
    <section className="stat-chart" aria-labelledby="done-per-week-heading">
      <div className="stat-chart-head">
        <h2 id="done-per-week-heading" className="stat-label">Done per week</h2>
        <button type="button" className="link-button stat-chart-toggle" onClick={() => setAsTable(value => !value)}>
          {asTable ? 'View as chart' : 'View as table'}
        </button>
      </div>
      {asTable ? (
        <table className="stat-table">
          <thead>
            <tr><th scope="col">Week of</th><th scope="col">Done</th></tr>
          </thead>
          <tbody>
            {weeks.map(week => (
              <tr key={week.weekStart}><td>{formatShortDate(week.weekStart)}</td><td>{week.count}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div className="bar-chart" role="img" aria-label={`${total} issues done in the last 8 weeks, ${weeks[last].count} this week. Use "View as table" for each week.`}>
            {weeks.map((week, index) => (
              <div
                key={week.weekStart}
                className="bar-slot"
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(current => (current === index ? null : current))}
                onClick={() => setHovered(current => (current === index ? null : index))}
              >
                {index === last && <span className="bar-value">{week.count}</span>}
                <span className={week.count ? 'bar' : 'bar is-zero'} style={{ height: `${(week.count / max) * 100}%` }} />
                {hovered === index && (
                  <span className={`bar-tooltip${index > last - 2 ? ' is-left' : ''}`} aria-hidden="true">
                    Week of {formatShortDate(week.weekStart)} · {week.count} done
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="bar-axis" aria-hidden="true">
            <span>{formatShortDate(weeks[0].weekStart)}</span>
            <span>This week</span>
          </div>
        </>
      )}
    </section>
  )
}

export default function OverviewStats({ scope }) {
  const stats = useIssueStats(scope)
  if (stats.isError) return null
  if (!stats.data) return <div className="overview-stats is-loading" aria-hidden="true" />
  const { open, inProgress, overdue, doneLast7Days, donePerWeek } = stats.data
  return (
    <div className="overview-stats" aria-label={scope === 'team' ? 'Team numbers' : 'My numbers'} role="group">
      <Tile label="Open" value={open} />
      <Tile label="In progress" value={inProgress} />
      <Tile label="Overdue" value={overdue} warn={overdue > 0} />
      <Tile label="Done in last 7 days" value={doneLast7Days} />
      <DonePerWeek weeks={donePerWeek} />
    </div>
  )
}
