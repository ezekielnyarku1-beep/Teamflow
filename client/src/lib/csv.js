import { priorityLabel, statusLabel } from './issueOptions.js'

// Spreadsheet apps run cells that start with these characters as formulas, so they are prefixed with an apostrophe.
const formulaStart = /^[=+\-@\t\r]/

export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value)
  if (formulaStart.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows) {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}

const columns = [
  ['ID', issue => issue.identifier],
  ['Title', issue => issue.title],
  ['Status', issue => statusLabel(issue.status)],
  ['Priority', issue => priorityLabel(issue.priority)],
  ['Assignee', issue => issue.assignee?.name],
  ['Labels', issue => issue.labels?.map(label => label.name).join('; ')],
  ['Project', issue => issue.project?.name],
  ['Cycle', issue => (issue.cycle ? `Cycle ${issue.cycle.number}` : '')],
  ['Due date', issue => issue.dueDate],
  ['Parent', issue => issue.parent?.identifier],
  ['Blocked', issue => (issue.blocked ? 'Yes' : 'No')],
  ['Sub-issues done', issue => (issue.subIssues ? `${issue.subIssues.done} of ${issue.subIssues.total}` : '')],
  ['Created', issue => issue.createdAt?.slice(0, 10)],
  ['Updated', issue => issue.updatedAt?.slice(0, 10)],
]

export function issuesToCsv(issues) {
  return toCsv([columns.map(([name]) => name), ...issues.map(issue => columns.map(([, read]) => read(issue)))])
}

export const csvFileName = (title, date = new Date()) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'issues'}-${date.toISOString().slice(0, 10)}.csv`

// The byte order mark makes Excel read the file as UTF-8, so names with accents show correctly.
export function downloadCsv(fileName, csv) {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
