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

test('an admin sees every team', async () => {
  const response = await server.call('GET', '/api/teams', { as: admin })
  assert.equal(response.status, 200)
  assert.deepEqual(response.body.map(team => team.key), ['DES', 'ENG'])
})

test('a member sees only the teams they belong to', async () => {
  const response = await server.call('GET', '/api/teams', { as: engMember })
  assert.deepEqual(response.body.map(team => team.key), ['ENG'])
})

test('a member cannot open a team they are not in', async () => {
  const response = await server.call('GET', '/api/teams/DES', { as: engMember })
  assert.equal(response.status, 404)
})

test('team details include members and progress from its issues', async () => {
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'One', status: 'DONE' })
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Two', status: 'TODO' })
  const response = await server.call('GET', '/api/teams/ENG', { as: engMember })
  assert.equal(response.status, 200)
  assert.deepEqual(response.body.members.map(member => member.name), ['Eng Person'])
  assert.equal(response.body.progress.issueCount, 2)
  assert.equal(response.body.progress.donePercent, 50)
})

test('only admins can create teams', async () => {
  const denied = await server.call('POST', '/api/teams', { as: engMember, body: { key: 'OPS', name: 'Operations' } })
  assert.equal(denied.status, 403)
  const created = await server.call('POST', '/api/teams', { as: admin, body: { key: 'OPS', name: 'Operations' } })
  assert.equal(created.status, 201)
  assert.equal(created.body.key, 'OPS')
  assert.equal(created.body.progress.issueCount, 0)
})

test('team keys must be valid and unique', async () => {
  const invalid = await server.call('POST', '/api/teams', { as: admin, body: { key: 'eng team', name: 'X' } })
  assert.equal(invalid.status, 400)
  const duplicate = await server.call('POST', '/api/teams', { as: admin, body: { key: 'ENG', name: 'Again' } })
  assert.equal(duplicate.status, 409)
})

test('only admins can rename a team', async () => {
  const denied = await server.call('PATCH', '/api/teams/ENG', { as: engMember, body: { name: 'Builders' } })
  assert.equal(denied.status, 403)
  const renamed = await server.call('PATCH', '/api/teams/ENG', { as: admin, body: { name: 'Builders' } })
  assert.equal(renamed.status, 200)
  assert.equal(renamed.body.name, 'Builders')
})

test('a member of another team gets no access to its data by typing the address', async () => {
  const response = await server.call('GET', '/api/teams/ENG', { as: desMember })
  assert.equal(response.status, 404)
})
