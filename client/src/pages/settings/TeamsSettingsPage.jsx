import EmptyState from '../../components/EmptyState.jsx'
import { People } from '../../components/EmptyPictures.jsx'
import { useState } from 'react'
import QueryState from '../../components/QueryState.jsx'
import TeamSettingsCard from '../../components/TeamSettingsCard.jsx'
import { useCreateTeam, useTeams, useUsers } from '../../lib/queries.js'

export default function TeamsSettingsPage() {
  const teams = useTeams()
  const users = useUsers()
  const createTeam = useCreateTeam()
  const [key, setKey] = useState('')
  const [name, setName] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!key.trim() || !name.trim()) return
    createTeam.mutate({ key: key.trim(), name: name.trim() }, {
      onSuccess: () => {
        setKey('')
        setName('')
      },
    })
  }

  return (
    <>
      <h1>Teams</h1>
      <section className="settings-section" aria-labelledby="new-team-heading">
        <h2 id="new-team-heading">New team</h2>
        <form className="settings-card settings-form" onSubmit={submit}>
          <div className="settings-row settings-pair">
            <div className="settings-row-main">
              <strong>Team details</strong>
              <span className="settings-description">The key starts issue IDs, like ENG-12, and cannot be changed later.</span>
            </div>
            <div className="settings-inline">
              <label className="settings-field">
                Key
                <input className="input settings-key" value={key} maxLength={10} placeholder="ENG" onChange={event => setKey(event.target.value.toUpperCase())} />
              </label>
              <label className="settings-field settings-grow">
                Name
                <input className="input" value={name} maxLength={60} placeholder="Engineering" onChange={event => setName(event.target.value)} />
              </label>
              <button type="submit" className="button is-primary" disabled={!key.trim() || !name.trim() || createTeam.isPending}>
                {createTeam.isPending ? 'Creating…' : 'Create team'}
              </button>
            </div>
          </div>
          {createTeam.isError && <p className="settings-feedback inline-error" role="alert">{createTeam.error.message}</p>}
        </form>
      </section>
      <section className="settings-section" aria-labelledby="teams-heading">
        <h2 id="teams-heading">Workspace teams</h2>
        <QueryState query={users} label="users">
          {userList => (
            <QueryState query={teams} label="teams">
              {teamList => (
                teamList.length === 0 ? <EmptyState illustration={People} title="No teams yet" description="Teams group people and their work." /> : (
                  <div className="settings-cards">
                    {teamList.map(team => (
                      <TeamSettingsCard key={team.key} team={team} users={userList} />
                    ))}
                  </div>
                )
              )}
            </QueryState>
          )}
        </QueryState>
      </section>
    </>
  )
}
