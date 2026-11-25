import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, matchPath, useLocation } from 'react-router'
import CommandMenu from './CommandMenu.jsx'
import CreateIssueDialog from './CreateIssueDialog.jsx'
import Sidebar from './Sidebar.jsx'
import Toast from './Toast.jsx'
import { ShellContext } from '../lib/shellContext.js'

const isTypingIn = target =>
  target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="listbox"], .popover-panel')

export default function Shell() {
  const { pathname } = useLocation()
  const [createIssue, setCreateIssue] = useState({ open: false, teamKey: '', cycleId: null })
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const hideToast = useCallback(() => setToast(null), [])
  const settingsOpen = Boolean(matchPath('/settings/*', pathname))
  const pageTeamKey = matchPath('/team/:teamKey', pathname)?.params.teamKey ?? ''

  const openCreateIssue = useCallback(
    (teamKey, cycleId = null) => setCreateIssue({ open: true, teamKey: teamKey ?? pageTeamKey, cycleId }),
    [pageTeamKey],
  )
  const shell = useMemo(() => ({
    openCreateIssue,
    openCommandMenu: () => setCommandMenuOpen(true),
    showToast: message => setToast({ message, id: crypto.randomUUID() }),
  }), [openCreateIssue])

  useEffect(() => {
    function handleShortcut(event) {
      if (document.querySelector('dialog[open]')) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandMenuOpen(true)
        return
      }
      const plainC = event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey && !event.altKey
      if (plainC && !isTypingIn(event.target)) {
        event.preventDefault()
        openCreateIssue()
      }
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [openCreateIssue])

  return (
    <ShellContext.Provider value={shell}>
      <div className={settingsOpen ? 'shell shell-settings' : 'shell'}>
        {!settingsOpen && <Sidebar />}
        <main className="shell-main">
          <Outlet />
        </main>
      </div>
      {createIssue.open && (
        <CreateIssueDialog
          defaultTeamKey={createIssue.teamKey}
          cycleId={createIssue.cycleId}
          onClose={() => setCreateIssue({ open: false, teamKey: '', cycleId: null })}
        />
      )}
      {commandMenuOpen && <CommandMenu onClose={() => setCommandMenuOpen(false)} />}
      {toast && <Toast key={toast.id} message={toast.message} onDone={hideToast} />}
    </ShellContext.Provider>
  )
}
