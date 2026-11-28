import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateProgress } from '../src/progress.js'

test('no issues means 0% and an issue count of 0', () => {
  assert.deepEqual(calculateProgress({}), {
    issueCount: 0,
    activeCount: 0,
    doneCount: 0,
    inProgressCount: 0,
    donePercent: 0,
    inProgressPercent: 0,
  })
})

test('done and in progress are divided by all issues', () => {
  const progress = calculateProgress({ TODO: 2, IN_PROGRESS: 1, DONE: 1 })
  assert.equal(progress.issueCount, 4)
  assert.equal(progress.activeCount, 4)
  assert.equal(progress.donePercent, 25)
  assert.equal(progress.inProgressPercent, 25)
})

test('percentages are rounded to whole numbers', () => {
  const progress = calculateProgress({ TODO: 1, IN_PROGRESS: 1, DONE: 1 })
  assert.equal(progress.donePercent, 33)
  assert.equal(progress.inProgressPercent, 34)
})

test('everything done is 100%', () => {
  assert.equal(calculateProgress({ DONE: 5 }).donePercent, 100)
})

test('done and in progress never add up to more than 100%', () => {
  const progress = calculateProgress({ DONE: 1, IN_PROGRESS: 7 })
  assert.equal(progress.donePercent, 13)
  assert.equal(progress.inProgressPercent, 87)
})
