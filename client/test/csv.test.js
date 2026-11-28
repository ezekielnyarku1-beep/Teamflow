import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, csvFileName, issuesToCsv, toCsv } from '../src/lib/csv.js'

test('cells with commas, quotes or line breaks are quoted', () => {
  assert.equal(csvCell('plain'), 'plain')
  assert.equal(csvCell('a, b'), '"a, b"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('two\nlines'), '"two\nlines"')
  assert.equal(csvCell(null), '')
  assert.equal(toCsv([['a', 'b'], ['c', 'd']]), 'a,b\r\nc,d')
})

test('cells that a spreadsheet would run as a formula are made harmless', () => {
  assert.equal(csvCell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`)
  assert.equal(csvCell('+1'), "'+1")
  assert.equal(csvCell('-2'), "'-2")
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)")
})

test('issues become one row each with readable values', () => {
  const csv = issuesToCsv([{
    identifier: 'ENG-7', title: 'Fix login, again', status: 'IN_PROGRESS', priority: 'HIGH', assignee: { name: 'Zoë' },
    labels: [{ name: 'Bug' }, { name: 'UI' }], project: null, cycle: { number: 3 }, dueDate: '2026-12-04',
    parent: { identifier: 'ENG-1' }, blocked: true, subIssues: { done: 1, total: 2 },
    createdAt: '2026-11-20T10:00:00.000Z', updatedAt: '2026-11-21T10:00:00.000Z',
  }])
  const [header, row] = csv.split('\r\n')
  assert.equal(header, 'ID,Title,Status,Priority,Assignee,Labels,Project,Cycle,Due date,Parent,Blocked,Sub-issues done,Created,Updated')
  assert.equal(row, 'ENG-7,"Fix login, again",In progress,High,Zoë,Bug; UI,,Cycle 3,2026-12-04,ENG-1,Yes,1 of 2,2026-11-20,2026-11-21')
})

test('file names are tidy and dated', () => {
  assert.equal(csvFileName('My issues', new Date('2026-11-27T12:00:00Z')), 'my-issues-2026-11-27.csv')
  assert.equal(csvFileName('Spacing QA team!', new Date('2026-11-27T12:00:00Z')), 'spacing-qa-team-2026-11-27.csv')
})
