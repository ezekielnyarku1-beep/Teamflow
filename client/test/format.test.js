import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countOf, formatShortDate } from '../src/lib/format.js'

test('counts use the singular for one', () => {
  assert.equal(countOf(0, 'issue'), '0 issues')
  assert.equal(countOf(1, 'issue'), '1 issue')
  assert.equal(countOf(2, 'project'), '2 projects')
})

test('dates are read as calendar days, not shifted by time zone', () => {
  assert.equal(formatShortDate('2026-12-04'), 'Dec 4')
})
