export default function BookingReschedulePanel({
  booking,
  showActions = false,
  isUpdating = false,
  onRescheduleResponse,
}) {
  const bookingStatus = booking.rawStatus || booking.status

  if (bookingStatus !== 'reschedule_requested') {
    return null
  }

  return (
    <div className="hw-booking-reschedule-panel" style={{ marginTop: 'var(--hw-space-4)' }}>
      <div className="hw-booking-reschedule-heading">
        <strong>Artisan proposed a new time</strong>
        <span className="hw-booking-awaiting-response-badge">Awaiting Your Response</span>
      </div>

      <div className="hw-booking-reschedule-grid">
        <span>
          <strong>Original date/time</strong>
          {booking.scheduledDate} at {booking.scheduledTime}
        </span>
        <span>
          <strong>Proposed date/time</strong>
          {booking.proposedDate || 'Date pending'} at {booking.proposedTime || 'Time pending'}
        </span>
      </div>

      {booking.rescheduleNote && (
        <p className="hw-booking-reschedule-note">{booking.rescheduleNote}</p>
      )}

      {showActions && (
        <div className="hw-booking-actions" style={{ marginTop: 'var(--hw-space-4)' }}>
          <button
            disabled={isUpdating}
            type="button"
            onClick={() => onRescheduleResponse?.(booking, 'accept')}
            style={{
              padding: 'var(--hw-space-3) var(--hw-space-5)',
              background: 'var(--hw-primary)',
              border: 'none',
              borderRadius: 'var(--hw-radius-pill)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'var(--hw-font-semibold)',
            }}
          >
            {isUpdating ? 'Updating...' : 'Accept New Time'}
          </button>
          <button
            disabled={isUpdating}
            type="button"
            onClick={() => onRescheduleResponse?.(booking, 'reject')}
            style={{
              padding: 'var(--hw-space-3) var(--hw-space-5)',
              background: 'var(--hw-surface)',
              border: '1px solid var(--hw-border)',
              borderRadius: 'var(--hw-radius-pill)',
              cursor: 'pointer',
              fontWeight: 'var(--hw-font-semibold)',
            }}
          >
            {isUpdating ? 'Updating...' : 'Reject New Time'}
          </button>
        </div>
      )}

      {booking.rescheduleRequestedAt && (
        <p className="hw-booking-helper-note" style={{ marginTop: 'var(--hw-space-3)' }}>
          Requested: {new Date(booking.rescheduleRequestedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
