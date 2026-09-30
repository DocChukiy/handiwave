import Badge from '../ui/Badge.jsx'

const statusVariants = {
  pending: 'warning',
  reschedule_requested: 'warning',
  confirmed: 'info',
  in_progress: 'info',
  artisan_completed: 'success',
  customer_confirmed: 'success',
  completed: 'success',
  disputed: 'error',
  cancelled: 'neutral',
}

export default function BookingStatusBadge({ status }) {
  const variant = statusVariants[status] || 'neutral'
  const label = status ? status.replaceAll('_', ' ') : 'Unknown'

  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  )
}
