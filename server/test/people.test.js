import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../src/db.js'
import { admin, createFixtures, desMember, engMember, resetDatabase, startServer } from './helpers.js'

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

// Does real work through the API, the same way the app does, so the feed comes from what is recorded automatically.
async function doSomeWork(as, teamKey) {
  const created = await server.call('POST', '/api/issues', { as, body: { teamKey, title: 'Build login', status: 'TODO' } })
  const { identifier } = created.body
  await server.call('PATCH', `/api/issues/${identifier}`, { as, body: { status: 'DONE' } })
  await server.call('POST', `/api/issues/${identifier}/comments`, { as, body: { body: 'Shipped it' } })
  return identifier
}

test('a profile shows what the member did: created, changed and commented, newest first', async () => {
  const identifier = await doSomeWork(engMember, 'ENG')
  const response = await server.call('GET', `/api/people/${fixtures.engUser.id}`, { as: engMember })
  assert.equal(response.status, 200)
  assert.equal(response.body.name, 'Eng Person')
  assert.deepEqual(response.body.teams.map(team => team.key), ['ENG'])
  const kinds = response.body.events.map(event => event.kind)
  assert.deepEqual([...kinds].sort(), ['changed', 'commented', 'created'])
  assert.equal(kinds.at(-1), 'created')
  const done = response.body.events.find(event => event.kind === 'changed')
  assert.deepEqual([done.field, done.fromValue, done.toValue], ['status', 'TODO', 'DONE'])
  assert.equal(done.issue.identifier, identifier)
  assert.equal(response.body.events.find(event => event.kind === 'commented').body, 'Shipped it')
})

test('people in other teams cannot see a profile, and admins see everyone', async () => {
  await doSomeWork(engMember, 'ENG')
  const stranger = await server.call('GET', `/api/people/${fixtures.engUser.id}`, { as: desMember })
  assert.equal(stranger.status, 404)
  const asAdmin = await server.call('GET', `/api/people/${fixtures.engUser.id}`, { as: admin })
  assert.equal(asAdmin.status, 200)
  assert.equal(asAdmin.body.events.length, 3)
  const missing = await server.call('GET', '/api/people/not-an-id', { as: admin })
  assert.equal(missing.status, 404)
})

test('a profile only shows work in teams the viewer can see', async () => {
  await prisma.teamMember.create({ data: { teamId: fixtures.des.id, userId: fixtures.engUser.id } })
  await doSomeWork(engMember, 'DES')
  await prisma.teamMember.create({ data: { teamId: fixtures.eng.id, userId: fixtures.desUser.id } })
  await prisma.teamMember.delete({ where: { teamId_userId: { teamId: fixtures.des.id, userId: fixtures.desUser.id } } })
  const response = await server.call('GET', `/api/people/${fixtures.engUser.id}`, { as: desMember })
  assert.equal(response.status, 200)
  assert.deepEqual(response.body.events, [])
  assert.deepEqual(response.body.teams.map(team => team.key), ['ENG'])
})

test('team momentum counts each member’s work today and this week', async () => {
  await doSomeWork(engMember, 'ENG')
  const today = new Date(Date.now() - 60000).toISOString()
  const response = await server.call('GET', `/api/teams/ENG/momentum?today=${encodeURIComponent(today)}`, { as: admin })
  assert.equal(response.status, 200)
  const [row] = response.body.members
  assert.equal(row.name, 'Eng Person')
  assert.equal(row.actionsToday, 3)
  assert.equal(row.actionsThisWeek, 3)
  assert.equal(row.createdThisWeek, 1)
  assert.equal(row.doneThisWeek, 1)
  assert.equal(row.commentsThisWeek, 1)
  assert.ok(row.lastActiveAt)
  assert.equal(row.recent.length, 3)

  const later = await server.call('GET', `/api/teams/ENG/momentum?today=${encodeURIComponent(new Date(Date.now() + 60000).toISOString())}`, { as: admin })
  assert.equal(later.body.members[0].actionsToday, 0)
  assert.equal(later.body.members[0].actionsThisWeek, 3)
})

test('only admins can see momentum, even for their own team, and a bad start time is a 400', async () => {
  const member = await server.call('GET', '/api/teams/ENG/momentum', { as: engMember })
  assert.equal(member.status, 403)
  const missing = await server.call('GET', '/api/teams/NOPE/momentum', { as: admin })
  assert.equal(missing.status, 404)
  const bad = await server.call('GET', '/api/teams/ENG/momentum?today=nope', { as: admin })
  assert.equal(bad.status, 400)
})
