import { Minus, Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react'
import { iconProps } from '../lib/icons.js'

const levels = {
  URGENT: Signal,
  HIGH: SignalHigh,
  MEDIUM: SignalMedium,
  LOW: SignalLow,
}

export default function PriorityIcon({ priority }) {
  const Level = levels[priority]
  if (!Level) return <Minus {...iconProps} className={`priority-icon is-${priority}`} />
  return (
    <span className={`priority-icon is-${priority}`} aria-hidden="true">
      <Signal {...iconProps} className="priority-icon-track" />
      <Level {...iconProps} className="priority-icon-level" />
    </span>
  )
}
