import { useEffect, useRef, useState } from 'react'
import { Circle, CircleCheck, Contrast } from 'lucide-react'
import { iconProps } from '../lib/icons.js'

const icons = {
  TODO: Circle,
  IN_PROGRESS: Contrast,
  DONE: CircleCheck,
}

export default function StatusIcon({ status }) {
  const Icon = icons[status] ?? Circle
  // Pop only when the status changes to Done while on screen, not for issues that were already done.
  const previous = useRef(status)
  const [justDone, setJustDone] = useState(false)
  useEffect(() => {
    if (status === 'DONE' && previous.current !== 'DONE') setJustDone(true)
    previous.current = status
  }, [status])

  return (
    <Icon
      {...iconProps}
      className={`status-icon is-${status}${justDone && status === 'DONE' ? ' is-just-done' : ''}`}
      onAnimationEnd={() => setJustDone(false)}
    />
  )
}
