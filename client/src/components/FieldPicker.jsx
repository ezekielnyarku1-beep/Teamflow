import { Children } from 'react'
import { ChevronDown } from 'lucide-react'
import { iconProps } from '../lib/icons.js'
import Picker from './Picker.jsx'

export default function FieldPicker({ label, children, value, onChange, className, 'aria-label': accessibleLabel, ...triggerProps }) {
  const options = Children.toArray(children).map(({ props }) => ({ value: props.value, label: props.children }))
  const selected = options.find(option => option.value === value)?.label
  return (
    <Picker
      label={selected ? `${accessibleLabel ?? label}: ${selected}` : accessibleLabel ?? label}
      options={options}
      value={value}
      onChange={picked => onChange({ target: { value: picked } })}
      triggerProps={triggerProps}
      buttonClassName={`${className} field-picker`}
      buttonContent={<><span>{selected}</span><ChevronDown {...iconProps} /></>}
    />
  )
}
