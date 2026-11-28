import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { IssuePriority, IssueStatus, Role } from '../src/generated/prisma/enums.ts'
import { prisma } from '../src/db.js'

after(() => prisma.$disconnect())

test('statuses are in the order from the prompt', () => {
  assert.deepEqual(Object.values(IssueStatus), ['TODO', 'IN_PROGRESS', 'DONE'])
})

test('priorities are in the order from the prompt', () => {
  assert.deepEqual(Object.values(IssuePriority), ['NO_PRIORITY', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'])
})

test('the only roles are admin and member', () => {
  assert.deepEqual(Object.values(Role), ['ADMIN', 'MEMBER'])
})

test('the database is reachable and has every table', async () => {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.teamMember.count(),
    prisma.project.count(),
    prisma.issue.count(),
    prisma.label.count(),
    prisma.comment.count(),
    prisma.issueActivity.count(),
  ])
  for (const count of counts) assert.equal(typeof count, 'number')
})
