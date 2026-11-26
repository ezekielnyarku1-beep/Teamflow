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

const inbox = as => server.call('GET', '/api/notifications', { as })

test('being assigned an issue by someone else puts it in your inbox', async () => {
  const issue = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Please take this', status: 'TODO' })
  await server.call('PATCH', `/api/issues/ENG-${issue.number}`, { as: admin, body: { assigneeId: fixtures.engUser.id } })

  const response = await inbox(engMember)
  assert.equal(response.status, 200)
  assert.equal(response.body.unreadCount, 1)
  const [notification] = response.body.notifications
  assert.equal(notification.type, 'ASSIGNED')
  assert.equal(notification.read, false)
  assert.equal(notification.actor.name, 'Admin Person')
  assert.deepEqual(notification.issue, { identifier: `ENG-${issue.number}`, title: 'Please take this', status: 'TODO' })
  assert.equal((await inbox(admin)).body.unreadCount, 0)
})

test('creating an issue for someone notifies them, assigning yourself does not', async () => {
  await server.call('POST', '/api/issues', {
    as: admin,
    body: { teamKey: 'ENG', title: 'New for you', status: 'TODO', assigneeId: fixtures.engUser.id },
  })
  const issue = await addIssue(fixtures.eng, fixtures.engUser, { title: 'Mine', status: 'TODO' })
  await server.call('PATCH', `/api/issues/ENG-${issue.number}`, { as: engMember, body: { assigneeId: fixtures.engUser.id } })
  await server.call('PATCH', `/api/issues/ENG-${issue.number}`, { as: engMember, body: { title: 'Still mine' } })

  const { body } = await inbox(engMember)
  assert.deepEqual(body.notifications.map(notification => notification.issue.title), ['New for you'])
})

test('notifications can be marked read one by one or all at once, only by their owner', async () => {
  const first = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'One', status: 'TODO' })
  const second = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Two', status: 'TODO' })
  for (const issue of [first, second]) {
    await server.call('PATCH', `/api/issues/ENG-${issue.number}`, { as: admin, body: { assigneeId: fixtures.engUser.id } })
  }
  const [latest] = (await inbox(engMember)).body.notifications

  assert.equal((await server.call('PATCH', `/api/notifications/${latest.id}`, { as: desMember, body: { read: true } })).status, 404)
  assert.equal((await server.call('PATCH', `/api/notifications/${latest.id}`, { as: engMember, body: { read: 'yes' } })).status, 400)
  const read = await server.call('PATCH', `/api/notifications/${latest.id}`, { as: engMember, body: { read: true } })
  assert.equal(read.body.read, true)
  assert.equal((await inbox(engMember)).body.unreadCount, 1)

  const unread = await server.call('PATCH', `/api/notifications/${latest.id}`, { as: engMember, body: { read: false } })
  assert.equal(unread.body.read, false)
  const all = await server.call('POST', '/api/notifications/read-all', { as: engMember })
  assert.equal(all.body.updated, 2)
  assert.equal((await inbox(engMember)).body.unreadCount, 0)
})

test('notifications for a team you left are hidden', async () => {
  const issue = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Before leaving', status: 'TODO' })
  await server.call('PATCH', `/api/issues/ENG-${issue.number}`, { as: admin, body: { assigneeId: fixtures.engUser.id } })
  await prisma.teamMember.deleteMany({ where: { userId: fixtures.engUser.id } })
  const { body } = await inbox(engMember)
  assert.equal(body.unreadCount, 0)
  assert.deepEqual(body.notifications, [])
})

test('a comment notifies the assignee and earlier commenters, but not the person who wrote it', async () => {
  const issue = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Talk about this', status: 'TODO', assigneeId: fixtures.engUser.id })
  const path = `/api/issues/ENG-${issue.number}/comments`

  assert.equal((await server.call('POST', path, { as: engMember, body: { body: 'First thoughts' } })).status, 201)
  assert.equal((await inbox(engMember)).body.unreadCount, 0)

  assert.equal((await server.call('POST', path, { as: admin, body: { body: 'Replying' } })).status, 201)
  const [notification] = (await inbox(engMember)).body.notifications
  assert.equal(notification.type, 'COMMENTED')
  assert.equal(notification.actor.name, 'Admin Person')
  assert.equal((await inbox(engMember)).body.unreadCount, 1)

  assert.equal((await server.call('POST', path, { as: engMember, body: { body: 'Thanks' } })).status, 201)
  const adminInbox = (await inbox(admin)).body
  assert.equal(adminInbox.unreadCount, 1)
  assert.equal(adminInbox.notifications[0].type, 'COMMENTED')
})

test('a status change notifies the assignee once, and a new assignee only gets the assignment', async () => {
  const issue = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Move me', status: 'TODO', assigneeId: fixtures.engUser.id })
  const path = `/api/issues/ENG-${issue.number}`

  await server.call('PATCH', path, { as: admin, body: { status: 'IN_PROGRESS' } })
  assert.deepEqual((await inbox(engMember)).body.notifications.map(item => item.type), ['STATUS_CHANGED'])

  await server.call('PATCH', path, { as: engMember, body: { status: 'DONE' } })
  assert.equal((await inbox(engMember)).body.notifications.length, 1)

  const other = await addIssue(fixtures.eng, fixtures.adminUser, { title: 'Hand over', status: 'TODO' })
  await server.call('PATCH', `/api/issues/ENG-${other.number}`, { as: admin, body: { status: 'IN_PROGRESS', assigneeId: fixtures.engUser.id } })
  const types = (await inbox(engMember)).body.notifications.map(item => item.type)
  assert.deepEqual(types, ['ASSIGNED', 'STATUS_CHANGED'])
})
