import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api.js'
import { queryClient } from './queryClient.js'
import { useShell } from './shellContext.js'

const teamQuery = key => ({ queryKey: ['team', key], queryFn: () => api.getTeam(key) })
const projectsQuery = (filters = {}) => ({ queryKey: ['projects', filters], queryFn: () => api.getProjects(filters) })
const issuesQuery = (filters = {}) => ({ queryKey: ['issues', filters], queryFn: () => api.getIssues(filters) })
const issueQuery = identifier => ({ queryKey: ['issue', identifier], queryFn: () => api.getIssue(identifier) })
const labelsQuery = { queryKey: ['labels'], queryFn: api.getLabels }

function issueFromLists(identifier) {
  for (const [, issues] of queryClient.getQueriesData({ queryKey: ['issues'] })) {
    const found = issues?.find(issue => issue.identifier === identifier)
    if (found) return found
  }
  return undefined
}

export function prefetchIssue(identifier) {
  const teamKey = identifier.split('-')[0]
  for (const query of [issueQuery(identifier), teamQuery(teamKey), projectsQuery({ team: teamKey }), labelsQuery]) {
    queryClient.prefetchQuery(query)
  }
}

const pagePrefetches = {
  '/my-issues': () => [issuesQuery({ assignee: 'me' })],
  '/projects': () => [projectsQuery()],
  '/overview': () => [issuesQuery({ assignee: 'me' }), projectsQuery()],
}

export function prefetchPage(path) {
  const teamKey = /^\/team\/([^/]+)$/.exec(path)?.[1]
  const queries = teamKey ? [teamQuery(teamKey), issuesQuery({ team: teamKey })] : pagePrefetches[path]?.() ?? []
  for (const query of queries) queryClient.prefetchQuery(query)
}

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: api.getMe })
export const useTeams = () => useQuery({ queryKey: ['teams'], queryFn: api.getTeams })
export const useTeam = key => useQuery(teamQuery(key))
export const useCycles = (key, enabled = true) => useQuery({ queryKey: ['cycles', key], queryFn: () => api.getCycles(key), enabled })
export const usePerson = (id, since) => useQuery({ queryKey: ['person', id, since], queryFn: () => api.getPerson(id, since), enabled: Boolean(id), refetchInterval: 60000 })
export const useTeamMomentum = (key, today) => useQuery({ queryKey: ['momentum', key, today], queryFn: () => api.getTeamMomentum(key, today), refetchInterval: 60000 })
export const useViews = () => useQuery({ queryKey: ['views'], queryFn: api.getViews })
export const useView = id => useQuery({ queryKey: ['view', id], queryFn: () => api.getView(id) })
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications, refetchInterval: 60000 })
export const useProjects = filters => useQuery(projectsQuery(filters))
export const useProject = id => useQuery({ queryKey: ['project', id], queryFn: () => api.getProject(id) })
export const useIssues = filters => useQuery(issuesQuery(filters))
export const useIssue = identifier => useQuery({ ...issueQuery(identifier), placeholderData: () => issueFromLists(identifier) })
export const useLabels = () => useQuery(labelsQuery)
export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: api.getUsers })
export const useWorkspace = () => useQuery({ queryKey: ['workspace'], queryFn: api.getWorkspace })
export const useIsAdmin = () => useMe().data?.role === 'ADMIN'
export const useIssueStats = scope => useQuery({ queryKey: ['issue-stats', scope], queryFn: () => api.getIssueStats(scope) })

function useSaving(mutationFn, keysToRefresh) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => Promise.all(keysToRefresh.map(key => client.invalidateQueries({ queryKey: [key] }))),
  })
}

export const useUpdateWorkspace = () => useSaving(api.updateWorkspace, ['workspace'])
export const useUpdateUserRole = () => useSaving(({ id, role }) => api.updateUserRole(id, role), ['users', 'me'])
export const useCreateTeam = () => useSaving(api.createTeam, ['teams', 'users'])
export const useUpdateTeam = () => useSaving(({ key, fields }) => api.updateTeam(key, fields), ['teams', 'team', 'cycles', 'issues', 'issue'])
export const useAddTeamMember = () => useSaving(({ key, userId }) => api.addTeamMember(key, userId), ['team', 'teams', 'users'])
export const useRemoveTeamMember = () => useSaving(({ key, userId }) => api.removeTeamMember(key, userId), ['team', 'teams', 'users'])
export const useCreateLabel = () => useSaving(api.createLabel, ['labels'])
export const useUpdateLabel = () => useSaving(({ id, fields }) => api.updateLabel(id, fields), ['labels', 'issues', 'issue'])
export const useSaveView = () => useSaving(
  ({ id, fields }) => (id ? api.updateView(id, fields) : api.createView(fields)),
  ['views', 'view'],
)
export function useDeleteView() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteView,
    onSuccess: (_data, id) => client.removeQueries({ queryKey: ['view', id], exact: true }),
    onSettled: () => client.invalidateQueries({ queryKey: ['views'] }),
  })
}
export const useMarkNotification = () => useSaving(({ id, read }) => api.markNotification(id, read), ['notifications'])
export const useMarkAllNotificationsRead = () => useSaving(api.markAllNotificationsRead, ['notifications'])
export const useSaveProject = () => useSaving(
  ({ id, fields }) => (id ? api.updateProject(id, fields) : api.createProject(fields)),
  ['projects', 'project'],
)

const workDataKeys = ['issues', 'issue', 'issue-stats', 'projects', 'project', 'teams', 'team', 'cycles', 'person', 'momentum']
const fieldsShownRightAway = ['status', 'priority', 'title', 'description', 'dueDate']

function useRefreshWorkData() {
  const client = useQueryClient()
  return () => Promise.all(workDataKeys.map(key => client.invalidateQueries({ queryKey: [key] })))
}

export function useUpdateIssue() {
  const client = useQueryClient()
  const refresh = useRefreshWorkData()
  const shell = useShell()
  return useMutation({
    mutationFn: ({ identifier, changes }) => api.updateIssue(identifier, changes),
    onMutate: async ({ identifier, changes }) => {
      if (changes.status === 'DONE') {
        const before = client.getQueryData(['issue', identifier])
          ?? client.getQueriesData({ queryKey: ['issues'] }).flatMap(([, issues]) => issues ?? []).find(issue => issue.identifier === identifier)
        if (before?.status !== 'DONE') shell?.showToast(`Nice! ${identifier} is done ✓`)
      }
      const teamKey = identifier.split('-')[0]
      const labels = client.getQueryData(['labels'])
      const members = client.getQueryData(['team', teamKey])?.members
      const projects = client.getQueryData(['projects', { team: teamKey }])
      const shown = {
        ...Object.fromEntries(Object.entries(changes).filter(([field]) => fieldsShownRightAway.includes(field))),
        ...(changes.labelIds && labels && { labels: labels.filter(label => changes.labelIds.includes(label.id)) }),
        ...('assigneeId' in changes && members && { assignee: members.find(member => member.id === changes.assigneeId) ?? null }),
        ...('projectId' in changes && projects && { project: projects.find(project => project.id === changes.projectId) ?? null }),
      }
      await Promise.all([client.cancelQueries({ queryKey: ['issues'] }), client.cancelQueries({ queryKey: ['issue', identifier] })])
      client.setQueriesData({ queryKey: ['issues'] }, issues =>
        issues?.map(issue => (issue.identifier === identifier ? { ...issue, ...shown } : issue)))
      client.setQueryData(['issue', identifier], issue => issue && { ...issue, ...shown })
    },
    onSettled: refresh,
  })
}

export function useDeleteIssue() {
  const refresh = useRefreshWorkData()
  return useMutation({ mutationFn: api.deleteIssue, onSettled: refresh })
}

export function useCreateIssue() {
  const refresh = useRefreshWorkData()
  return useMutation({ mutationFn: api.createIssue, onSettled: refresh })
}

// Adds or removes a "blocked by" link. The server answers with the updated issue, so the page updates at once.
export function useBlocker(identifier) {
  const client = useQueryClient()
  const refresh = useRefreshWorkData()
  return useMutation({
    mutationFn: ({ blocker, remove }) => (remove ? api.removeBlocker(identifier, blocker) : api.addBlocker(identifier, blocker)),
    onSuccess: issue => client.setQueryData(['issue', identifier], issue),
    onSettled: refresh,
  })
}

export function useAddComment(identifier) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: body => api.addComment(identifier, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['issue', identifier] }),
  })
}
