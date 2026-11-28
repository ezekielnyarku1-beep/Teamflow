import { Router } from 'express'
import { prisma } from '../db.js'
import { isAdmin, visibleTeamsWhere } from '../access.js'
import { daysAgo, loadFeed, maxFeedDays, readSince } from '../activityFeed.js'
import { HttpError } from '../errors.js'
import { teamSelect } from '../serializers.js'
import { isId } from '../validation.js'

export const peopleRouter = Router()

// A member's profile: who they are and what they did in the app, newest first.
// Admins see everyone. Others see themselves and people who share a team, and only work in teams they can see.
peopleRouter.get('/:id', async (request, response) => {
  const viewer = request.user
  const { id } = request.params
  const sharesTeam = isAdmin(viewer) || id === viewer.id
    ? {}
    : { memberships: { some: { team: { members: { some: { userId: viewer.id } } } } } }
  const person = isId(id) && await prisma.user.findFirst({
    where: { id, ...sharesTeam },
    select: {
      id: true,
      name: true,
      role: true,
      createdAt: true,
      memberships: { where: { team: visibleTeamsWhere(viewer) }, include: { team: teamSelect }, orderBy: { team: { name: 'asc' } } },
    },
  })
  if (!person) throw new HttpError(404, 'Person not found.')

  const since = readSince(request.query.since, daysAgo(14))
  if (since < daysAgo(maxFeedDays + 1)) throw new HttpError(400, `Activity goes back at most ${maxFeedDays} days.`)
  const events = await loadFeed({ userId: person.id, teamWhere: visibleTeamsWhere(viewer), since })

  response.json({
    id: person.id,
    name: person.name,
    role: person.role,
    joinedAt: person.createdAt.toISOString(),
    teams: person.memberships.map(membership => membership.team),
    events,
  })
})
