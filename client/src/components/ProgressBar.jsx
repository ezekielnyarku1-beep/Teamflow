export default function ProgressBar({ progress }) {
  const summary = progress.issueCount === 0
    ? 'No issues yet'
    : <><span className="progress-text-done">{progress.donePercent}% done</span>
        {' · '}<span className="progress-text-active">{progress.inProgressPercent}% in progress</span></>

  return (
    <div className="progress">
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Done"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.donePercent}
      >
        <span className="progress-done" style={{ width: `${progress.donePercent}%` }} />
        <span className="progress-active" style={{ width: `${progress.inProgressPercent}%` }} />
      </div>
      <span className="progress-text">{summary}</span>
    </div>
  )
}
