import Card from '../ui/Card.jsx'
import Button from "../Button.jsx"

function AccountInfoCard({ title, details = [], actions = [], className = '' }) {
  return (
    <Card variant="default" padding="lg" className={`hw-account-info-card ${className}`.trim()}>
      <p className="hw-section-kicker">{title}</p>
      <h2>{title}</h2>
      <div className="hw-account-detail-list">
        {details.map((detail) => (
          <span key={detail.label}>
            <strong>{detail.label}</strong>
            {detail.value || 'Not set'}
          </span>
        ))}
      </div>
      {actions.length > 0 && (
        <div className="hw-account-info-actions">
          {actions.map((action) => (
            <Button key={action.label} className={action.className || 'primary-cta'} to={action.to}>
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}

export default AccountInfoCard
