import Card from '../ui/Card.jsx'

function DashboardMetric({ value, label, icon, className = '' }) {
  return (
    <Card variant="default" padding="md" className={`hw-dashboard-metric ${className}`.trim()}>
      {icon && <div className="hw-dashboard-metric-icon">{icon}</div>}
      <strong>{value}</strong>
      <span>{label}</span>
    </Card>
  )
}

export default DashboardMetric
