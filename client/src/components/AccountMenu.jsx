import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown } from 'lucide-react'
import Avatar from './Avatar.jsx'
import Popover from './Popover.jsx'
import { iconProps } from '../lib/icons.js'
import { signOut } from '../lib/auth.js'
import { useFormAction } from '../lib/useFormAction.js'
import './accountMenu.css'

function AccountMenuList({ me, onClose }) {
  const navigate = useNavigate()
  const listRef = useRef(null)
  const logOut = useFormAction()
  const [active, setActive] = useState(0)

  const items = [
    { key: 'settings', label: 'Settings', run: () => navigate('/settings') },
    ...(me.role === 'ADMIN' ? [{ key: 'members', label: 'Invite and manage members', run: () => navigate('/settings/users') }] : []),
    {
      key: 'logout',
      label: logOut.busy ? 'Logging out…' : 'Log out',
      divided: true,
      keepOpen: true,
      run: () => logOut.run(async () => {
        await signOut()
        navigate('/login', { replace: true })
      }),
    },
  ]

  useEffect(() => {
    listRef.current.focus()
  }, [])

  function choose(item) {
    if (logOut.busy) return
    item.run()
    if (!item.keepOpen) onClose()
  }

  function handleKey(event) {
    const moves = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: items.length - 1 }
    if (event.key in moves) {
      event.preventDefault()
      setActive((moves[event.key] + items.length) % items.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(items[active])
    }
  }

  return (
    <div className="account-menu">
      <p className="account-menu-email">{me.email}</p>
      <ul ref={listRef} className="picker" role="menu" aria-label="Account" tabIndex={-1} onKeyDown={handleKey}>
        {items.map((item, index) => (
          <li
            key={item.key}
            role="menuitem"
            aria-disabled={logOut.busy || undefined}
            className={[index === active && 'is-active', item.divided && 'is-divided'].filter(Boolean).join(' ') || undefined}
            onPointerMove={() => setActive(index)}
            onClick={() => choose(item)}
          >
            <span className="picker-label">{item.label}</span>
          </li>
        ))}
      </ul>
      {logOut.error && (
        <p className="inline-error account-menu-error" role="alert">
          {logOut.error}
        </p>
      )}
    </div>
  )
}

export default function AccountMenu({ me }) {
  return (
    <Popover
      label={`Account menu for ${me.name}`}
      buttonClassName="account-button"
      buttonContent={
        <>
          <Avatar name={me.name} />
          <span className="account-button-name">{me.name}</span>
          <ChevronDown {...iconProps} />
        </>
      }
    >
      {close => <AccountMenuList me={me} onClose={close} />}
    </Popover>
  )
}
