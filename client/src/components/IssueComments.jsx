import EmptyState from './EmptyState.jsx'
import { Bubbles } from './EmptyPictures.jsx'
import { useState } from 'react'
import Avatar from './Avatar.jsx'
import MentionTextarea, { MentionText } from './MentionTextarea.jsx'
import { formatDateTime } from '../lib/format.js'
import { useAddComment, useTeam } from '../lib/queries.js'

export default function IssueComments({ issue }) {
  const [body, setBody] = useState('')
  const addComment = useAddComment(issue.identifier)
  const people = useTeam(issue.team.key).data?.members ?? []

  function submit(event) {
    event.preventDefault()
    if (!body.trim() || addComment.isPending) return
    const submitted = body
    addComment.mutate(submitted, {
      onSuccess: () => setBody(current => current === submitted ? '' : current),
    })
  }

  return (
    <section className="issue-section" aria-labelledby={`comments-${issue.id}`}>
      <h3 id={`comments-${issue.id}`}>Comments</h3>
      {issue.comments?.length === 0 && <EmptyState illustration={Bubbles} title="No comments yet" description="Start the conversation below." compact />}
      <ul className="comment-list">
        {issue.comments?.map(comment => (
          <li key={comment.id} className="comment">
            <div className="comment-head">
              <Avatar name={comment.author.name} />
              <span className="comment-author">{comment.author.name}</span>
              <time className="muted" dateTime={comment.createdAt}>
                {formatDateTime(comment.createdAt)}
              </time>
            </div>
            <p className="comment-body"><MentionText text={comment.body} people={people} /></p>
          </li>
        ))}
      </ul>
      <form className="comment-form" onSubmit={submit}>
        <label htmlFor={`new-comment-${issue.id}`} className="visually-hidden">
          Write a comment
        </label>
        <MentionTextarea
          id={`new-comment-${issue.id}`}
          className="input"
          rows={3}
          maxLength={5000}
          placeholder="Write a comment… Type @ to mention someone"
          value={body}
          onChange={setBody}
          people={people}
          onKeyDown={event => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit(event)
          }}
        />
        {addComment.isError && (
          <p className="inline-error" role="alert">
            The comment was not saved: {addComment.error.message}
          </p>
        )}
        <button type="submit" className="button is-primary" disabled={!body.trim() || addComment.isPending}>
          {addComment.isPending ? 'Saving…' : 'Comment'}
        </button>
      </form>
    </section>
  )
}
