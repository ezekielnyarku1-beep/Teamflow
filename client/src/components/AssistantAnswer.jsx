import { useState } from 'react'
import { Link } from 'react-router'
import { useFormAction } from '../lib/useFormAction.js'

export default function AssistantAnswer({ label, load, scope }) {
  const action = useFormAction()
  const [answer, setAnswer] = useState(null)
  return (
    <div>
      <button className="button" type="button" disabled={action.busy}
        onClick={() => action.run(async () => { setAnswer(null); setAnswer(await load()) })}>
        {action.busy ? 'Reviewing…' : label}
      </button>
      {action.error && <p role="alert" className="inline-error">{action.error}</p>}
      {answer && <div role="status">
        <small className="muted">{scope}</small>
        {answer.text && <p>{answer.text}</p>}
        {answer.blockers?.map((item, index) => <p key={index}><Link to={`/issue/${item.identifier}`}>{item.identifier}</Link> · {item.reason}</p>)}
      </div>}
    </div>
  )
}
