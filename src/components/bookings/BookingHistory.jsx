import EmptyState from '../EmptyState.jsx'
import SkeletonPreview from '../Skeletons.jsx'
import BookingCard from './BookingCard.jsx'
import BookingQuotePanel from './BookingQuotePanel.jsx'
import BookingPaymentPanel from './BookingPaymentPanel.jsx'
import BookingCompletionPanel from './BookingCompletionPanel.jsx'
import BookingReviewForm from './BookingReviewForm.jsx'
import BookingReschedulePanel from './BookingReschedulePanel.jsx'
import { Link } from 'react-router-dom'

export default function BookingHistory({
  bookings,
  isLoading,
  emptyText,
  title,
  participantLabel,
  showActions = false,
  user,
  onCompletionAction,
  onEditReviewStart,
  onReviewChange,
  onReviewSubmit,
  onReportIssue,
  onPay,
  onQuoteResponse,
  onRescheduleResponse,
  reviewForms = {},
  editingReviewId,
  submittingReviewId,
  updatingCompletionId,
  updatingBookingId,
  updatingQuoteId,
  payingBookingId,
}) {
  const rescheduleRequestCount = bookings.filter((booking) => (
    (booking.rawStatus || booking.status) === 'reschedule_requested'
  )).length

  return (
    <div className="hw-booking-history-section">
      <div className="hw-booking-history-header">
        <p className="section-kicker" style={{ color: 'var(--hw-primary)', fontSize: 'var(--hw-text-xs)', fontWeight: 'var(--hw-font-extrabold)', letterSpacing: 'var(--hw-tracking-wide)', textTransform: 'uppercase', margin: 0 }}>
          History
        </p>
        <h2>{title}</h2>
      </div>

      {!isLoading && showActions && (
        <div className="hw-booking-customer-reschedule-summary">
          {rescheduleRequestCount > 0 ? (
            <>
              <span className="hw-booking-awaiting-response-badge">Awaiting Your Response</span>
              <p>
                {rescheduleRequestCount} booking{rescheduleRequestCount === 1 ? '' : 's'} need your schedule decision.
              </p>
            </>
          ) : (
            <EmptyState compact title="No reschedule requests">
              Artisan time-change requests will appear here when they need your response.
            </EmptyState>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="hw-booking-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="hw-booking-skeleton">
              <div className="hw-booking-skeleton-line" style={{ width: '40%' }} />
              <div className="hw-booking-skeleton-line" style={{ width: '70%' }} />
              <div className="hw-booking-skeleton-line" style={{ width: '55%' }} />
            </div>
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="hw-booking-list">
          {bookings.map((booking) => {
            const bookingStatus = booking.rawStatus || booking.status

            return (
              <div key={booking.id}>
                <BookingCard
                  booking={booking}
                  participantLabel={participantLabel}
                  showActions={false}
                  isCustomer={user?.role === 'customer'}
                  user={user}
                  onPay={onPay}
                  onQuoteResponse={onQuoteResponse}
                  onRescheduleResponse={onRescheduleResponse}
                  onCompletionAction={onCompletionAction}
                  onReportIssue={onReportIssue}
                  onReviewSubmit={onReviewSubmit}
                  onEditReviewStart={onEditReviewStart}
                  editingReviewId={editingReviewId}
                  reviewForms={reviewForms}
                  submittingReviewId={submittingReviewId}
                  updatingBookingId={updatingBookingId}
                  updatingCompletionId={updatingCompletionId}
                  updatingQuoteId={updatingQuoteId}
                  payingBookingId={payingBookingId}
                />

                {user?.role === 'customer' && (
                  <div className="hw-booking-message-actions" style={{ marginTop: 'var(--hw-space-3)' }}>
                    <Link to={`/messages?booking=${booking.id}`} className="hw-btn hw-btn-secondary hw-btn-sm">
                      Message Artisan
                    </Link>
                  </div>
                )}

                {showActions && (
                  <>
                    <BookingQuotePanel
                      booking={booking}
                      isUpdating={updatingQuoteId === booking.id}
                      onQuoteResponse={onQuoteResponse}
                    />

                    <BookingPaymentPanel
                      booking={booking}
                      isPaying={payingBookingId === booking.id}
                      onPay={onPay}
                      isCustomer={user?.role === 'customer'}
                      currentUserId={user?.id}
                    />

                    {bookingStatus === 'completed' && (
                      <div className="hw-booking-compatibility-panel">
                        <strong>Old completed status detected</strong>
                        <p>
                          This booking was completed before the new customer confirmation flow.
                          New jobs should move from artisan completed to customer confirmed before reviews unlock.
                        </p>
                      </div>
                    )}

                    <BookingCompletionPanel
                      booking={booking}
                      isUpdating={updatingCompletionId === booking.id}
                      onCompletionAction={onCompletionAction}
                    />

                    {['confirmed', 'in_progress', 'artisan_completed', 'customer_confirmed', 'completed'].includes(bookingStatus) && (
                      <div className="hw-booking-message-actions" style={{ marginTop: 'var(--hw-space-4)' }}>
                        <button
                          type="button"
                          onClick={() => onReportIssue?.(booking)}
                          style={{
                            background: 'var(--hw-error-light)',
                            border: '1px solid var(--hw-error)',
                            color: 'var(--hw-error-text)',
                            padding: 'var(--hw-space-2) var(--hw-space-4)',
                            borderRadius: 'var(--hw-radius-pill)',
                            cursor: 'pointer',
                            fontWeight: 'var(--hw-font-medium)',
                            fontSize: 'var(--hw-text-sm)',
                          }}
                        >
                          Report Issue
                        </button>
                      </div>
                    )}

                    {['customer_confirmed', 'completed'].includes(bookingStatus) && (
                      booking.review ? (
                        <div className="hw-booking-review-panel">
                          {editingReviewId === booking.id ? (
                            <BookingReviewForm
                              booking={booking}
                              form={reviewForms[booking.id] || {
                                rating: String(booking.review.rating || 5),
                                reviewText: booking.review.review_text || '',
                              }}
                              isSubmitting={submittingReviewId === booking.id}
                              mode="edit"
                              onChange={onReviewChange}
                              onSubmit={onReviewSubmit}
                            />
                          ) : (
                            <div className="hw-booking-review-summary">
                              <div>
                                <strong>Review submitted</strong>
                                <p>{booking.review.review_text || 'No written comment added.'}</p>
                              </div>
                              <div className="hw-booking-review-actions">
                                <span>{booking.review.rating} stars</span>
                                <button
                                  type="button"
                                  onClick={() => onEditReviewStart?.(booking)}
                                  style={{
                                    background: 'var(--hw-surface)',
                                    border: '1px solid var(--hw-border)',
                                    padding: 'var(--hw-space-2) var(--hw-space-3)',
                                    borderRadius: 'var(--hw-radius-pill)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--hw-text-sm)',
                                  }}
                                >
                                  Edit Review
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="hw-booking-review-panel">
                          <BookingReviewForm
                            booking={booking}
                            form={reviewForms[booking.id] || { rating: '5', reviewText: '' }}
                            isSubmitting={submittingReviewId === booking.id}
                            onChange={onReviewChange}
                            onSubmit={onReviewSubmit}
                          />
                        </div>
                      )
                    )}

                    <BookingReschedulePanel
                      booking={booking}
                      showActions={showActions}
                      isUpdating={updatingBookingId === booking.id}
                      onRescheduleResponse={onRescheduleResponse}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="hw-booking-empty-state">
          <EmptyState compact title="No bookings yet">
            {emptyText}
          </EmptyState>
        </div>
      )}
    </div>
  )
}
