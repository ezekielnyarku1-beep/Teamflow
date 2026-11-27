import './emptyState.css'

export default function EmptyState({ illustration: Illustration, title, description, children, compact, role, heading: Heading = 'h3' }) {
  return (
    <div className={compact ? 'empty-panel compact' : 'empty-panel'} role={role}>
      <Illustration />
      <Heading className="empty-title">{title}</Heading>
      <p className="empty-description">{description}</p>
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}
