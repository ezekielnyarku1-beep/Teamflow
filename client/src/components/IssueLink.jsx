import { Link } from 'react-router'

export default function IssueLink({ identifier, ...props }) {
  return <Link to={`/issue/${identifier}`} {...props} />
}
