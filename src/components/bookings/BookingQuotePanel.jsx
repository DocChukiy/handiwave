const quoteStatusLabels = {
  accepted: 'Quote Accepted',
  awaiting: 'Awaiting Quote',
  paid: 'Paid / Escrow Held',
  rejected: 'Quote Rejected',
  sent: 'Quote Sent',
}

function formatMoney(value, currency = 'NGN') {
  if (value === null || value === undefined || value === '') {
    return `${currency} 0`
  }
  return `${currency} ${Number(value || 0).toLocaleString()}`
}

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

function QuoteStatusBadge({ status }) {
  return (
    <span className={`quote-status-badge quote-${status}`}>
      {quoteStatusLabels[status]}
    </span>
  )
}

export default function BookingQuotePanel({
  booking,
  isUpdating = false,
  onQuoteResponse,
}) {
  const quoteStatus = getQuoteStatus(booking)

  return (
    <div className={`hw-booking-quote-panel quote-${quoteStatus}`} style={{ marginTop: 'var(--hw-space-4)' }}>
      <div className="hw-booking-panel-heading">
        <div>
          <strong>{quoteStatusLabels[quoteStatus]}</strong>
          <p>
            {quoteStatus === 'awaiting' && 'Waiting for artisan quote.'}
            {quoteStatus === 'sent' && 'Review the artisan quote before payment becomes available.'}
            {quoteStatus === 'accepted' && 'Quote accepted. Payment required.'}
            {quoteStatus === 'rejected' && 'Quote rejected. Waiting for a revised quote.'}
            {quoteStatus === 'paid' && 'Payment is already protected in escrow or completed.'}
          </p>
        </div>
        <QuoteStatusBadge status={quoteStatus} />
      </div>

      {booking.quoteSentAt && (
        <div className="hw-booking-quote-details">
          <span>
            <strong>{formatMoney(booking.quotedPrice)}</strong>
            Quoted price
          </span>
          {booking.quoteNotes && (
            <span>
              <strong>Quote notes</strong>
              {booking.quoteNotes}
            </span>
          )}
        </div>
      )}

      {quoteStatus === 'sent' && (
        <div className="hw-booking-quote-actions">
          <button
            disabled={isUpdating}
            type="button"
            onClick={() => onQuoteResponse?.(booking, 'accept')}
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
            {isUpdating ? 'Updating...' : 'Accept Quote'}
          </button>
          <button
            disabled={isUpdating}
            type="button"
            onClick={() => onQuoteResponse?.(booking, 'reject')}
            style={{
              padding: 'var(--hw-space-3) var(--hw-space-5)',
              background: 'var(--hw-surface)',
              border: '1px solid var(--hw-border)',
              borderRadius: 'var(--hw-radius-pill)',
              cursor: 'pointer',
              fontWeight: 'var(--hw-font-semibold)',
            }}
          >
            {isUpdating ? 'Updating...' : 'Reject Quote'}
          </button>
        </div>
      )}
    </div>
  )
}
