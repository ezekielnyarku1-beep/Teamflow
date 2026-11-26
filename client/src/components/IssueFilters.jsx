import Popover from './Popover.jsx'
import PriorityIcon from './PriorityIcon.jsx'
import { countActiveFilters, emptyFilter } from '../lib/issueFilter.js'
import { priorities } from '../lib/issueOptions.js'

function uniqueById(items) {
  return [...new Map(items.map(item => [item.id, item])).values()].sort((a, b) => a.name.localeCompare(b.name))
}

function CheckboxGroup({ legend, options, selected, onChange }) {
  if (!options.length) return null
  return (
    <fieldset className="filter-group">
      <legend>{legend}</legend>
      {options.map(option => (
        <label key={option.value} className="filter-option">
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={event =>
              onChange(event.target.checked ? [...selected, option.value] : selected.filter(value => value !== option.value))}
          />
          {option.icon}
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

export default function IssueFilters({ issues, filter, onChange }) {
  const activeCount = countActiveFilters(filter)
  const assignees = uniqueById(issues.flatMap(issue => (issue.assignee ? [issue.assignee] : [])))
  const labels = uniqueById(issues.flatMap(issue => issue.labels))
  const set = field => value => onChange({ ...filter, [field]: value })

  return (
    <Popover label={activeCount ? `Filter, ${activeCount} active` : 'Filter'} buttonContent={activeCount ? `Filter · ${activeCount}` : 'Filter'}>
      {() => (
        <div className="filter-menu">
          <CheckboxGroup
            legend="Priority"
            options={priorities.map(option => ({ ...option, icon: <PriorityIcon priority={option.value} /> }))}
            selected={filter.priorities}
            onChange={set('priorities')}
          />
          <CheckboxGroup
            legend="Assignee"
            options={assignees.map(person => ({ value: person.id, label: person.name }))}
            selected={filter.assigneeIds}
            onChange={set('assigneeIds')}
          />
          <CheckboxGroup
            legend="Labels"
            options={labels.map(label => ({ value: label.id, label: label.name }))}
            selected={filter.labelIds}
            onChange={set('labelIds')}
          />
          <fieldset className="filter-group">
            <legend>Display</legend>
            <label className="filter-option">
              <input type="checkbox" checked={filter.showClosed} onChange={event => set('showClosed')(event.target.checked)} />
              Show done and canceled
            </label>
          </fieldset>
          {activeCount > 0 && (
            <button type="button" className="button" onClick={() => onChange(emptyFilter)}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </Popover>
  )
}
