export default function BookingCompletionPanel({
  booking,
  isUpdating = false,
  onCompletionAction,
}) {
  const bookingStatus = booking.rawStatus || booking.status

  if (bookingStatus !== 'artisan_completed') {
    return null
  }

  return (
    <div className="hw-booking-completion-panel" style={{ marginTop: 'var(--hw-space-4)' }}>
      <div>
        <span className="hw-booking-action-required-badge">Action Required</span>
        <strong>Artisan marked this job as completed.</strong>
        <p>Please confirm the work was completed safely before leaving a review.</p>
      </div>
      <div className="hw-booking-completion-actions">
        <button
          disabled={isUpdating}
          type="button"
          onClick={() => onCompletionAction?.(booking, 'confirm')}
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
          {isUpdating ? 'Confirming...' : 'Confirm Job Completed'}
        </button>
        <button
          disabled={isUpdating}
          type="button"
          onClick={() => onCompletionAction?.(booking, 'report')}
          style={{
            padding: 'var(--hw-space-3) var(--hw-space-5)',
            background: 'var(--hw-error-light)',
            border: '1px solid var(--hw-error)',
            borderRadius: 'var(--hw-radius-pill)',
            color: 'var(--hw-error-text)',
            cursor: 'pointer',
            fontWeight: 'var(--hw-font-semibold)',
          }}
        >
          {isUpdating ? 'Reporting...' : 'Report Not Completed'}
        </button>
      </div>
    </div>
  )
}
