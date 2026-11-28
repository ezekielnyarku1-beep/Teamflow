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

test('a member sees only the projects of their teams', async () => {
  const response = await server.call('GET', '/api/projects', { as: engMember })
  assert.equal(response.status, 200)
  assert.deepEqual(response.body.map(project => project.name), ['Eng project'])
})

test('an admin sees every project and can filter by team', async () => {
  const all = await server.call('GET', '/api/projects', { as: admin })
  assert.equal(all.body.length, 2)
  const des = await server.call('GET', '/api/projects?team=DES', { as: admin })
  assert.deepEqual(des.body.map(project => project.name), ['Des project'])
})

test('project progress is calculated from its issues', async () => {
  const projectId = fixtures.engProject.id
  for (const status of ['DONE', 'DONE', 'IN_PROGRESS', 'TODO']) {
    await addIssue(fixtures.eng, fixtures.engUser, { title: status, status, projectId })
  }
  const response = await server.call('GET', `/api/projects/${projectId}`, { as: engMember })
  assert.equal(response.status, 200)
  assert.deepEqual(response.body.progress, {
    issueCount: 4,
    activeCount: 4,
    doneCount: 2,
    inProgressCount: 1,
    donePercent: 50,
    inProgressPercent: 25,
  })
})

test('a project with no issues shows 0%', async () => {
  const response = await server.call('GET', `/api/projects/${fixtures.engProject.id}`, { as: engMember })
  assert.equal(response.body.progress.issueCount, 0)
  assert.equal(response.body.progress.donePercent, 0)
})

test('a member cannot open a project of another team', async () => {
  const response = await server.call('GET', `/api/projects/${fixtures.desProject.id}`, { as: engMember })
  assert.equal(response.status, 404)
})

test('only admins can create and edit projects', async () => {
  const body = { teamKey: 'ENG', name: 'New project' }
  const denied = await server.call('POST', '/api/projects', { as: engMember, body })
  assert.equal(denied.status, 403)
  const created = await server.call('POST', '/api/projects', { as: admin, body })
  assert.equal(created.status, 201)
  assert.equal(created.body.team.key, 'ENG')

  const editDenied = await server.call('PATCH', `/api/projects/${created.body.id}`, { as: desMember, body: { name: 'X' } })
  assert.equal(editDenied.status, 403)
  const edited = await server.call('PATCH', `/api/projects/${created.body.id}`, {
    as: admin,
    body: { name: 'Renamed', startDate: '2026-12-01', targetDate: '2027-01-15' },
  })
  assert.equal(edited.status, 200)
  assert.equal(edited.body.name, 'Renamed')
  assert.equal(edited.body.targetDate, '2027-01-15')
})

test('project dates and owner are checked', async () => {
  const backwards = await server.call('POST', '/api/projects', {
    as: admin,
    body: { teamKey: 'ENG', name: 'Dates', startDate: '2027-02-01', targetDate: '2027-01-01' },
  })
  assert.equal(backwards.status, 400)
  const badDate = await server.call('POST', '/api/projects', {
    as: admin,
    body: { teamKey: 'ENG', name: 'Dates', startDate: '2027-02-30' },
  })
  assert.equal(badDate.status, 400)
  const outsider = await server.call('POST', '/api/projects', {
    as: admin,
    body: { teamKey: 'ENG', name: 'Owner', ownerId: fixtures.desUser.id },
  })
  assert.equal(outsider.status, 400)
})

test('a project can still be edited after its owner leaves the team', async () => {
  await prisma.teamMember.deleteMany({ where: { userId: fixtures.engUser.id } })
  const path = `/api/projects/${fixtures.engProject.id}`
  const kept = await server.call('PATCH', path, { as: admin, body: { name: 'Renamed', ownerId: fixtures.engUser.id } })
  assert.equal(kept.status, 200)
  assert.equal(kept.body.name, 'Renamed')
  const outsider = await server.call('PATCH', path, { as: admin, body: { ownerId: fixtures.desUser.id } })
  assert.equal(outsider.status, 400)
})
