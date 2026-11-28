export function calculateProgress(countsByStatus) {
  const count = status => countsByStatus[status] ?? 0
  const issueCount = Object.values(countsByStatus).reduce((total, value) => total + value, 0)
  const activeCount = issueCount
  const percentOfActive = value => (activeCount === 0 ? 0 : Math.round((value / activeCount) * 100))

  return {
    issueCount,
    activeCount,
    doneCount: count('DONE'),
    inProgressCount: count('IN_PROGRESS'),
    donePercent: percentOfActive(count('DONE')),
    inProgressPercent: percentOfActive(count('DONE') + count('IN_PROGRESS')) - percentOfActive(count('DONE')),
  }
}
