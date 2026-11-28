import { prisma } from '../src/db.js'
import { createIssue } from '../src/issues.js'

const users = [
  { email: 'admin@example.com', name: 'Alex Admin', role: 'ADMIN' },
  { email: 'sam@example.com', name: 'Sam Member', role: 'MEMBER' },
  { email: 'jordan@example.com', name: 'Jordan Member', role: 'MEMBER' },
]

const teams = [
  { key: 'ENG', name: 'Engineering', members: ['admin@example.com', 'sam@example.com'] },
  { key: 'DES', name: 'Design', members: ['admin@example.com', 'jordan@example.com'] },
]

const labels = [
  { name: 'Bug', color: '#c2362b' },
  { name: 'Feature', color: '#0e8f78' },
  { name: 'Improvement', color: '#6b7385' },
]

const projects = [
  { name: 'Sample app launch', team: 'ENG', owner: 'sam@example.com', startDate: '2026-11-02', targetDate: '2027-01-29' },
  { name: 'Sample style guide', team: 'DES', owner: 'jordan@example.com', startDate: '2026-11-16', targetDate: '2026-12-18' },
  { name: 'Sample empty project', team: 'ENG', owner: 'admin@example.com', startDate: null, targetDate: null },
]

const issues = [
  { team: 'ENG', title: 'Set up the sign-in page', status: 'DONE', priority: 'HIGH', assignee: 'sam@example.com', project: 'Sample app launch', labels: ['Feature'] },
  { team: 'ENG', title: 'Add the issue list', status: 'DONE', priority: 'MEDIUM', assignee: 'sam@example.com', project: 'Sample app launch', labels: ['Feature'] },
  { team: 'ENG', title: 'Build the board view', status: 'IN_PROGRESS', priority: 'HIGH', assignee: 'sam@example.com', project: 'Sample app launch', labels: ['Feature'], dueDate: '2026-12-11' },
  { team: 'ENG', title: 'Fix the date shown on old issues', status: 'TODO', priority: 'URGENT', assignee: 'admin@example.com', project: 'Sample app launch', labels: ['Bug'], dueDate: '2026-11-30' },
  { team: 'ENG', title: 'Write the setup guide', status: 'TODO', priority: 'LOW', assignee: null, project: 'Sample app launch', labels: [] },
  { team: 'ENG', title: 'Speed up the first page load', status: 'TODO', priority: 'MEDIUM', assignee: null, project: null, labels: ['Improvement'] },
  { team: 'DES', title: 'Pick the button styles', status: 'DONE', priority: 'MEDIUM', assignee: 'jordan@example.com', project: 'Sample style guide', labels: ['Feature'] },
  { team: 'DES', title: 'Draw the empty screens', status: 'IN_PROGRESS', priority: 'HIGH', assignee: 'jordan@example.com', project: 'Sample style guide', labels: ['Feature'], dueDate: '2026-12-04' },
  { team: 'DES', title: 'Check colors in dark mode', status: 'TODO', priority: 'MEDIUM', assignee: 'admin@example.com', project: 'Sample style guide', labels: ['Improvement'] },
]

const comments = [
  { issue: 'Build the board view', author: 'admin@example.com', body: 'Drag and drop should also work with the keyboard.' },
  { issue: 'Build the board view', author: 'sam@example.com', body: 'Agreed, I will add arrow key support.' },
  { issue: 'Draw the empty screens', author: 'jordan@example.com', body: 'First drafts are ready for review.' },
]

const toDate = value => (value ? new Date(`${value}T00:00:00Z`) : null)

async function seed() {
  if (await prisma.user.count()) {
    throw new Error('The database already has data. The seed only runs on an empty database. Run "npm run db:reset" first.')
  }

  await prisma.$transaction(async tx => {
    const userIds = {}
    for (const user of users) {
      userIds[user.email] = (await tx.user.create({ data: user })).id
    }

    const teamIds = {}
    for (const team of teams) {
      const created = await tx.team.create({
        data: {
          key: team.key,
          name: team.name,
          members: { create: team.members.map(email => ({ userId: userIds[email] })) },
        },
      })
      teamIds[team.key] = created.id
    }

    const labelIds = {}
    for (const label of labels) {
      labelIds[label.name] = (await tx.label.create({ data: label })).id
    }

    const projectIds = {}
    for (const project of projects) {
      const created = await tx.project.create({
        data: {
          name: project.name,
          teamId: teamIds[project.team],
          ownerId: userIds[project.owner],
          startDate: toDate(project.startDate),
          targetDate: toDate(project.targetDate),
        },
      })
      projectIds[project.name] = created.id
    }

    const issueIds = {}
    for (const issue of issues) {
      const created = await createIssue(tx, {
        teamId: teamIds[issue.team],
        actorId: userIds['admin@example.com'],
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        assigneeId: issue.assignee && userIds[issue.assignee],
        projectId: issue.project && projectIds[issue.project],
        dueDate: toDate(issue.dueDate),
        labelIds: issue.labels.map(name => labelIds[name]),
      })
      issueIds[issue.title] = created.id
    }

    for (const comment of comments) {
      await tx.comment.create({
        data: { issueId: issueIds[comment.issue], authorId: userIds[comment.author], body: comment.body },
      })
    }
  }, { timeout: 30000 })

  console.log(`Seeded ${users.length} users, ${teams.length} teams, ${projects.length} projects, ${issues.length} issues, ${labels.length} labels and ${comments.length} comments.`)
}

try {
  await seed()
} finally {
  await prisma.$disconnect()
}
