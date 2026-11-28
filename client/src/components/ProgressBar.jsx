// Done and in-progress share of a project's or cycle's issues.
export default function ProgressBar({ progress }) {
  const { issueCount, activeCount, doneCount, inProgressCount = 0, donePercent, inProgressPercent } = progress

  if (issueCount === 0 || activeCount === 0) {
    return (
      <div className="progress is-empty">
        <span className="progress-caption">No issues yet</span>
      </div>
    )
  }

  const summary = `${doneCount} of ${activeCount} done${inProgressCount ? ` · ${inProgressCount} in progress` : ''}`

  return (
    <div className={donePercent === 100 ? 'progress is-complete' : 'progress'} title={summary}>
      <div className="progress-bar">
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={donePercent}
          aria-valuetext={`${donePercent}% done, ${inProgressPercent}% in progress`}
        >
          {donePercent > 0 && <span className="progress-done" style={{ width: `${donePercent}%` }} />}
          {inProgressPercent > 0 && <span className="progress-active" style={{ width: `${inProgressPercent}%` }} />}
        </div>
        <span className="progress-percent" aria-hidden="true">{donePercent}%</span>
      </div>
      <span className="progress-caption" aria-hidden="true">
        <span className="progress-key is-done">{doneCount} of {activeCount} done</span>
        {inProgressCount > 0 && <span className="progress-key is-active">{inProgressCount} in progress</span>}
      </span>
    </div>
  )
}
