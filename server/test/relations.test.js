import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../src/db.js'
import { addIssue, admin, createFixtures, desMember, engMember, resetDatabase, startServer } from './helpers.js'

let server
let fixtures

before(async () => {
  server = await startServer()
})

beforeEach(async () => {
  await resetDatabase()
  fixtures = await createFixtures()
})

after(async () => {
  await server.close()
  await prisma.$disconnect()
})

const key = issue => `ENG-${issue.number}`
const detail = (identifier, as = engMember) => server.call('GET', `/api/issues/${identifier}`, { as })

test('sub-issues: create under a parent, see them on the parent with a done count', async () => {
  const parent = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Launch', status: 'TODO' })
  for (const [title, status] of [['Write copy', 'DONE'], ['Design page', 'IN_PROGRESS'], ['Old idea', 'CANCELED']]) {
    const created = await server.call('POST', '/api/issues', { as: engMember, body: { teamKey: 'ENG', title, status, parentId: parent.id } })
    assert.equal(created.status, 201)
    assert.equal(created.body.parent.identifier, key(parent))
  }

  const { body } = await detail(key(parent))
  assert.deepEqual(body.children.map(child => child.title), ['Write copy', 'Design page', 'Old idea'])
  assert.deepEqual(body.subIssues, { total: 2, done: 1 })

  const list = await server.call('GET', '/api/issues?team=ENG', { as: engMember })
  assert.deepEqual(list.body.find(issue => issue.id === parent.id).subIssues, { total: 2, done: 1 })
})

test('sub-issues: the parent must be in the same team, and loops are refused', async () => {
  const parent = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Parent', status: 'TODO' })
  const child = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Child', status: 'TODO', parentId: parent.id })
  const grandchild = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Grandchild', status: 'TODO', parentId: child.id })
  const design = await addIssue(fixtures.des, fixtures.desUser, { title: 'Design work', status: 'TODO' })

  const otherTeam = await server.call('POST', '/api/issues', { as: admin, body: { teamKey: 'ENG', title: 'Wrong', status: 'TODO', parentId: design.id } })
  assert.equal(otherTeam.status, 400)
  const self = await server.call('PATCH', `/api/issues/${key(parent)}`, { as: engMember, body: { parentId: parent.id } })
  assert.equal(self.status, 400)
  const loop = await server.call('PATCH', `/api/issues/${key(parent)}`, { as: engMember, body: { parentId: grandchild.id } })
  assert.equal(loop.status, 400)
  assert.match(loop.body.error, /own sub-issues/)
})

test('sub-issues: changing the parent is in the history, and deleting a parent keeps its sub-issues', async () => {
  const first = await addIssue(fixtures.eng, fixtures.engUser, { title: 'First parent', status: 'TODO' })
  const child = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Child', status: 'TODO' })

  const moved = await server.call('PATCH', `/api/issues/${key(child)}`, { as: engMember, body: { parentId: first.id } })
  assert.equal(moved.status, 200)
  const history = (await detail(key(child))).body.activity.find(entry => entry.field === 'parent')
  assert.deepEqual([history.fromValue, history.toValue], [null, key(first)])

  assert.equal((await server.call('DELETE', `/api/issues/${key(first)}`, { as: admin })).status, 204)
  const after = await detail(key(child))
  assert.equal(after.status, 200)
  assert.equal(after.body.parent, null)
})

test('blocked by: link, see the blocked flag until the blocker is done, then unlink', async () => {
  const blocker = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Approve design', status: 'TODO' })
  const blocked = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Build page', status: 'TODO' })

  const linked = await server.call('POST', `/api/issues/${key(blocked)}/blocked-by`, { as: engMember, body: { identifier: key(blocker).toLowerCase() } })
  assert.equal(linked.status, 201)
  assert.deepEqual(linked.body.blockedBy.map(issue => issue.identifier), [key(blocker)])
  assert.equal(linked.body.blocked, true)
  assert.deepEqual((await detail(key(blocker))).body.blocking.map(issue => issue.identifier), [key(blocked)])

  const again = await server.call('POST', `/api/issues/${key(blocked)}/blocked-by`, { as: engMember, body: { identifier: key(blocker) } })
  assert.equal(again.status, 200)
  assert.equal(again.body.blockedBy.length, 1)

  await server.call('PATCH', `/api/issues/${key(blocker)}`, { as: engMember, body: { status: 'DONE' } })
  const list = await server.call('GET', '/api/issues?team=ENG', { as: engMember })
  assert.equal(list.body.find(issue => issue.id === blocked.id).blocked, false)

  const unlinked = await server.call('DELETE', `/api/issues/${key(blocked)}/blocked-by/${key(blocker)}`, { as: engMember })
  assert.equal(unlinked.status, 200)
  assert.deepEqual(unlinked.body.blockedBy, [])
  const entries = unlinked.body.activity.filter(entry => entry.field === 'blockedBy')
  assert.deepEqual(entries.map(entry => [entry.fromValue, entry.toValue]), [[null, key(blocker)], [key(blocker), null]])
})

test('blocked by: no self-blocking, no two issues blocking each other, and only issues you can see', async () => {
  const one = await addIssue(fixtures.eng, fixtures.engUser, { title: 'One', status: 'TODO' })
  const two = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Two', status: 'TODO' })
  const design = await addIssue(fixtures.des, fixtures.desUser, { title: 'Design work', status: 'TODO' })
  const link = (target, identifier, as = engMember) => server.call('POST', `/api/issues/${key(target)}/blocked-by`, { as, body: { identifier } })

  assert.equal((await link(one, key(one))).status, 400)
  assert.equal((await link(two, key(one))).status, 201)
  const reverse = await link(one, key(two))
  assert.equal(reverse.status, 400)
  assert.match(reverse.body.error, /already blocked by this issue/)
  assert.equal((await link(one, `DES-${design.number}`)).status, 404)
  assert.equal((await link(one, `DES-${design.number}`, admin)).status, 201)
})

test('mentions: "@Name" notifies a team member once, as a mention instead of a comment', async () => {
  await prisma.teamMember.create({ data: { teamId: fixtures.eng.id, userId: fixtures.adminUser.id } })
  const issue = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Talk', status: 'TODO', assigneeId: fixtures.engUser.id })
  const posted = await server.call('POST', `/api/issues/${key(issue)}/comments`, { as: admin, body: { body: 'Can you take a look, @eng person? Thanks, @Des Person.' } })
  assert.equal(posted.status, 201)

  const engInbox = (await server.call('GET', '/api/notifications', { as: engMember })).body.notifications
  assert.deepEqual(engInbox.map(item => item.type), ['MENTIONED'])
  const desInbox = (await server.call('GET', '/api/notifications', { as: desMember })).body.notifications
  assert.deepEqual(desInbox, [], 'people outside the team are not notified')

  await server.call('POST', `/api/issues/${key(issue)}/comments`, { as: engMember, body: { body: 'On it @Admin Person' } })
  const adminInbox = (await server.call('GET', '/api/notifications', { as: admin })).body.notifications
  assert.deepEqual(adminInbox.map(item => item.type), ['MENTIONED'])
})

test('stats: open, in progress, overdue and issues done per week, for you or your teams', async () => {
  const mine = { assigneeId: fixtures.engUser.id }
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Open', status: 'TODO', ...mine })
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Late', status: 'TODO', dueDate: new Date('2020-01-01'), ...mine })
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Busy', status: 'IN_PROGRESS', ...mine })
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Not mine', status: 'TODO' })
  const finished = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Finish me', status: 'TODO', ...mine })
  await server.call('PATCH', `/api/issues/${key(finished)}`, { as: engMember, body: { status: 'DONE' } })
  await server.call('PATCH', `/api/issues/${key(finished)}`, { as: engMember, body: { status: 'TODO' } })
  await server.call('PATCH', `/api/issues/${key(finished)}`, { as: engMember, body: { status: 'DONE' } })

  const me = (await server.call('GET', '/api/issues/stats', { as: engMember })).body
  assert.deepEqual([me.open, me.inProgress, me.overdue, me.doneLast7Days], [3, 1, 1, 1])
  assert.equal(me.donePerWeek.length, 8)
  assert.equal(me.donePerWeek.at(-1).count, 1, 'counted once, in this week')
  assert.equal(me.donePerWeek.reduce((total, week) => total + week.count, 0), 1)

  const team = (await server.call('GET', '/api/issues/stats?scope=team', { as: engMember })).body
  assert.equal(team.open, 4)
  const design = (await server.call('GET', '/api/issues/stats?scope=team', { as: desMember })).body
  assert.equal(design.open, 0, 'other teams are not counted')
})
