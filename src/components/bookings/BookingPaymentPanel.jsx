const paymentStatusLabels = {
  failed: 'Failed',
  held_in_escrow: 'Held in escrow',
  pending: 'Pending verification',
  refunded: 'Refunded',
  released: 'Released',
  unpaid: 'Unpaid',
}

function formatMoney(value, currency = 'NGN') {
  if (value === null || value === undefined || value === '') {
    return `${currency} 0`
  }
  return `${currency} ${Number(value || 0).toLocaleString()}`
}

function getBookingPrice(booking) {
  return booking.finalPrice || booking.quotedPrice || booking.estimatedPrice || booking.escrowAmount || 0
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

function getDisplayPaymentStatus(booking) {
  if (booking.paymentStatus === 'unpaid' && booking.paymentReference) {
    return 'pending'
  }

  return booking.paymentStatus || 'unpaid'
}

function PaymentStatusBadge({ status }) {
  return (
    <span className={`payment-status-badge payment-${status || 'unpaid'}`}>
      {paymentStatusLabels[status] || status?.replaceAll('_', ' ') || 'Unpaid'}
    </span>
  )
}

export default function BookingPaymentPanel({
  booking,
  currentUserId,
  isCustomer = false,
  isPaying = false,
  onPay,
}) {
  const price = getBookingPrice(booking)
  const displayPaymentStatus = getDisplayPaymentStatus(booking)
  const normalizedPaymentStatus = booking.paymentStatus || 'unpaid'
  const belongsToCustomer = booking.customerId === currentUserId
  const quoteStatus = getQuoteStatus(booking)
  const hasPrice = price > 0
  const shouldShowPayButton = (
    isCustomer &&
    belongsToCustomer &&
    quoteStatus === 'accepted' &&
    ['unpaid', 'failed'].includes(normalizedPaymentStatus)
  )
  const escrowAmount = booking.escrowAmount || (
    booking.paymentStatus === 'held_in_escrow' ? price : 0
  )

  return (
    <div className={shouldShowPayButton ? 'hw-booking-payment-panel payment-action-panel' : 'hw-booking-payment-panel'} style={{ marginTop: 'var(--hw-space-4)' }}>
      {shouldShowPayButton && (
        <div className="hw-booking-payment-action-heading">
          <strong>Payment required</strong>
          <span>Secure this booking through Paystack escrow.</span>
        </div>
      )}

      <div className="hw-booking-payment-row">
        <span>
          <strong>{formatMoney(price)}</strong>
          {booking.finalPrice ? 'Final price' : booking.quotedPrice ? 'Quoted price' : 'Estimated price'}
        </span>
        <span>
          <strong>{formatMoney(escrowAmount)}</strong>
          Escrow protected
        </span>
        <span>
          <PaymentStatusBadge status={displayPaymentStatus} />
          Payment status
        </span>
      </div>

      <p className="hw-booking-payment-helper">
        Escrow release after customer confirmation. Platform commission is deducted from the artisan payout after payment is confirmed.
      </p>

      {shouldShowPayButton ? (
        <div className="hw-booking-payment-action">
          <button
            className="hw-booking-paystack-button"
            disabled={isPaying || !hasPrice}
            type="button"
            onClick={() => onPay?.(booking)}
          >
            {isPaying ? 'Starting Paystack...' : 'Pay with Paystack'}
          </button>
          <strong>{formatMoney(price)}</strong>
          {!hasPrice && (
            <span className="hw-booking-helper-note">Price not set yet. Agree price with artisan before payment.</span>
          )}
        </div>
      ) : (
        <span className="hw-booking-helper-note">
          {quoteStatus === 'awaiting'
            ? 'Waiting for artisan quote'
            : quoteStatus === 'sent'
            ? 'Accept or reject the artisan quote before payment.'
            : quoteStatus === 'rejected'
            ? 'Waiting for revised quote.'
            : displayPaymentStatus === 'pending'
            ? 'Payment started. Complete Paystack checkout or verify from the callback page.'
            : paymentStatusLabels[displayPaymentStatus] || 'Payment status updated.'}
        </span>
      )}
    </div>
  )
}
