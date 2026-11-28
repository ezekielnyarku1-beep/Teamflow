import EmptyState from '../../components/EmptyState.jsx'
import { Search } from '../../components/EmptyPictures.jsx'
import { useId, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { ArrowLeft, Building2, ChevronDown, Settings2, Tags, UserRound, UsersRound, Network } from 'lucide-react'
import Popover from '../../components/Popover.jsx'
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

function SettingsDirectory({ current, items, onChoose, className }) {
  const searchId = useId()
  const [filter, setFilter] = useState('')
  const term = filter.trim().toLowerCase()
  const matches = items.filter(item => item.label.toLowerCase().includes(term))

  return (
    <div className={className}>
      <label htmlFor={searchId} className="visually-hidden">Search settings</label>
      <input id={searchId} className="input" type="search" placeholder="Search settings" value={filter} onChange={event => setFilter(event.target.value)} />
      <ul className="settings-nav-group">
        {matches.map(({ path, label, icon: Icon }) => (
          <li key={path}>
            <Link to={path} aria-current={path === current ? 'page' : undefined} onClick={onChoose}>
              <Icon {...iconProps} /><span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!matches.length && (onChoose
        ? <p className="picker-empty" role="status">No matching settings</p>
        : <EmptyState illustration={Search} title="No matching settings" description="Try a different settings name." compact role="status" />)}
    </div>
  )
}

function SettingsNavigation({ current, items }) {
  const selected = items.find(item => item.path === current)
  const CurrentIcon = selected?.icon ?? Settings2

  return (
    <nav className="settings-sidebar" aria-label="Settings">
      <Link to="/overview" className="settings-back"><ArrowLeft {...iconProps} />Back to app</Link>
      <div className="settings-mobile-directory">
        <Popover
          label={`Settings sections, ${selected?.label ?? 'Settings'}`}
          buttonClassName="button settings-switch"
          align="end"
          buttonContent={<><CurrentIcon {...iconProps} /><span>{selected?.label ?? 'Settings'}</span><ChevronDown {...iconProps} /></>}
        >
          {close => <SettingsDirectory current={current} items={items} onChoose={close} className="settings-directory-panel" />}
        </Popover>
      </div>
      <SettingsDirectory current={current} items={items} className="settings-directory" />
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
