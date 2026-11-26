import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useMe } from '../../lib/queries.js'
import './settings.css'

const personal = [
  { path: 'personal', label: 'Preferences' },
  { path: 'personal', search: '?view=profile', label: 'Profile' },
]

const workspace = [
  { path: 'workspace', label: 'Workspace' },
  { path: 'users', label: 'Users and roles' },
  { path: 'teams', label: 'Teams' },
  { path: 'labels', label: 'Labels' },
]

export default function SettingsLayout() {
  const { data: user } = useMe()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const profile = new URLSearchParams(search).get('view') === 'profile'
  const groups = [{ label: 'Personal', items: personal }]
  if (user?.role === 'ADMIN') groups.push({ label: 'Workspace', items: workspace })

  const searchTerm = filter.trim().toLowerCase()
  const visibleGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => item.label.toLowerCase().includes(searchTerm)),
  })).filter(group => group.items.length > 0)

  return (
    <div className="settings">
      <nav className="settings-sidebar" aria-label="Settings">
        <Link to="/overview" className="settings-back">
          <span aria-hidden="true">←</span> Back to app
        </Link>
        <select className="input settings-mobile-select" aria-label="Settings page"
          value={pathname.toLowerCase().replace(/\/$/, '') + (profile ? '?view=profile' : '')}
          onChange={event => navigate(event.target.value)}>
          {groups.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map(item => (
                <option key={item.label} value={'/settings/' + item.path + (item.search ?? '')}>{item.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="settings-directory">
          <label htmlFor="settings-search" className="visually-hidden">Search settings</label>
          <input id="settings-search" className="input" type="search" placeholder="Search settings" value={filter} onChange={event => setFilter(event.target.value)} />
          {visibleGroups.map(group => (
            <div className="settings-nav-group" key={group.label}>
              <h2>{group.label}</h2>
              <ul>
                {group.items.map(item => {
                  const target = '/settings/' + item.path
                  const active = pathname.toLowerCase().replace(/\/$/, '') === target
                    && (item.path !== 'personal' || profile === Boolean(item.search))
                  return (
                    <li key={item.label}>
                      <Link to={target + (item.search ?? '')} aria-current={active ? 'page' : undefined}>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {visibleGroups.length === 0 && <p className="muted" role="status">No matching settings.</p>}
        </div>
      </nav>
      <div className="settings-body">
        <Outlet context={profile} />
      </div>
    </div>
  )
}
