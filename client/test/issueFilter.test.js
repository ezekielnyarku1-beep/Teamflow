import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyFilter, countActiveFilters, emptyFilter, sameFilter } from '../src/lib/issueFilter.js'

const issues = [
  { id: 1, status: 'TODO', priority: 'HIGH', assignee: { id: 'u1' }, labels: [{ id: 'bug' }] },
  { id: 2, status: 'DONE', priority: 'LOW', assignee: null, labels: [] },
  { id: 3, status: 'IN_PROGRESS', priority: 'HIGH', assignee: { id: 'u2' }, labels: [{ id: 'ui' }] },
]
const ids = list => list.map(issue => issue.id)

test('the empty filter shows everything', () => {
  assert.deepEqual(ids(applyFilter(issues, emptyFilter)), [1, 2, 3])
  assert.equal(countActiveFilters(emptyFilter), 0)
})

test('filters combine priority, assignee, label and closed issues', () => {
  assert.deepEqual(ids(applyFilter(issues, { ...emptyFilter, showClosed: false })), [1, 3])
  assert.deepEqual(ids(applyFilter(issues, { ...emptyFilter, priorities: ['HIGH'], assigneeIds: ['u2'] })), [3])
  assert.deepEqual(ids(applyFilter(issues, { ...emptyFilter, labelIds: ['bug', 'ui'] })), [1, 3])
  assert.equal(countActiveFilters({ ...emptyFilter, priorities: ['HIGH'], showClosed: false }), 2)
})

test('filters with the same choices in another order are the same', () => {
  assert.equal(sameFilter({ ...emptyFilter, priorities: ['LOW', 'HIGH'] }, { ...emptyFilter, priorities: ['HIGH', 'LOW'] }), true)
  assert.equal(sameFilter(emptyFilter, { ...emptyFilter, showClosed: false }), false)
})
