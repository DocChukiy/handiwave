import { Link } from 'react-router-dom'
import Card from '../ui/Card.jsx'
import Avatar from '../ui/Avatar.jsx'
import BookingStatusBadge from './BookingStatusBadge.jsx'
import BookingTimeline from './BookingTimeline.jsx'
import BookingNextAction from './BookingNextAction.jsx'
import BookingAttachmentGallery from './BookingAttachmentGallery.jsx'

function getArtisanName(artisan) {
  return artisan?.profile?.full_name || artisan?.business_name || 'Handiwave artisan'
}

export default function BookingCard({
  booking,
  participantLabel,
  showActions = false,
  isCustomer = false,
  user,
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
}) {
  const status = booking.rawStatus || booking.status
  const isReschedule = status === 'reschedule_requested'

  return (
    <Card
      variant={isReschedule ? 'outlined' : 'default'}
      padding="none"
      className={`hw-booking-card ${isReschedule ? 'reschedule' : ''}`}
    >
      <div className="hw-booking-card-header">
        <div className="hw-booking-card-header-content">
          <Avatar
            name={isCustomer ? booking.artisan : booking.customer}
            size="md"
          />
          <div className="hw-booking-card-info">
            <h3>{booking.service}</h3>
            <div className="hw-booking-card-meta">
              <span className="hw-booking-card-meta-item">
                {participantLabel(booking)}
              </span>
              <span className="hw-booking-card-meta-item">
                {booking.scheduledDate} at {booking.scheduledTime}
              </span>
              <span className="hw-booking-card-meta-item">
                {booking.city}, {booking.state}
              </span>
            </div>
          </div>
        </div>
        <BookingStatusBadge status={status} />
      </div>

      <div className="hw-booking-card-body">
        {booking.notes && (
          <p style={{ color: 'var(--hw-text-secondary)', margin: '0 0 var(--hw-space-3)' }}>
            {booking.notes}
          </p>
        )}

        <BookingTimeline booking={booking} />

        <BookingAttachmentGallery attachments={booking.attachments} />

        {isReschedule && (
          <div className="hw-booking-reschedule-panel">
            <div className="hw-booking-reschedule-heading">
              <strong>Artisan proposed a new time</strong>
              <span className="hw-booking-awaiting-response-badge">Awaiting Your Response</span>
            </div>
            <div className="hw-booking-reschedule-grid">
              <span>
                <strong>Original</strong>
                {booking.scheduledDate} at {booking.scheduledTime}
              </span>
              <span>
                <strong>Proposed</strong>
                {booking.proposedDate || 'Date pending'} at {booking.proposedTime || 'Time pending'}
              </span>
            </div>
            {booking.rescheduleNote && (
              <p className="hw-booking-reschedule-note">{booking.rescheduleNote}</p>
            )}
          </div>
        )}

        {showActions && (
          <BookingNextAction
            booking={booking}
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
            isCustomer={isCustomer}
            userId={user?.id}
          />
        )}

        {showActions && ['confirmed', 'in_progress', 'artisan_completed', 'customer_confirmed', 'completed'].includes(status) && (
          <div className="hw-booking-message-actions">
            <Link to={`/messages?booking=${booking.id}`}>
              Message Artisan
            </Link>
          </div>
        )}
      </div>
    </Card>
  )
}
