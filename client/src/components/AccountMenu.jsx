import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown, LogOut, Settings, UserPlus } from 'lucide-react'
import Avatar from './Avatar.jsx'
import Popover from './Popover.jsx'
import { iconProps } from '../lib/icons.js'
import { signOut } from '../lib/auth.js'
import { useFormAction } from '../lib/useFormAction.js'
import './accountMenu.css'

function AccountMenuList({ me, onClose }) {
  const navigate = useNavigate()
  const listRef = useRef(null)
  const listId = useId()
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
    listRef.current.focus({ preventScroll: true })
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
      <div className="account-menu-identity">
        <Avatar name={me.name} />
        <div className="account-menu-user">
          <strong>{me.name}</strong>
          <span>{me.email}</span>
        </div>
      </div>
      <ul ref={listRef} className="picker" role="menu" aria-label="Account" aria-activedescendant={`${listId}-${active}`} tabIndex={-1} onKeyDown={handleKey}>
        {items.map((item, index) => (
          <li
            key={item.key}
            id={`${listId}-${index}`}
            role="menuitem"
            aria-disabled={logOut.busy || undefined}
            className={[index === active && 'is-active', item.divided && 'is-divided'].filter(Boolean).join(' ') || undefined}
            onPointerMove={() => setActive(index)}
            onClick={() => choose(item)}
          >
            {item.key === 'settings' && <Settings {...iconProps} />}
            {item.key === 'members' && <UserPlus {...iconProps} />}
            {item.key === 'logout' && <LogOut {...iconProps} />}
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
      popupRole="menu"
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
