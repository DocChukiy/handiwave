const TIMELINE_STEPS = [
  { key: 'request', label: 'Request' },
  { key: 'quote', label: 'Quote' },
  { key: 'payment', label: 'Payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
  { key: 'review', label: 'Review' },
]

function getQuoteStatus(booking) {
  if (['held_in_escrow', 'released', 'refunded'].includes(booking.paymentStatus)) {
    return 'paid'
  }

  if (booking.quoteAcceptedAt) {
    return 'accepted'
  }

  if (booking.quoteRejectedAt) {
    return 'rejected'
  }

  if (booking.quoteSentAt) {
    return 'sent'
  }

  return 'awaiting'
}

function getActiveStep(booking) {
  const status = booking.rawStatus || booking.status
  const quoteStatus = getQuoteStatus(booking)

  if (status === 'disputed' || status === 'cancelled') {
    return -1
  }

  if (status === 'pending' && !booking.quoteSentAt) {
    return 0
  }

  if (status === 'pending' && quoteStatus === 'sent') {
    return 1
  }

  if (quoteStatus === 'accepted' && !['held_in_escrow', 'released', 'refunded'].includes(booking.paymentStatus)) {
    return 2
  }

  if (status === 'confirmed') {
    return 3
  }

  if (status === 'in_progress') {
    return 4
  }

  if (status === 'artisan_completed') {
    return 5
  }

  if (status === 'customer_confirmed' || status === 'completed') {
    return 6
  }

  if (status === 'pending') {
    return 1
  }

  return 0
}

function getCompletedSteps(activeStep) {
  if (activeStep < 0) return []
  return Array.from({ length: activeStep }, (_, i) => i)
}

export default function BookingTimeline({ booking }) {
  const activeStep = getActiveStep(booking)
  const completedSteps = getCompletedSteps(activeStep)
  const status = booking.rawStatus || booking.status

  const isSpecialStatus = status === 'disputed' || status === 'cancelled'

  if (isSpecialStatus) {
    return (
      <div className="hw-booking-timeline">
        <div style={{ textAlign: 'center', padding: 'var(--hw-space-4)' }}>
          <span style={{
            padding: 'var(--hw-space-2) var(--hw-space-4)',
            borderRadius: 'var(--hw-radius-pill)',
            background: status === 'disputed' ? 'var(--hw-error-light)' : 'var(--hw-neutral-light)',
            color: status === 'disputed' ? 'var(--hw-error-text)' : 'var(--hw-neutral-text)',
            fontWeight: 'var(--hw-font-semibold)',
            fontSize: 'var(--hw-text-sm)',
          }}>
            {status === 'disputed' ? 'Issue Reported' : 'Cancelled'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="hw-booking-timeline">
      <div className="hw-booking-timeline-steps">
        {TIMELINE_STEPS.map((step, index) => {
          const isActive = index === activeStep
          const isCompleted = completedSteps.includes(index)

          return (
            <div
              key={step.key}
              className={`hw-booking-timeline-step ${isActive ? 'hw-booking-timeline-step-active' : ''} ${isCompleted ? 'hw-booking-timeline-step-completed' : ''}`}
            >
              <div className="hw-booking-timeline-step-dot">
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className="hw-booking-timeline-step-label">{step.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
