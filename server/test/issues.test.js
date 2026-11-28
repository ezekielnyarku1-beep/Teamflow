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

test('new issues get team IDs in order, like ENG-1 and ENG-2', async () => {
  const first = await server.call('POST', '/api/issues', { as: engMember, body: { teamKey: 'ENG', title: 'First', status: 'TODO' } })
  const second = await server.call('POST', '/api/issues', { as: engMember, body: { teamKey: 'ENG', title: 'Second', status: 'TODO' } })
  assert.equal(first.status, 201)
  assert.equal(first.body.identifier, 'ENG-1')
  assert.equal(second.body.identifier, 'ENG-2')
  assert.equal(first.body.priority, 'NO_PRIORITY')
})

test('a member cannot create issues in another team', async () => {
  const response = await server.call('POST', '/api/issues', { as: engMember, body: { teamKey: 'DES', title: 'X', status: 'TODO' } })
  assert.equal(response.status, 404)
})

test('issue input is checked on the server', async () => {
  const cases = [
    { teamKey: 'ENG', title: '   ', status: 'TODO' },
    { teamKey: 'ENG', title: 'X', status: 'FINISHED' },
    { teamKey: 'ENG', title: 'X', status: 'TODO', priority: 'SUPER' },
    { teamKey: 'ENG', title: 'X', status: 'TODO', dueDate: 'tomorrow' },
    { teamKey: 'ENG', title: 'X'.repeat(201), status: 'TODO' },
    { teamKey: 'ENG', title: 'X', status: 'TODO', labelIds: ['not-an-id'] },
  ]
  for (const body of cases) {
    const response = await server.call('POST', '/api/issues', { as: engMember, body })
    assert.equal(response.status, 400, JSON.stringify(body))
  }
})

test('assignee and project must belong to the same team', async () => {
  const outsider = await server.call('POST', '/api/issues', {
    as: admin,
    body: { teamKey: 'ENG', title: 'X', status: 'TODO', assigneeId: fixtures.desUser.id },
  })
  assert.equal(outsider.status, 400)
  const otherProject = await server.call('POST', '/api/issues', {
    as: admin,
    body: { teamKey: 'ENG', title: 'X', status: 'TODO', projectId: fixtures.desProject.id },
  })
  assert.equal(otherProject.status, 400)
})

test('a member sees only issues of their teams, and can filter them', async () => {
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Eng mine', status: 'TODO', assigneeId: fixtures.engUser.id })
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Eng project', status: 'TODO', projectId: fixtures.engProject.id })
  await addIssue(fixtures.des, fixtures.desUser, { title: 'Des issue', status: 'TODO' })

  const visible = await server.call('GET', '/api/issues', { as: engMember })
  assert.deepEqual(visible.body.map(issue => issue.title).sort(), ['Eng mine', 'Eng project'])
  const mine = await server.call('GET', '/api/issues?assignee=me', { as: engMember })
  assert.deepEqual(mine.body.map(issue => issue.title), ['Eng mine'])
  const byProject = await server.call('GET', `/api/issues?project=${fixtures.engProject.id}`, { as: engMember })
  assert.deepEqual(byProject.body.map(issue => issue.title), ['Eng project'])
  const hidden = await server.call('GET', '/api/issues?team=DES', { as: engMember })
  assert.deepEqual(hidden.body, [])
  const invalidProject = await server.call('GET', '/api/issues?project=invalid', { as: engMember })
  assert.equal(invalidProject.status, 400)
})

test('a member cannot open or change an issue of another team', async () => {
  await addIssue(fixtures.des, fixtures.desUser, { title: 'Secret', status: 'TODO' })
  const read = await server.call('GET', '/api/issues/DES-1', { as: engMember })
  assert.equal(read.status, 404)
  const write = await server.call('PATCH', '/api/issues/DES-1', { as: engMember, body: { status: 'DONE' } })
  assert.equal(write.status, 404)
  const comment = await server.call('POST', '/api/issues/DES-1/comments', { as: engMember, body: { body: 'Hi' } })
  assert.equal(comment.status, 404)
})

test('changing an issue saves it and records the activity', async () => {
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Board', status: 'TODO' })
  const response = await server.call('PATCH', '/api/issues/ENG-1', {
    as: engMember,
    body: {
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: fixtures.engUser.id,
      projectId: fixtures.engProject.id,
      dueDate: '2026-12-31',
      labelIds: [fixtures.bug.id],
      description: 'More detail',
    },
  })
  assert.equal(response.status, 200)
  assert.equal(response.body.status, 'IN_PROGRESS')
  assert.equal(response.body.dueDate, '2026-12-31')
  assert.deepEqual(response.body.labels.map(label => label.name), ['Bug'])

  const detail = await server.call('GET', '/api/issues/ENG-1', { as: engMember })
  const changes = detail.body.activity.map(entry => [entry.field, entry.fromValue, entry.toValue])
  assert.deepEqual(changes, [
    [null, null, null],
    ['status', 'TODO', 'IN_PROGRESS'],
    ['priority', 'NO_PRIORITY', 'HIGH'],
    ['assignee', null, 'Eng Person'],
    ['project', null, 'Eng project'],
    ['dueDate', null, '2026-12-31'],
    ['labels', null, 'Bug'],
    ['description', null, null],
  ])
  assert.equal(detail.body.activity[1].actor.name, 'Eng Person')
})

test('an empty change is refused and records nothing', async () => {
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Same', status: 'TODO' })
  const empty = await server.call('PATCH', '/api/issues/ENG-1', { as: engMember, body: {} })
  assert.equal(empty.status, 400)
  await server.call('PATCH', '/api/issues/ENG-1', { as: engMember, body: { status: 'TODO' } })
  const detail = await server.call('GET', '/api/issues/ENG-1', { as: engMember })
  assert.equal(detail.body.activity.length, 1)
})

test('concurrent changes record each status from the previous saved value', async () => {
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Concurrent changes', status: 'TODO' })
  const updates = await Promise.all(['IN_PROGRESS', 'DONE'].map(status =>
    server.call('PATCH', '/api/issues/ENG-1', { as: engMember, body: { status } }),
  ))
  assert.deepEqual(updates.map(update => update.status), [200, 200])

  const detail = await server.call('GET', '/api/issues/ENG-1', { as: engMember })
  const changes = detail.body.activity.filter(entry => entry.field === 'status')
  assert.equal(changes.length, 2)
  assert.equal(changes[0].fromValue, 'TODO')
  assert.equal(changes[1].fromValue, changes[0].toValue)
  assert.equal(changes[1].toValue, detail.body.status)
})

test('comments are saved with their author and shown in order', async () => {
  await addIssue(fixtures.eng, fixtures.engUser, { title: 'Talk', status: 'TODO' })
  const first = await server.call('POST', '/api/issues/ENG-1/comments', { as: engMember, body: { body: 'First comment' } })
  assert.equal(first.status, 201)
  assert.equal(first.body.author.name, 'Eng Person')
  await server.call('POST', '/api/issues/ENG-1/comments', { as: admin, body: { body: 'Second comment' } })
  const empty = await server.call('POST', '/api/issues/ENG-1/comments', { as: admin, body: { body: '  ' } })
  assert.equal(empty.status, 400)

  const detail = await server.call('GET', '/api/issues/ENG-1', { as: engMember })
  assert.deepEqual(detail.body.comments.map(comment => comment.body), ['First comment', 'Second comment'])
})

test('a badly written issue ID is a 404, not a server error', async () => {
  for (const id of ['eng-1', 'ENG-', 'ENG-abc', '1-ENG']) {
    const response = await server.call('GET', `/api/issues/${id}`, { as: admin })
    assert.equal(response.status, 404, id)
  }
})

test('an admin can work in any team', async () => {
  const created = await server.call('POST', '/api/issues', { as: admin, body: { teamKey: 'DES', title: 'Admin', status: 'TODO' } })
  assert.equal(created.status, 201)
  const read = await server.call('GET', '/api/issues/DES-1', { as: desMember })
  assert.equal(read.status, 200)
})

test('descriptions keep their indentation but not trailing spaces', async () => {
  const issue = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Indented', status: 'TODO' })
  const path = `/api/issues/ENG-${issue.number}`
  const saved = await server.call('PATCH', path, { as: engMember, body: { description: '  code line\n  next line  \n' } })
  assert.equal(saved.body.description, '  code line\n  next line')
  const blank = await server.call('PATCH', path, { as: engMember, body: { description: '   ' } })
  assert.equal(blank.body.description, '')
})

test('blank lines at the start of a description are removed, indentation is kept', async () => {
  const issue = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Blank lines', status: 'TODO' })
  const saved = await server.call('PATCH', `/api/issues/ENG-${issue.number}`, { as: engMember, body: { description: '\n \n\n    code' } })
  assert.equal(saved.body.description, '    code')
})

test('issues say who created them, and only admins or the creator can delete them', async () => {
  const mine = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Mine', status: 'TODO' })
  const others = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Not mine', status: 'TODO' })
  const listed = await server.call('GET', '/api/issues?team=ENG', { as: engMember })
  assert.equal(listed.body.find(issue => issue.title === 'Mine').creatorId, fixtures.engUser.id)

  assert.equal((await server.call('DELETE', `/api/issues/ENG-${others.number}`, { as: engMember })).status, 403)
  assert.equal((await server.call('DELETE', `/api/issues/ENG-${mine.number}`, { as: desMember })).status, 404)
  await server.call('POST', `/api/issues/ENG-${mine.number}/comments`, { as: engMember, body: { body: 'Gone soon' } })
  assert.equal((await server.call('DELETE', `/api/issues/ENG-${mine.number}`, { as: engMember })).status, 204)
  assert.equal((await server.call('GET', `/api/issues/ENG-${mine.number}`, { as: engMember })).status, 404)
  assert.equal((await server.call('DELETE', `/api/issues/ENG-${others.number}`, { as: admin })).status, 204)
  assert.equal(await prisma.comment.count(), 0)
})
