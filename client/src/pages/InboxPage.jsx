import EmptyState from '../components/EmptyState.jsx'
import { Inbox } from '../components/EmptyPictures.jsx'
import { Check, Circle } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import ContextLink from '../components/ContextLink.jsx'
import PageHeader from '../components/PageHeader.jsx'
import QueryState from '../components/QueryState.jsx'
import StatusIcon from '../components/StatusIcon.jsx'
import { formatDateTime } from '../lib/format.js'
import { useMarkAllNotificationsRead, useMarkNotification, useNotifications } from '../lib/queries.js'

const actions = {
  ASSIGNED: 'assigned you',
  COMMENTED: 'commented on',
  STATUS_CHANGED: 'changed the status of',
  MENTIONED: 'mentioned you on',
}

export default function InboxPage() {
  const notifications = useNotifications()
  const mark = useMarkNotification()
  const markAll = useMarkAllNotificationsRead()
  const unreadCount = notifications.data?.unreadCount ?? 0
  const error = mark.error ?? markAll.error

  return (
    <div className="inbox-page">
      <PageHeader title="Inbox" meta={notifications.data && `${unreadCount} unread`}>
        {unreadCount > 0 && (
          <button type="button" className="button" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all as read
          </button>
        )}
      </PageHeader>
      {error && <p className="inline-error inbox-error" role="alert">{error.message}</p>}
      <QueryState query={notifications} label="your inbox">
        {data =>
          data.notifications.length === 0 ? (
            <EmptyState illustration={Inbox} title="Nothing here yet" description="Assignments, mentions, status changes and comments on your issues appear here." />
          ) : (
            <ul className="inbox-list">
              {data.notifications.map(notification => (
                <li key={notification.id} className={notification.read ? 'inbox-item' : 'inbox-item is-unread'}>
                  <ContextLink
                    to={`/issue/${notification.issue.identifier}`}
                    className="inbox-link"
                    name={notification.issue.identifier}
                    openLabel="Open issue"
                    actions={mark.isPending ? [] : [{
                      label: notification.read ? 'Mark unread' : 'Mark read',
                      icon: notification.read ? Circle : Check,
                      run: () => mark.mutate({ id: notification.id, read: !notification.read }),
                    }]}
                    onClick={() => {
                      if (!notification.read) mark.mutate({ id: notification.id, read: true })
                    }}
                  >
                    <span className="inbox-dot" aria-hidden="true" />
                    <Avatar name={notification.actor.name} />
                    <span className="inbox-text">
                      <span>
                        <strong>{notification.actor.name}</strong> {actions[notification.type] ?? 'updated'}{' '}
                        <span className="muted">{notification.issue.identifier}</span>
                      </span>
                      <span className="inbox-title">
                        <StatusIcon status={notification.issue.status} />
                        {notification.issue.title}
                      </span>
                    </span>
                    <time className="inbox-time" dateTime={notification.createdAt}>
                      {formatDateTime(notification.createdAt)}
                    </time>
                    {!notification.read && <span className="visually-hidden">, unread</span>}
                  </ContextLink>
                  <button
                    type="button"
                    className="button inbox-toggle"
                    disabled={mark.isPending}
                    onClick={() => mark.mutate({ id: notification.id, read: !notification.read })}
                  >
                    {notification.read ? 'Mark unread' : 'Mark read'}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </QueryState>
    </div>
  )
}
