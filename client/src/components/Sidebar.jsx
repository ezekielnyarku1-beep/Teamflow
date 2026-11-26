import { useRef, useState, useSyncExternalStore } from 'react'
import { Link, matchPath, useLocation, useSearchParams } from 'react-router'
import AccountMenu from './AccountMenu.jsx'
import Dialog from './Dialog.jsx'
import { prefetchPage, useMe, useNotifications, useTeams, useViews } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'
import { useRememberedList } from '../lib/sidebarMemory.js'
import './sidebar.css'

const icons = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  inbox: 'M3 13h5l2 3h4l2-3h5 M5.5 5h13L21 13v6H3v-6z',
  myIssues: 'm3 6 2 2 4-4 M12 6h9 m-18 9 2 2 4-4 M12 15h9',
  issues: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  projects: 'M3 7V4h6l3 3h9v13H3z',
  views: 'm12 3 9 5-9 5-9-5z m-9 10 9 5 9-5',
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

function Icon({ path, size = 16 }) {
  return (
    <svg className="sidebar-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function Chevron() {
  return (
    <svg className="sidebar-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m2.5 3.75 2.5 2.5 2.5-2.5" />
    </svg>
  )
}

function SidebarLink({ to, active, icon, children }) {
  return (
    <Link to={to} className="sidebar-item" aria-current={active ? 'page' : undefined} onPointerEnter={() => prefetchPage(to)}>
      {icon && <Icon path={icon} />}
      {children}
    </Link>
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" />
          </svg>
        </button>
        <button type="button" className="icon-button" aria-label="New issue" title="New issue · C" onClick={() => { closeMenu(); openCreateIssue() }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5" />
            <path d="m7 9 .5-2L12.5 2l1.5 1.5-5 5z" />
          </svg>
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
          {teams.data?.length === 0 && <p className="sidebar-note">You are not in any teams yet.</p>}
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
                      <SidebarLink to={`/team/${team.key}`} active={inTeam && !onPath('/projects') && !onPath('/views')} icon={icons.issues}>
                        Issues
                      </SidebarLink>
                    </li>
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
          {views.data?.length === 0 && <p className="sidebar-note">No saved views yet.</p>}
          <ul className="sidebar-links">
            {(views.data ?? []).map(view => (
              <li key={view.id}>
                <SidebarLink to={`/views/${view.id}`} active={pathname === `/views/${view.id}`} icon={icons.views}>
                  <span className="sidebar-item-text">{view.name}</span>
                </SidebarLink>
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M4 6h16 M4 12h16 M4 18h16" />
        </svg>
      </button>
      {menuOpen && (
        <Dialog label="Main menu" className="navigation-drawer" onClose={closeMenu}>
          <div className="navigation-drawer-content">
            <button ref={closeButton} type="button" className="icon-button navigation-close" aria-label="Close menu" data-autofocus onClick={closeMenu}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="m6 6 12 12 M6 18 18 6" />
              </svg>
            </button>
            {links}
          </div>
        </Dialog>
      )}
    </div>
  )
}
