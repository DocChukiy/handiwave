import { Link } from 'react-router-dom'

function QuickActions({ actions = [], className = '' }) {
  return (
    <div className={`hw-quick-actions ${className}`.trim()}>
      {actions.map((action) => (
        <Link
          key={action.label}
          to={action.to}
          className="hw-quick-action"
        >
          {action.icon && <div className="hw-quick-action-icon">{action.icon}</div>}
          <span className="hw-quick-action-label">{action.label}</span>
        </Link>
      ))}
    </div>
  )
}

export default QuickActions
