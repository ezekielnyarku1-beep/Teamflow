import EmptyState from '../components/EmptyState.jsx'
import { Chat } from '../components/EmptyPictures.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUp, Paperclip } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useShell } from '../lib/shellContext.js'
import { sendChat } from '../lib/api.js'
import './agents.css'

export default function AgentsPage() {
  const { openCreateIssue, openCommandMenu } = useShell()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const log = useRef(null)

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [messages, busy])

  async function submit(event) {
    event.preventDefault()
    const content = draft.trim()
    if (busy || !content) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setDraft('')
    setBusy(true)
    setError('')
    try {
      const { text } = await sendChat(next.slice(-9), identifier.trim())
      setMessages([...next, { role: 'assistant', content: text }])
    } catch (problem) {
      setMessages(messages)
      setDraft(content)
      setError(problem.message)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setMessages([])
    setDraft('')
    setError('')
    setIdentifier('')
    setAttachmentOpen(false)
  }

  return (
    <div className="agents-page">
      <PageHeader title="Agents">
        <button className="button" disabled={busy} onClick={reset}>New chat</button>
      </PageHeader>
      <div className={messages.length ? 'agents-chat' : 'agents-chat is-empty'}>
        {messages.length === 0 && <EmptyState illustration={Chat} title="What are you working on?" description="Send a message to start a conversation." heading="h2" />}
        <div ref={log} className="agents-log" role="log" aria-label="Agent conversation">
          {messages.map((message, index) => (
            <div key={index} className={'agents-message ' + message.role}>
              <strong>{message.role === 'user' ? 'You' : 'Overview assistant'}</strong>
              <p>{message.content}</p>
            </div>
          ))}
          {busy && <p role="status">Thinking…</p>}
        </div>
        <form onSubmit={submit} className="agents-compose">
            <textarea aria-label="Message" placeholder="Message Overview assistant…" rows={2} maxLength={2000} value={draft} disabled={busy}
              onChange={event => setDraft(event.target.value)} onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form.requestSubmit()
                }
              }} />
          <div className="agents-toolbar">
            <button className="agents-attach" type="button" aria-expanded={attachmentOpen} aria-label="Attach issue"
              onClick={() => setAttachmentOpen(!attachmentOpen)}><Paperclip size={17} />{identifier || 'Attach issue'}</button>
            <button className="agents-send" aria-label="Send message" disabled={busy || !draft.trim()}><ArrowUp size={20} /></button>
          </div>
          {attachmentOpen && <label>Issue ID
            <input className="input" placeholder="ENG-123" maxLength={30} value={identifier}
              disabled={busy || messages.length > 0} onChange={event => setIdentifier(event.target.value)} />
          </label>}
          {error && <p className="inline-error" role="alert">{error}</p>}
        </form>
        <nav className="agents-tools" aria-label="Workspace tools">
          <button className="button" onClick={() => openCreateIssue()}>New issue</button>
          <button className="button" onClick={openCommandMenu}>Search issues</button>
          <Link className="button" to="/projects">Project blockers</Link>
        </nav>
      </div>
    </div>
  )
}
