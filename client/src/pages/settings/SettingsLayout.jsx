import EmptyState from '../../components/EmptyState.jsx'
import { Search } from '../../components/EmptyPictures.jsx'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { ArrowLeft, Building2, ChevronDown, Settings2, Tags, UserRound, UsersRound, Network } from 'lucide-react'
import { useMe } from '../../lib/queries.js'
import { iconProps } from '../../lib/icons.js'
import './settings.css'

const destinations = [
  { path: '/settings/personal', label: 'Preferences', icon: Settings2 },
  { path: '/settings/personal?view=profile', label: 'Profile', icon: UserRound },
  { path: '/settings/workspace', label: 'Workspace details', icon: Building2, admin: true },
  { path: '/settings/users', label: 'Users and roles', icon: UsersRound, admin: true },
  { path: '/settings/teams', label: 'Teams', icon: Network, admin: true },
  { path: '/settings/labels', label: 'Labels', icon: Tags, admin: true },
]

function SettingsNavigation({ current, items }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const selected = items.find(item => item.path === current)
  const CurrentIcon = selected?.icon ?? Settings2
  const term = filter.trim().toLowerCase()
  const matches = items.filter(item => item.label.toLowerCase().includes(term))

  return (
    <nav className="settings-sidebar" aria-label="Settings">
      <Link to="/overview" className="settings-back"><ArrowLeft {...iconProps} />Back to app</Link>
      <button type="button" className="button settings-switch" aria-expanded={open} aria-controls="settings-directory"
        onClick={() => setOpen(!open)}>
        <CurrentIcon {...iconProps} />{selected?.label ?? 'Settings'}<ChevronDown {...iconProps} />
      </button>
      <div id="settings-directory" className="settings-directory" data-open={open}>
        <label htmlFor="settings-search" className="visually-hidden">Search settings</label>
        <input id="settings-search" className="input" type="search" placeholder="Search settings" value={filter} onChange={event => setFilter(event.target.value)} />
        <ul className="settings-nav-group">
          {matches.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <Link to={path} aria-current={path === current ? 'page' : undefined} onClick={() => setOpen(false)}>
                <Icon {...iconProps} />{label}
              </Link>
            </li>
          ))}
        </ul>
        {!matches.length && <EmptyState illustration={Search} title="No matching settings" description="Try a different settings name." compact role="status" />}
      </div>
    </nav>
  )
}

export default function SettingsLayout() {
  const { data: user } = useMe()
  const { pathname, search } = useLocation()
  const path = pathname.toLowerCase().replace(/\/$/, '')
  const profile = path === '/settings/personal' && new URLSearchParams(search).get('view') === 'profile'
  const current = path + (profile ? '?view=profile' : '')
  const items = destinations.filter(item => !item.admin || user?.role === 'ADMIN')

  return (
    <div className="settings">
      <SettingsNavigation key={current} current={current} items={items} />
      <div className="settings-body"><Outlet context={profile} /></div>
    </div>
  )
}
