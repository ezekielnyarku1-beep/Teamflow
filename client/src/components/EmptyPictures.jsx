function Picture({ children }) {
  return <svg viewBox="0 0 84 84" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}

export function Checklist() {
  return (
    <Picture>
      <rect x="18" y="15" width="48" height="56" rx="6" className="wash" />
      <path d="M28 33h6m8 0h14M28 47h6m8 0h14M28 59h20" />
      <g className="motion-check"><path d="m26 31 4 4 8-10" pathLength="1" /></g>
    </Picture>
  )
}

export function Folder() {
  return (
    <Picture>
      <path className="wash" d="M10 27q0-4 4-4h18l6 7h31q4 0 4 4v28q0 4-4 4H14q-4 0-4-4z" />
      <path d="M11 35h61M23 52h37" />
      <g className="motion-fill"><path d="M23 52h28" pathLength="1" /></g>
    </Picture>
  )
}

export function Inbox() {
  return (
    <Picture>
      <path className="wash" d="m11 51 10-20h43l10 20v13H11z" />
      <path d="M11 51h19l4 6h17l4-6h19" />
      <g className="motion-drop"><rect x="28" y="16" width="29" height="20" rx="3" /><path d="m29 18 13 10 14-10" /></g>
    </Picture>
  )
}

export function Layers() {
  return (
    <Picture>
      <path className="wash" d="m10 52 32-16 32 16-32 16z" />
      <path d="m10 42 32-16 32 16-32 16z" />
      <g className="motion-fan"><path d="m10 33 32-16 32 16-32 16z" /></g>
    </Picture>
  )
}

export function Issue() {
  return (
    <Picture>
      <circle className="wash" cx="23" cy="41" r="13" />
      <circle cx="23" cy="41" r="4" />
      <path d="M44 29h25M44 54h18" />
      <g className="motion-write"><path d="M44 41h25" strokeDasharray="4 4" /></g>
    </Picture>
  )
}

export function Card() {
  return (
    <Picture>
      <path className="wash" d="M17 26h49v34H17z" />
      <g className="motion-pulse"><rect x="14" y="21" width="56" height="42" rx="5" strokeDasharray="4 4" /></g>
    </Picture>
  )
}

export function Bubbles() {
  return (
    <Picture>
      <path className="wash" d="M13 18h34q5 0 5 5v18q0 5-5 5H30l-10 9v-9h-7q-4 0-4-5V23q0-5 4-5z" />
      <g className="motion-reply"><path d="M37 39h32q4 0 4 4v14q0 5-4 5h-4v7l-10-7H37q-4 0-4-5V43q0-4 4-4z" /></g>
    </Picture>
  )
}

export function Tag() {
  return (
    <Picture>
      <path d="M42 8q8 3 3 14" />
      <g className="motion-swing"><path className="wash" d="m42 17 17 8 10 26-26 16-17-29z" /><circle cx="44" cy="27" r="3" /></g>
    </Picture>
  )
}

export function People() {
  return (
    <Picture>
      <g className="avatar-left"><circle cx="22" cy="33" r="8" /><path d="M8 58q0-15 14-15 7 0 10 4" /></g>
      <g className="avatar-right"><circle cx="63" cy="33" r="8" /><path d="M55 46q16-8 21 12" /></g>
      <g className="motion-join"><circle className="wash" cx="42" cy="29" r="10" /><path d="M25 62q0-18 17-18t17 18" /></g>
    </Picture>
  )
}

export function Search() {
  return (
    <Picture>
      <path className="wash" d="M18 13h32l10 11v44H18z" />
      <path d="M49 13v12h11" />
      <g className="motion-sweep"><circle cx="43" cy="42" r="11" /><path d="m51 50 12 12" /></g>
    </Picture>
  )
}

export function Filter() {
  return (
    <Picture>
      <path className="wash" d="M13 18h58L47 43v10l-10 5V43z" />
      <g className="motion-fall"><circle cx="41" cy="64" r="1.5" /><circle cx="46" cy="58" r="1" /></g>
    </Picture>
  )
}

export function Cloud() {
  return (
    <Picture>
      <path className="wash" d="M29 55H19a12 12 0 0 1 0-24 19 19 0 0 1 36-4 14 14 0 1 1 9 28H52" />
      <g className="motion-wiggle"><path d="m45 42-9 12 8-1-7 13" /></g>
    </Picture>
  )
}

export function Signpost() {
  return (
    <Picture>
      <path d="M37 69V16m4 53V16" />
      <path className="wash" d="M19 21h40l10 8-10 8H19z" />
      <g className="motion-trail"><path d="M42 70q33-5 18-14t7-11" strokeDasharray="3 5" /></g>
    </Picture>
  )
}

export function Cycle() {
  return (
    <Picture>
      <circle className="wash" cx="42" cy="42" r="23" />
      <g className="motion-turn"><path d="M26 40a16 16 0 0 1 29-7l-1-8m1 8-8-1" /></g>
    </Picture>
  )
}

export function Activity() {
  return (
    <Picture>
      <rect className="wash" x="11" y="22" width="62" height="40" rx="5" />
      <g className="motion-trace"><path d="M18 44h12l6-13 9 22 7-12h13" pathLength="1" /></g>
    </Picture>
  )
}

export function Options() {
  return (
    <Picture>
      <rect className="wash" x="18" y="18" width="47" height="48" rx="5" />
      <path d="M27 30h28m-28 12h18m-18 12h22" />
      <g className="motion-select"><circle cx="57" cy="42" r="3" /></g>
    </Picture>
  )
}

export function Access() {
  return (
    <Picture>
      <rect className="wash" x="23" y="35" width="38" height="29" rx="5" />
      <path d="M31 35v-7a11 11 0 0 1 22 0v7" />
      <g className="motion-lock"><circle cx="42" cy="46" r="3" /><path d="M42 49v5" /></g>
    </Picture>
  )
}

export function Chat() {
  return (
    <Picture>
      <path className="wash" d="M16 18h52v37H36L21 66V55h-5z" />
      <g className="motion-type"><path d="M28 36h14m5 0h7" /></g>
    </Picture>
  )
}
