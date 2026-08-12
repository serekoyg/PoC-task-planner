import { Link } from 'react-router-dom'

type TodoPlayLinkProps = {
  to: string
  label: string
  shared?: boolean
}

export default function TodoPlayLink({
  to,
  label,
  shared = false,
}: TodoPlayLinkProps) {
  return (
    <Link
      className={`todo-play-button${shared ? ' shared' : ''}`}
      to={to}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">▶</span>
    </Link>
  )
}
