import FieldPicker from './FieldPicker.jsx'
import EmptyState from './EmptyState.jsx'
import { People } from './EmptyPictures.jsx'
import { useState } from 'react'
import Avatar from './Avatar.jsx'
import QueryState from './QueryState.jsx'
import { formatDateWithYear } from '../lib/format.js'
import { useAddTeamMember, useRemoveTeamMember, useTeam, useUpdateTeam } from '../lib/queries.js'

const todayString = () => new Date().toLocaleDateString('en-CA')

function CycleSettings({ team, updateTeam }) {
  const [weeks, setWeeks] = useState('2')
  const [startDate, setStartDate] = useState(todayString)

  if (team.cycleWeeks) {
    return (
      <div className="settings-row settings-pair">
        <div className="settings-row-main">
          <strong>Cycles</strong>
          <span className="settings-description">
            Every {team.cycleWeeks === 1 ? 'week' : '2 weeks'}, starting {formatDateWithYear(team.cycleStartDate)}.
          </span>
        </div>
        <button
          type="button"
          className="button"
          disabled={updateTeam.isPending}
          onClick={() => updateTeam.mutate({ key: team.key, fields: { cycleWeeks: null } })}
        >
          Turn off cycles
        </button>
      </div>
    )
  }

  return (
    <form
      className="settings-row settings-inline"
      onSubmit={event => {
        event.preventDefault()
        if (startDate) updateTeam.mutate({ key: team.key, fields: { cycleWeeks: Number(weeks), cycleStartDate: startDate } })
      }}
    >
      <label className="settings-field">
        Cycle length
        <FieldPicker label="Cycle length" className="input" value={weeks} onChange={event => setWeeks(event.target.value)}>
          <option value="1">1 week</option>
          <option value="2">2 weeks</option>
        </FieldPicker>
      </label>
      <label className="settings-field">
        First cycle starts
        <input type="date" className="input" value={startDate} required onChange={event => setStartDate(event.target.value)} />
      </label>
      <button type="submit" className="button" disabled={!startDate || updateTeam.isPending}>
        Turn on cycles
      </button>
    </form>
  )
}

export default function TeamSettingsCard({ team, users }) {
  const detail = useTeam(team.key)
  const updateTeam = useUpdateTeam()
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()
  const [name, setName] = useState(team.name)
  const [newMemberId, setNewMemberId] = useState('')
  const error = [updateTeam, addMember, removeMember].find(mutation => mutation.isError)?.error

  function saveName(event) {
    event.preventDefault()
    if (name.trim() && name.trim() !== team.name) updateTeam.mutate({ key: team.key, fields: { name: name.trim() } })
  }

  return (
    <article className="settings-team" aria-labelledby={`team-${team.key}`}>
      <h3 id={`team-${team.key}`}>
        {team.name} <span className="muted">{team.key}</span>
      </h3>
      <div className="settings-card">
        <form className="settings-row settings-pair" onSubmit={saveName}>
          <div className="settings-row-main">
            <label htmlFor={`team-name-${team.key}`} className="settings-row-title">Team name<span className="visually-hidden"> for {team.name}</span></label>
            <span className="settings-description">Shown in team navigation.</span>
          </div>
          <div className="settings-inline">
            <input id={`team-name-${team.key}`} className="input" value={name} maxLength={60} onChange={event => setName(event.target.value)} />
            <button type="submit" className="button" disabled={updateTeam.isPending || !name.trim() || name.trim() === team.name}>
              Rename
            </button>
          </div>
        </form>
        <CycleSettings team={team} updateTeam={updateTeam} />
        {error && <p className="settings-feedback inline-error" role="alert">{error.message}</p>}
        <QueryState query={detail} label="members">
          {data => {
            const memberIds = new Set(data.members.map(member => member.id))
            const others = users.filter(user => !memberIds.has(user.id))
            return (
              <>
                <ul className="settings-list">
                  {data.members.length === 0 && <li><EmptyState illustration={People} title="No members yet" description="People added to this team appear here." compact /></li>}
                  {data.members.map(member => (
                    <li key={member.id} className="settings-row">
                      <Avatar name={member.name} />
                      <span className="settings-row-main settings-row-title">{member.name}</span>
                      <button
                        type="button"
                        className="button"
                        aria-label={`Remove ${member.name} from ${team.name}`}
                        disabled={removeMember.isPending}
                        onClick={() => removeMember.mutate({ key: team.key, userId: member.id })}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                {others.length > 0 && (
                  <form
                    className="settings-row settings-inline"
                    onSubmit={event => {
                      event.preventDefault()
                      if (newMemberId) addMember.mutate({ key: team.key, userId: newMemberId }, { onSuccess: () => setNewMemberId('') })
                    }}
                  >
                    <label htmlFor={`add-member-${team.key}`} className="visually-hidden">
                      Person to add to {team.name}
                    </label>
                    <FieldPicker label="Person to add" id={`add-member-${team.key}`} className="input" value={newMemberId} onChange={event => setNewMemberId(event.target.value)}>
                      <option value="">Choose a person…</option>
                      {others.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </FieldPicker>
                    <button type="submit" className="button" disabled={!newMemberId || addMember.isPending}>
                      Add to team
                    </button>
                  </form>
                )}
              </>
            )
          }}
        </QueryState>
      </div>
    </article>
  )
}
