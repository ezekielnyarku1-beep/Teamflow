import FieldPicker from '../../components/FieldPicker.jsx'
import { useState } from 'react'
import { useOutletContext } from 'react-router'
import QueryState from '../../components/QueryState.jsx'
import { appearances, getAppearance, saveAppearance } from '../../lib/appearance.js'
import { useMe } from '../../lib/queries.js'

function Preferences() {
  const [appearance, setAppearance] = useState(getAppearance)
  const [saved, setSaved] = useState(true)

  function changeAppearance(event) {
    const selection = event.target.value
    setAppearance(selection)
    setSaved(saveAppearance(selection))
  }

  return (
    <>
      <h1>Preferences</h1>
      <section className="settings-section" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        <div className="settings-card">
          <div className="settings-row settings-pair">
            <div className="settings-row-main">
              <label htmlFor="appearance" className="settings-row-title">Color theme</label>
              <span id="appearance-description" className="settings-description">Choose how the app looks on this device.</span>
            </div>
            <FieldPicker label="Color theme" id="appearance" aria-describedby="appearance-description" className="input settings-role" value={appearance} onChange={changeAppearance}>
              {appearances.map(theme => (
                <option key={theme} value={theme}>{theme[0].toUpperCase() + theme.slice(1)}</option>
              ))}
            </FieldPicker>
          </div>
          {!saved && <p className="settings-feedback muted" role="status">This browser could not save your theme.</p>}
        </div>
      </section>
    </>
  )
}

function Profile() {
  const me = useMe()

  return (
    <>
      <h1>Profile</h1>
      <section className="settings-section" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Account details</h2>
        <div className="settings-card">
          <QueryState query={me} label="your profile">
            {user => (
              <dl className="settings-profile">
                <div className="settings-row settings-pair">
                  <dt><strong>Name</strong><span className="settings-description">Your display name in the workspace.</span></dt>
                  <dd>{user.name}</dd>
                </div>
                <div className="settings-row settings-pair">
                  <dt><strong>Email</strong><span className="settings-description">The email address on your account.</span></dt>
                  <dd>{user.email}</dd>
                </div>
                <div className="settings-row settings-pair">
                  <dt><strong>Role</strong><span className="settings-description">Your access level in this workspace.</span></dt>
                  <dd>{user.role === 'ADMIN' ? 'Admin' : 'Member'}</dd>
                </div>
              </dl>
            )}
          </QueryState>
        </div>
      </section>
    </>
  )
}

export default function PersonalSettingsPage() {
  const profile = useOutletContext()
  return profile ? <Profile /> : <Preferences />
}
