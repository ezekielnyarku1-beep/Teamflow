import { useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, useNavigate } from 'react-router'
import Avatar from './Avatar.jsx'
import Dialog from './Dialog.jsx'
import { signOut } from '../lib/auth.js'
import { useMe, useNotifications, useTeams, useViews, useWorkspace } from '../lib/queries.js'
import { useShell } from '../lib/shellContext.js'
import { useFormAction } from '../lib/useFormAction.js'

const navigation = [
  { to: '/overview', label: 'Overview', path: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
  { to: '/inbox', label: 'Inbox', path: 'M3 13h5l2 3h4l2-3h5 M5.5 5h13L21 13v6H3v-6z' },
  { to: '/my-issues', label: 'My issues', path: 'm3 6 2 2 4-4 M12 6h9 m-18 9 2 2 4-4 M12 15h9' },
  { to: '/projects', label: 'Projects', path: 'M3 7V4h6l3 3h9v13H3z' },
  { to: '/settings', label: 'Settings', path: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6' },
]

const mobileNavigation = window.matchMedia('(max-width: 768px)')

function subscribeToNavigationWidth(onChange) {
  mobileNavigation.addEventListener('change', onChange)
  return () => mobileNavigation.removeEventListener('change', onChange)
}

function usesMobileNavigation() {
  return mobileNavigation.matches
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
  const { openCreateIssue, openCommandMenu } = useShell()
  const navigate = useNavigate()
  const me = useMe()
  const teams = useTeams()
  const workspace = useWorkspace()
  const views = useViews()
  const unread = useNotifications().data?.unreadCount ?? 0
  const logOut = useFormAction()
  const isAdmin = me.data?.role === 'ADMIN'

  function closeMenu() {
    closeButton.current?.closest('dialog')?.close()
    setMenuOpen(false)
  }

  const links = (
    <nav aria-label="Main" className={isMobile ? 'navigation-drawer-links' : 'sidebar'}
      onClick={event => { if (isMobile && event.target.closest('a')) closeMenu() }}>
      <div className="sidebar-brand">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect x="1" y="9" width="4" height="8" rx="1" />
          <rect x="7" y="5" width="4" height="12" rx="1" />
          <rect x="13" y="1" width="4" height="16" rx="1" />
        </svg>
        <span className="sidebar-brand-text">
          Overview Teams
          {workspace.data && <span className="sidebar-workspace">{workspace.data.name}</span>}
        </span>
      </div>
      <ul className="sidebar-links primary-navigation">
        {navigation.map(item => (
          <li key={item.to}>
            <NavLink to={item.to} className="sidebar-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={item.path} />
              </svg>
              <span>{item.label}</span>
              {item.to === '/inbox' && unread > 0 && (
                <span className="sidebar-badge">
                  {unread > 99 ? '99+' : unread}
                  <span className="visually-hidden"> unread</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-actions">
        <button type="button" className="sidebar-item" onClick={() => { closeMenu(); openCommandMenu() }}>
          Search
          <kbd aria-hidden="true">Ctrl K</kbd>
        </button>
        <button type="button" className="sidebar-item" onClick={() => { closeMenu(); openCreateIssue() }}>
          New issue
          <kbd aria-hidden="true">C</kbd>
        </button>
      </div>

      <h2 className="sidebar-heading" id="sidebar-teams">
        Teams
      </h2>
      {teams.isError && (
        <p className="sidebar-note" role="alert">
          Teams could not load.{' '}
          <button type="button" className="link-button" onClick={() => teams.refetch()}>
            Try again
          </button>
        </p>
      )}
      <ul className="sidebar-links" aria-labelledby="sidebar-teams">
        {(teams.data ?? []).map(team => (
          <li key={team.key}>
            <NavLink to={`/team/${team.key}`} className="sidebar-item">
              {team.name}
              <span className="sidebar-key">{team.key}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <h2 className="sidebar-heading" id="sidebar-views">
        Views
      </h2>
      <ul className="sidebar-links" aria-labelledby="sidebar-views">
        {(views.data ?? []).map(view => (
          <li key={view.id}>
            <NavLink to={`/views/${view.id}`} className="sidebar-item">
              <span className="sidebar-item-text">{view.name}</span>
            </NavLink>
          </li>
        ))}
        <li>
          <NavLink to="/views" end className="sidebar-item muted">
            All views
          </NavLink>
        </li>
      </ul>

      {me.data && (
        <div className="sidebar-user">
          <Avatar name={me.data.name} />
          <span className="sidebar-user-name">{me.data.name}</span>
          <span className="muted">{isAdmin ? 'Admin' : 'Member'}</span>
        </div>
      )}
      <button
        type="button"
        className="sidebar-item"
        disabled={logOut.busy}
        onClick={() => logOut.run(async () => {
          await signOut()
          navigate('/login', { replace: true })
        })}
      >
        {logOut.busy ? 'Logging out…' : 'Log out'}
      </button>
      {logOut.error && (
        <p className="sidebar-note" role="alert">
          {logOut.error}
        </p>
      )}
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
