import { Link } from 'react-router-dom'

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

export default function BookingNextAction({
  booking,
  onPay,
  onQuoteResponse,
  onRescheduleResponse,
  onCompletionAction,
  onReportIssue,
  onReviewSubmit,
  onEditReviewStart,
  editingReviewId,
  reviewForms,
  submittingReviewId,
  updatingBookingId,
  updatingCompletionId,
  updatingQuoteId,
  payingBookingId,
  isCustomer,
  userId,
}) {
  if (!booking || !isCustomer) {
    return null
  }

  const status = booking.rawStatus || booking.status
  const quoteStatus = getQuoteStatus(booking)
  const normalizedPaymentStatus = booking.paymentStatus || 'unpaid'
  const belongsToCustomer = booking.customerId === userId

  const shouldShowPayButton = (
    isCustomer &&
    belongsToCustomer &&
    quoteStatus === 'accepted' &&
    ['unpaid', 'failed'].includes(normalizedPaymentStatus)
  )

  const isPaying = payingBookingId === booking.id
  const isUpdatingQuote = updatingQuoteId === booking.id
  const isUpdatingCompletion = updatingCompletionId === booking.id
  const isSubmittingReview = submittingReviewId === booking.id
  const isEditingReview = editingReviewId === booking.id
  const isUpdatingBooking = updatingBookingId === booking.id

  if (quoteStatus === 'sent') {
    return (
      <div className="hw-booking-next-action-panel">
        <strong>Quote awaiting your response</strong>
        <p>Accept or reject this quote to proceed with your booking.</p>
        <div className="hw-booking-actions">
          <button
            className="hw-booking-paystack-button"
            disabled={isUpdatingQuote}
            type="button"
            onClick={() => onQuoteResponse?.(booking, 'accept')}
          >
            {isUpdatingQuote ? 'Accepting...' : 'Accept Quote'}
          </button>
          <button
            disabled={isUpdatingQuote}
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
            Reject Quote
          </button>
        </div>
      </div>
    )
  }

  if (shouldShowPayButton) {
    return (
      <div className="hw-booking-next-action-panel">
        <div className="hw-booking-payment-action-heading">
          <strong>Payment required</strong>
          <span>Secure this booking through Paystack escrow.</span>
        </div>
        <button
          className="hw-booking-paystack-button"
          disabled={isPaying}
          type="button"
          onClick={() => onPay?.(booking)}
        >
          {isPaying ? 'Starting Paystack...' : 'Pay Securely'}
        </button>
      </div>
    )
  }

  if (status === 'artisan_completed') {
    return (
      <div className="hw-booking-next-action-panel">
        <div>
          <span className="hw-booking-action-required-badge">Action Required</span>
          <strong>Artisan marked this job as completed.</strong>
          <p>Please confirm the work was completed safely before leaving a review.</p>
        </div>
        <div className="hw-booking-actions">
          <button
            className="hw-booking-paystack-button"
            disabled={isUpdatingCompletion}
            type="button"
            onClick={() => onCompletionAction?.(booking, 'confirm')}
          >
            {isUpdatingCompletion ? 'Confirming...' : 'Confirm Job Completed'}
          </button>
          <button
            disabled={isUpdatingCompletion}
            type="button"
            onClick={() => onCompletionAction?.(booking, 'report')}
            style={{
              padding: 'var(--hw-space-3) var(--hw-space-5)',
              background: 'var(--hw-error-light)',
              border: '1px solid var(--hw-error)',
              borderRadius: 'var(--hw-radius-pill)',
              cursor: 'pointer',
              color: 'var(--hw-error-text)',
              fontWeight: 'var(--hw-font-semibold)',
            }}
          >
            Report Issue
          </button>
        </div>
      </div>
    )
  }

  if (status === 'reschedule_requested') {
    return (
      <div className="hw-booking-next-action-panel">
        <div>
          <span className="hw-booking-awaiting-response-badge">Awaiting Your Response</span>
          <strong>Artisan proposed a new time</strong>
        </div>
        <div className="hw-booking-actions">
          <button
            disabled={isUpdatingBooking}
            type="button"
            onClick={() => onRescheduleResponse?.(booking, 'accept')}
            style={{
              padding: 'var(--hw-space-3) var(--hw-space-5)',
              background: 'var(--hw-primary)',
              border: 'none',
              borderRadius: 'var(--hw-radius-pill)',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 'var(--hw-font-semibold)',
            }}
          >
            {isUpdatingBooking ? 'Accepting...' : 'Accept New Time'}
          </button>
          <button
            disabled={isUpdatingBooking}
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
            Reject
          </button>
        </div>
      </div>
    )
  }

  if (['customer_confirmed', 'completed'].includes(status) && !booking.review) {
    return (
      <div className="hw-booking-next-action-panel">
        <strong>Share your experience</strong>
        <p>Leave a review to help other customers find trusted artisans.</p>
      </div>
    )
  }

  return null
}
