import { Circle, CircleCheck, CircleDashed, CircleX, Contrast } from 'lucide-react'
import { iconProps } from '../lib/icons.js'

const icons = {
  BACKLOG: CircleDashed,
  TODO: Circle,
  IN_PROGRESS: Contrast,
  DONE: CircleCheck,
  CANCELED: CircleX,
}

export default function StatusIcon({ status }) {
  const Icon = icons[status] ?? Circle
  return <Icon {...iconProps} className={`status-icon is-${status}`} />
}
