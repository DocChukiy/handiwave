import { useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from './EmptyState.jsx'
import SkeletonPreview from './Skeletons.jsx'

const artisanJobGroups = [
  { key: 'pending', title: 'Pending Requests', statuses: ['pending'] },
  { key: 'reschedule_requested', title: 'Reschedule Requested', statuses: ['reschedule_requested'] },
  { key: 'confirmed', title: 'Confirmed Jobs', statuses: ['confirmed'] },
  { key: 'in_progress', title: 'In Progress Jobs', statuses: ['in_progress', 'artisan_completed'] },
  { key: 'completed', title: 'Completed Jobs', statuses: ['customer_confirmed', 'completed'] },
  { key: 'cancelled', title: 'Cancelled', statuses: ['cancelled'] },
]

const jobStatusLabels = {
  artisan_completed: 'Awaiting Customer Confirmation',
  cancelled: 'Cancelled',
  completed: 'Completed',
  confirmed: 'Confirmed',
  customer_confirmed: 'Customer Confirmed',
  in_progress: 'In Progress',
  pending: 'Pending',
  reschedule_requested: 'Reschedule Requested',
}

const paymentStatusLabels = {
  failed: 'Failed',
  held_in_escrow: 'Held in escrow',
  refunded: 'Refunded',
  released: 'Released',
  unpaid: 'Unpaid',
}

function formatMoney(value, currency = 'NGN') {
  return `${currency} ${Number(value || 0).toLocaleString()}`
}

function formatCreatedDate(value) {
  if (!value) {
    return 'Created date unavailable'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function getBookingPrice(booking) {
  return booking.finalPrice || booking.quotedPrice || booking.escrowAmount || 0
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

const quoteStatusLabels = {
  accepted: 'Quote Accepted',
  awaiting: 'Awaiting Quote',
  paid: 'Paid / Escrow Held',
  rejected: 'Quote Rejected',
  sent: 'Quote Sent',
}

function QuoteStatusBadge({ status }) {
  return (
    <span className={`quote-status-badge quote-${status}`}>
      {quoteStatusLabels[status]}
    </span>
  )
}

function ImagePreviewModal({ altText, imageUrl, title, onClose }) {
  return (
    <div className="modal-backdrop image-preview-backdrop" role="presentation" onClick={onClose}>
      <div className="image-preview-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="image-preview-header">
          <strong>{title}</strong>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        {imageUrl ? (
          <img alt={altText} src={imageUrl} />
        ) : (
          <p>Preview is unavailable for this attachment.</p>
        )}
      </div>
    </div>
  )
}

function getFallbackPlatformFee(booking) {
  const price = getBookingPrice(booking)
  const rate = booking.commissionRate || 0.1

  return Math.round(price * rate * 100) / 100
}

function ArtisanPayoutPanel({ booking }) {
  const price = getBookingPrice(booking)

  if (!price) {
    return null
  }

  const platformFee = booking.platformFee || getFallbackPlatformFee(booking)
  const expectedPayout = booking.artisanPayoutAmount || Math.max(price - platformFee, 0)

  return (
    <div className="job-payment-panel">
      <span>
        <strong>{formatMoney(expectedPayout)}</strong>
        Expected payout
      </span>
      <span>
        <strong>{formatMoney(platformFee)}</strong>
        Platform fee
      </span>
      <span>
        <strong>{paymentStatusLabels[booking.paymentStatus] || booking.paymentStatus.replaceAll('_', ' ')}</strong>
        Escrow/payment status
      </span>
      <p>Escrow release after customer confirmation. Paystack-paid jobs show here as held in escrow until completion is confirmed.</p>
    </div>
  )
}

function groupBookings(bookings) {
  return artisanJobGroups.reduce((groups, group) => ({
    ...groups,
    [group.key]: bookings.filter((booking) => group.statuses.includes(booking.rawStatus)),
  }), {})
}

function JobActions({
  booking,
  hasConflict,
  onSuggestNewTime,
  onToggleQuoteForm,
  onStatusUpdate,
  updatingBookingId,
}) {
  const isUpdating = updatingBookingId === booking.id
  const quoteStatus = getQuoteStatus(booking)
  const hasEscrowPayment = booking.paymentStatus === 'held_in_escrow'

  if (booking.rawStatus === 'pending') {
    if (quoteStatus === 'awaiting' || quoteStatus === 'rejected') {
      return (
        <div className="job-actions">
          <button className="primary-job-action" disabled={isUpdating} type="button" onClick={onToggleQuoteForm}>
            {quoteStatus === 'rejected' ? 'Send Revised Quote' : 'Send Quote'}
          </button>
          <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>
            Message Customer
          </Link>
          <button
            disabled={isUpdating}
            type="button"
            onClick={() => onStatusUpdate(booking.id, 'cancelled', booking.rawStatus)}
          >
            Reject Request
          </button>
        </div>
      )
    }

    if (quoteStatus === 'sent') {
      return (
        <div className="job-actions">
          <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>
            Message Customer
          </Link>
          <span className="job-action-note">Waiting for customer response.</span>
        </div>
      )
    }

    if (quoteStatus === 'accepted' && !hasEscrowPayment) {
      return (
        <div className="job-actions">
          <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>
            Message Customer
          </Link>
          <span className="job-action-note">Waiting for customer payment.</span>
        </div>
      )
    }

    if (hasEscrowPayment) {
      return (
        <div className="job-actions">
          <button disabled={isUpdating || hasConflict} type="button" onClick={() => onStatusUpdate(booking.id, 'confirmed', booking.rawStatus)}>
            {isUpdating ? 'Updating...' : 'Accept Request'}
          </button>
          <button type="button" onClick={() => onSuggestNewTime(booking)}>
            Suggest New Time
          </button>
          <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>
            Message Customer
          </Link>
          {hasConflict && (
            <span className="job-action-note">Resolve schedule conflict before this can be confirmed.</span>
          )}
        </div>
      )
    }

    return (
      <div className="job-actions">
        <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>
          Message Customer
        </Link>
      </div>
    )
  }

  if (booking.rawStatus === 'reschedule_requested') {
    return (
      <div className="job-actions">
        <button
          disabled={isUpdating}
          type="button"
          onClick={() => onStatusUpdate(booking.id, 'cancelled', booking.rawStatus)}
        >
          Cancel Request
        </button>
        <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>
          Message Customer
        </Link>
      </div>
    )
  }

  if (booking.rawStatus === 'confirmed') {
    return (
      <div className="job-actions">
        <button
          disabled={isUpdating}
          type="button"
          onClick={() => onStatusUpdate(booking.id, 'in_progress', booking.rawStatus)}
        >
          {isUpdating ? 'Updating...' : 'Start Job'}
        </button>
        <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>Message Customer</Link>
      </div>
    )
  }

  if (booking.rawStatus === 'in_progress') {
    return (
      <div className="job-actions">
        <button
          disabled={isUpdating}
          type="button"
          onClick={() => onStatusUpdate(booking.id, 'artisan_completed', booking.rawStatus)}
        >
          {isUpdating ? 'Updating...' : 'Mark Artisan Completed'}
        </button>
        <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>Message Customer</Link>
      </div>
    )
  }

  return null
}

function JobCard({
  booking,
  conflictIds,
  onSubmitQuote,
  onSuggestNewTime,
  onStatusUpdate,
  updatingBookingId,
}) {
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false)
  const [quoteNotes, setQuoteNotes] = useState(booking.quoteNotes || '')
  const [quotedPrice, setQuotedPrice] = useState(booking.quotedPrice || booking.finalPrice || '')
  const [selectedAttachment, setSelectedAttachment] = useState(null)
  const hasConflict = conflictIds.includes(booking.id)
  const quoteStatus = getQuoteStatus(booking)
  const isUpdating = updatingBookingId === booking.id
  const shouldShowPayoutPanel = (
    booking.rawStatus !== 'pending' ||
    booking.paymentStatus === 'held_in_escrow'
  )

  async function handleInlineQuoteSubmit(event) {
    event.preventDefault()

    const didSubmit = await onSubmitQuote?.(booking, {
      quoteNotes,
      quotedPrice,
    })

    if (didSubmit) {
      setIsQuoteFormOpen(false)
    }
  }

  return (
    <article className={hasConflict ? 'job-card has-conflict' : 'job-card'}>
      <div className="job-card-header">
        <div>
          <strong>{booking.customer}</strong>
          <span>{booking.service}</span>
        </div>
        <span className={`booking-status status-${booking.rawStatus}`}>
          {jobStatusLabels[booking.rawStatus] || booking.status}
        </span>
      </div>

      {hasConflict && (
        <p className="schedule-conflict-warning">Schedule conflict with another active job.</p>
      )}

      <div className="job-card-details">
        <p><strong>Requested:</strong> {booking.scheduledDate} at {booking.scheduledTime}</p>
        <p><strong>Location:</strong> {booking.address}, {booking.city}, {booking.state}</p>
        {booking.notes && <p><strong>Issue description:</strong> {booking.notes}</p>}
        {booking.attachments?.length > 0 && (
          <div className="job-attachment-gallery">
            <strong>Issue photos</strong>
            <div className="job-attachment-grid">
              {booking.attachments.map((attachment) => (
                <button
                  key={attachment.id || attachment.filePath}
                  type="button"
                  onClick={() => setSelectedAttachment(attachment)}
                >
                  {attachment.fileUrl ? (
                    <img alt={attachment.fileName} src={attachment.fileUrl} />
                  ) : (
                    <span>{attachment.fileName}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={`job-quote-panel quote-${quoteStatus}`}>
          <div>
            <strong>{quoteStatusLabels[quoteStatus]}</strong>
            <p>
              {quoteStatus === 'awaiting' && 'Send a price quote before the customer can pay.'}
              {quoteStatus === 'sent' && 'Waiting for customer to accept or reject your quote.'}
              {quoteStatus === 'accepted' && 'Quote accepted. Waiting for customer payment.'}
              {quoteStatus === 'rejected' && 'Customer rejected this quote. Send a new quote if needed.'}
              {quoteStatus === 'paid' && 'Payment held in escrow. You can now accept and start the job.'}
            </p>
          </div>
          <QuoteStatusBadge status={quoteStatus} />
          {booking.quoteSentAt && (
            <div className="job-quote-details">
              <span><strong>{formatMoney(booking.quotedPrice)}</strong> Quoted price</span>
              {booking.quoteNotes && <span><strong>Notes</strong> {booking.quoteNotes}</span>}
            </div>
          )}
        </div>
        {isQuoteFormOpen && (
          <form className="inline-quote-form" onSubmit={handleInlineQuoteSubmit}>
            <label>
              Quoted price
              <input
                required
                min="1"
                placeholder="25000"
                type="number"
                value={quotedPrice}
                onChange={(event) => setQuotedPrice(event.target.value)}
              />
            </label>
            <label>
              Quote notes
              <textarea
                placeholder="Explain what is included, materials needed, timing, and assumptions."
                value={quoteNotes}
                onChange={(event) => setQuoteNotes(event.target.value)}
              />
            </label>
            <div className="inline-quote-actions">
              <button className="secondary-cta" disabled={isUpdating} type="button" onClick={() => setIsQuoteFormOpen(false)}>
                Cancel
              </button>
              <button className="primary-cta" disabled={isUpdating} type="submit">
                {isUpdating ? 'Sending...' : 'Submit Quote'}
              </button>
            </div>
          </form>
        )}
        {booking.proposedDate && (
          <p><strong>Proposed:</strong> {booking.proposedDate} at {booking.proposedTime || 'Time pending'}</p>
        )}
        {booking.rescheduleNote && <p><strong>Reschedule note:</strong> {booking.rescheduleNote}</p>}
      </div>

      {shouldShowPayoutPanel && <ArtisanPayoutPanel booking={booking} />}

      <div className="job-card-meta">
        {shouldShowPayoutPanel && (
          <small>Payment: {booking.paymentStatus.replaceAll('_', ' ')}</small>
        )}
        <small>Created: {formatCreatedDate(booking.createdAt)}</small>
        {booking.rawStatus === 'reschedule_requested' && (
          <small>Requested: {formatCreatedDate(booking.rescheduleRequestedAt)}</small>
        )}
        {booking.rawStatus === 'artisan_completed' && (
          <small className="awaiting-confirmation-chip">Awaiting customer confirmation</small>
        )}
        {booking.rawStatus === 'artisan_completed' && (
          <small>Marked done: {formatCreatedDate(booking.completedAt)}</small>
        )}
        {booking.rawStatus === 'artisan_completed' && (
          <small>Review: Waiting for customer confirmation</small>
        )}
        {(booking.rawStatus === 'customer_confirmed' || booking.rawStatus === 'completed') && (
          <small>Review: {booking.review ? `${booking.review.rating} stars` : 'Awaiting customer review'}</small>
        )}
      </div>

      <JobActions
        booking={booking}
        hasConflict={hasConflict}
        onSuggestNewTime={onSuggestNewTime}
        onToggleQuoteForm={() => setIsQuoteFormOpen((isOpen) => !isOpen)}
        onStatusUpdate={onStatusUpdate}
        updatingBookingId={updatingBookingId}
      />
      {selectedAttachment && (
        <ImagePreviewModal
          altText={selectedAttachment.fileName}
          imageUrl={selectedAttachment.fileUrl}
          title={selectedAttachment.fileName}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </article>
  )
}

function JobGrid({
  bookings,
  conflictIds,
  group,
  onSubmitQuote,
  onStatusFilter,
  onStatusUpdate,
  onSuggestNewTime,
  preview = false,
  updatingBookingId,
}) {
  const visibleBookings = preview ? bookings.slice(0, 3) : bookings

  return (
    <section className="job-group-section">
      <div className="job-group-header">
        <div>
          <p className="section-kicker">{group.title}</p>
          <h2>{bookings.length} job{bookings.length === 1 ? '' : 's'}</h2>
        </div>
        {preview && bookings.length > visibleBookings.length && (
          <button type="button" onClick={() => onStatusFilter(group.key)}>
            View all {group.title}
          </button>
        )}
      </div>

      {bookings.length === 0 ? (
        <EmptyState compact title={`No ${group.title.toLowerCase()}`}>
          Nothing is waiting in this status right now.
        </EmptyState>
      ) : (
        <div className="job-card-grid">
          {visibleBookings.map((booking) => (
            <JobCard
              booking={booking}
              conflictIds={conflictIds}
              key={booking.id}
              onSubmitQuote={onSubmitQuote}
              onStatusUpdate={onStatusUpdate}
              onSuggestNewTime={onSuggestNewTime}
              updatingBookingId={updatingBookingId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ArtisanJobsBoard({
  activeStatus = 'all',
  bookings,
  conflictIds = [],
  emptyText = 'Customer booking requests assigned to your profile will appear here.',
  isLoading = false,
  onSubmitQuote,
  onStatusFilter,
  onStatusUpdate,
  onSuggestNewTime,
  updatingBookingId = '',
}) {
  const groupedBookings = groupBookings(bookings)

  if (isLoading) {
    return <SkeletonPreview count={5} label="Loading artisan jobs" type="service" />
  }

  if (bookings.length === 0) {
    return (
      <EmptyState title="No artisan jobs yet">
        {emptyText}
      </EmptyState>
    )
  }

  return (
    <>
      <div className="job-filter-tabs" role="tablist" aria-label="Filter artisan jobs by status">
        <button
          className={activeStatus === 'all' ? 'active' : ''}
          type="button"
          onClick={() => onStatusFilter?.('all')}
        >
          All
          <span>{bookings.length}</span>
        </button>
        {artisanJobGroups.map((group) => (
          <button
            className={activeStatus === group.key ? 'active' : ''}
            key={group.key}
            type="button"
            onClick={() => onStatusFilter?.(group.key)}
          >
            {group.title}
            <span>{groupedBookings[group.key].length}</span>
          </button>
        ))}
      </div>

      <div className="job-board-layout">
        {(activeStatus === 'all'
          ? artisanJobGroups
          : artisanJobGroups.filter((group) => group.key === activeStatus)
        ).map((group) => (
          <JobGrid
            bookings={groupedBookings[group.key]}
            conflictIds={conflictIds}
            group={group}
            key={group.key}
            onSubmitQuote={onSubmitQuote}
            onStatusFilter={onStatusFilter}
            onStatusUpdate={onStatusUpdate}
            onSuggestNewTime={onSuggestNewTime}
            preview={activeStatus === 'all'}
            updatingBookingId={updatingBookingId}
          />
        ))}
      </div>
    </>
  )
}

export default ArtisanJobsBoard
