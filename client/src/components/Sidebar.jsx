import EmptyState from './EmptyState.jsx'
import { People, Layers as SavedViewsPicture } from './EmptyPictures.jsx'
import { useRef, useState, useSyncExternalStore } from 'react'
import { matchPath, useLocation, useSearchParams } from 'react-router'
import { Activity as ActivityIcon, ChevronDown, CircleDot, Gauge, Folder, Inbox, Layers, LayoutGrid, ListChecks, Menu, Search, SquarePen, X } from 'lucide-react'
import AccountMenu from './AccountMenu.jsx'
import ContextLink from './ContextLink.jsx'
import Dialog from './Dialog.jsx'
import ViewActionLink from './ViewActionLink.jsx'
import { prefetchPage, useIsAdmin, useMe, useNotifications, useTeams, useViews } from '../lib/queries.js'
import { iconProps } from '../lib/icons.js'
import { useShell } from '../lib/shellContext.js'
import { useRememberedList } from '../lib/sidebarMemory.js'
import './sidebar.css'

const icons = {
  overview: LayoutGrid,
  inbox: Inbox,
  myIssues: ListChecks,
  issues: CircleDot,
  projects: Folder,
  views: Layers,
  activity: ActivityIcon,
  momentum: Gauge,
}

const mobileNavigation = window.matchMedia('(max-width: 768px)')

function subscribeToNavigationWidth(onChange) {
  mobileNavigation.addEventListener('change', onChange)
  return () => mobileNavigation.removeEventListener('change', onChange)
}

function usesMobileNavigation() {
  return mobileNavigation.matches
}

function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase()
}

function Chevron() {
  return <ChevronDown {...iconProps} className="sidebar-chevron" />
}

function SidebarLink({ to, active, icon: Icon, children }) {
  return (
    <ContextLink to={to} className="sidebar-item" aria-current={active ? 'page' : undefined} onPointerEnter={() => prefetchPage(to)}>
      {Icon && <Icon {...iconProps} className="sidebar-icon" />}
      {children}
    </ContextLink>
  )
}

function Section({ id, title, closed, onToggle, children }) {
  return (
    <section className="sidebar-section" aria-labelledby={`sidebar-${id}-heading`}>
      <h2 className="sidebar-heading">
        <button type="button" id={`sidebar-${id}-heading`} className="sidebar-heading-button"
          aria-expanded={!closed} aria-controls={`sidebar-${id}`} onClick={onToggle}>
          {title}
          <Chevron />
        </button>
      </h2>
      <div id={`sidebar-${id}`} hidden={closed}>
        {children}
      </div>
    </section>
  )
}

function useCurrentTeam(views) {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const teamPage = matchPath('/team/:teamKey/*', pathname)?.params.teamKey
  const issueTeam = matchPath('/issue/:identifier', pathname)?.params.identifier.replace(/-\d+$/, '')
  const viewId = matchPath('/views/:viewId', pathname)?.params.viewId
  const viewTeam = viewId && views?.find(view => view.id === viewId)?.team?.key
  return (teamPage ?? issueTeam ?? searchParams.get('team') ?? viewTeam ?? '').toUpperCase()
}

export default function Sidebar() {
  const isMobile = useSyncExternalStore(subscribeToNavigationWidth, usesMobileNavigation)
  const [menuOpen, setMenuOpen] = useState(false)
  const [wasMobile, setWasMobile] = useState(isMobile)
  if (wasMobile !== isMobile) {
    setWasMobile(isMobile)
    setMenuOpen(false)
  }
  const closeButton = useRef(null)
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const pageTeam = searchParams.get('team')
  const { openCreateIssue, openCommandMenu } = useShell()
  const me = useMe()
  const isAdmin = useIsAdmin()
  const teams = useTeams()
  const views = useViews()
  const notifications = useNotifications().data
  const unread = notifications?.unreadCount ?? 0
  const closedSections = useRememberedList('closed-sections')
  const openTeams = useRememberedList('open-teams')
  const currentTeam = useCurrentTeam(views.data)
  const [shownTeam, setShownTeam] = useState('')
  if (shownTeam !== currentTeam) {
    setShownTeam(currentTeam)
    if (currentTeam) openTeams.add(currentTeam)
  }

  const onPath = path => pathname === path || pathname.startsWith(`${path}/`)
  const teamHasNews = key => notifications?.notifications.some(item => !item.read && item.issue.identifier.startsWith(`${key}-`))

  function closeMenu() {
    closeButton.current?.closest('dialog')?.close()
    setMenuOpen(false)
  }

  const links = (
    <nav aria-label="Main" className={isMobile ? 'navigation-drawer-links' : 'sidebar'}
      onClick={event => { if (isMobile && event.target.closest('a')) closeMenu() }}>
      <div className="sidebar-top">
        {me.data && <AccountMenu me={me.data} />}
        <button type="button" className="icon-button" aria-label="Search" title="Search · Ctrl K" onClick={() => { closeMenu(); openCommandMenu() }}>
          <Search {...iconProps} />
        </button>
        <button type="button" className="icon-button" aria-label="New issue" title="New issue · C" onClick={() => { closeMenu(); openCreateIssue() }}>
          <SquarePen {...iconProps} />
        </button>
      </div>

      <div className="sidebar-scroll">
        <ul className="sidebar-links">
          <li>
            <SidebarLink to="/overview" active={onPath('/overview')} icon={icons.overview}>Overview</SidebarLink>
          </li>
          <li>
            <SidebarLink to="/inbox" active={onPath('/inbox')} icon={icons.inbox}>
              <span className="sidebar-item-text">Inbox</span>
              {unread > 0 && (
                <span className="sidebar-badge">
                  {unread > 99 ? '99+' : unread}
                  <span className="visually-hidden"> unread</span>
                </span>
              )}
            </SidebarLink>
          </li>
          <li>
            <SidebarLink to="/my-issues" active={onPath('/my-issues')} icon={icons.myIssues}>My issues</SidebarLink>
          </li>
          {me.data && (
            <li>
              <SidebarLink to={`/people/${me.data.id}`} active={pathname === `/people/${me.data.id}`} icon={icons.activity}>My activity</SidebarLink>
            </li>
          )}
        </ul>

        <Section id="workspace" title="Workspace" closed={closedSections.has('workspace')} onToggle={() => closedSections.toggle('workspace')}>
          <ul className="sidebar-links">
            <li>
              <SidebarLink to="/projects" active={onPath('/projects') && !pageTeam} icon={icons.projects}>Projects</SidebarLink>
            </li>
            <li>
              <SidebarLink to="/views" active={pathname === '/views' && !pageTeam} icon={icons.views}>Views</SidebarLink>
            </li>
          </ul>
        </Section>

        <Section id="teams" title="Your teams" closed={closedSections.has('teams')} onToggle={() => closedSections.toggle('teams')}>
          {teams.isError && (
            <p className="sidebar-note is-error" role="alert">
              Teams could not load.{' '}
              <button type="button" className="link-button" onClick={() => teams.refetch()}>
                Try again
              </button>
            </p>
          )}
          {teams.data?.length === 0 && <EmptyState illustration={People} title="No teams yet" description="Your teams appear here." compact />}
          <ul className="sidebar-links">
            {(teams.data ?? []).map(team => {
              const open = openTeams.has(team.key)
              const inTeam = team.key === currentTeam
              return (
                <li key={team.key}>
                  <button type="button" className="sidebar-item sidebar-team" aria-expanded={open}
                    aria-controls={`sidebar-team-${team.key}`} onClick={() => openTeams.toggle(team.key)}>
                    <span className="sidebar-team-icon" aria-hidden="true">{initials(team.name)}</span>
                    <span className="sidebar-item-text">{team.name}</span>
                    <Chevron />
                    {!open && teamHasNews(team.key) && (
                      <span className="sidebar-dot">
                        <span className="visually-hidden">New activity</span>
                      </span>
                    )}
                  </button>
                  <ul id={`sidebar-team-${team.key}`} className="sidebar-links sidebar-team-links" hidden={!open}>
                    <li>
                      <SidebarLink to={`/team/${team.key}`} active={inTeam && !onPath('/projects') && !onPath('/views') && !pathname.endsWith('/momentum')} icon={icons.issues}>
                        Issues
                      </SidebarLink>
                    </li>
                    {isAdmin && (
                      <li>
                      <SidebarLink to={`/team/${team.key}/momentum`} active={pathname === `/team/${team.key}/momentum`} icon={icons.momentum}>
                        Momentum
                      </SidebarLink>
                    </li>
                    )}
                    <li>
                      <SidebarLink to={`/projects?team=${team.key}`} active={pathname === '/projects' && pageTeam === team.key} icon={icons.projects}>
                        Projects
                      </SidebarLink>
                    </li>
                    <li>
                      <SidebarLink to={`/views?team=${team.key}`} active={pathname === '/views' && pageTeam === team.key} icon={icons.views}>
                        Views
                      </SidebarLink>
                    </li>
                  </ul>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section id="views" title="Views" closed={closedSections.has('views')} onToggle={() => closedSections.toggle('views')}>
          {views.data?.length === 0 && <EmptyState illustration={SavedViewsPicture} title="No saved views" description="Save issue filters to see them here." compact />}
          <ul className="sidebar-links">
            {(views.data ?? []).map(view => (
              <li key={view.id}>
                <ViewActionLink view={view} className="sidebar-item" aria-current={pathname === `/views/${view.id}` ? 'page' : undefined}>
                  <Layers {...iconProps} className="sidebar-icon" />
                  <span className="sidebar-item-text">{view.name}</span>
                </ViewActionLink>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </nav>
  )

  if (!isMobile) return links

  return (
    <div className="mobile-navigation">
      <button type="button" className="icon-button navigation-toggle" aria-label="Open menu"
        aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
        <Menu {...iconProps} size={22} />
      </button>
      <div className="mobile-navigation-actions">
        <button type="button" className="icon-button" aria-label="Search" onClick={openCommandMenu}>
          <Search {...iconProps} size={20} />
        </button>
        <button type="button" className="icon-button" aria-label="New issue" onClick={() => openCreateIssue()}>
          <SquarePen {...iconProps} size={20} />
        </button>
      </div>
      {menuOpen && (
        <Dialog label="Main menu" className="navigation-drawer" onClose={closeMenu}>
          <div className="navigation-drawer-content">
            <button ref={closeButton} type="button" className="icon-button navigation-close" aria-label="Close menu" data-autofocus onClick={closeMenu}>
              <X {...iconProps} size={22} />
            </button>
            {links}
          </div>
        </Dialog>
      )}
    </div>
  )
}
