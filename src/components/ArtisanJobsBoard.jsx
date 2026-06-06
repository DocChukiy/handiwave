import { Link } from 'react-router-dom'
import EmptyState from './EmptyState.jsx'
import SkeletonPreview from './Skeletons.jsx'

const artisanJobGroups = [
  { key: 'pending', title: 'Pending Requests', statuses: ['pending'] },
  { key: 'reschedule_requested', title: 'Reschedule Requested', statuses: ['reschedule_requested'] },
  { key: 'confirmed', title: 'Confirmed Jobs', statuses: ['confirmed'] },
  { key: 'in_progress', title: 'In Progress Jobs', statuses: ['in_progress'] },
  { key: 'completed', title: 'Completed Jobs', statuses: ['completed'] },
  { key: 'cancelled', title: 'Cancelled', statuses: ['cancelled'] },
]

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

function groupBookings(bookings) {
  return artisanJobGroups.reduce((groups, group) => ({
    ...groups,
    [group.key]: bookings.filter((booking) => group.statuses.includes(booking.rawStatus)),
  }), {})
}

function JobActions({
  booking,
  hasConflict,
  onAccept,
  onSuggestNewTime,
  onStatusUpdate,
  updatingBookingId,
}) {
  const isUpdating = updatingBookingId === booking.id

  if (booking.rawStatus === 'pending') {
    return (
      <div className="job-actions">
        <button disabled={isUpdating || hasConflict} type="button" onClick={() => onAccept(booking)}>
          {isUpdating ? 'Updating...' : 'Accept Request'}
        </button>
        <button type="button" onClick={() => onSuggestNewTime(booking)}>
          Suggest New Time
        </button>
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
        <Link className="job-message-link" to="/messages">Message Customer</Link>
      </div>
    )
  }

  if (booking.rawStatus === 'in_progress') {
    return (
      <div className="job-actions">
        <button
          disabled={isUpdating}
          type="button"
          onClick={() => onStatusUpdate(booking.id, 'completed', booking.rawStatus)}
        >
          {isUpdating ? 'Updating...' : 'Mark Artisan Completed'}
        </button>
        <Link className="job-message-link" to="/messages">Message Customer</Link>
      </div>
    )
  }

  return null
}

function JobCard({
  booking,
  conflictIds,
  onAccept,
  onSuggestNewTime,
  onStatusUpdate,
  updatingBookingId,
}) {
  const hasConflict = conflictIds.includes(booking.id)

  return (
    <article className={hasConflict ? 'job-card has-conflict' : 'job-card'}>
      <div className="job-card-header">
        <div>
          <strong>{booking.customer}</strong>
          <span>{booking.service}</span>
        </div>
        <span className={`booking-status status-${booking.rawStatus}`}>
          {booking.status}
        </span>
      </div>

      {hasConflict && (
        <p className="schedule-conflict-warning">Schedule conflict with another active job.</p>
      )}

      <div className="job-card-details">
        <p><strong>Requested:</strong> {booking.scheduledDate} at {booking.scheduledTime}</p>
        <p><strong>Location:</strong> {booking.address}, {booking.city}, {booking.state}</p>
        {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
        {booking.proposedDate && (
          <p><strong>Proposed:</strong> {booking.proposedDate} at {booking.proposedTime || 'Time pending'}</p>
        )}
        {booking.rescheduleNote && <p><strong>Reschedule note:</strong> {booking.rescheduleNote}</p>}
      </div>

      <div className="job-card-meta">
        <small>Payment: {booking.paymentStatus.replaceAll('_', ' ')}</small>
        <small>Created: {formatCreatedDate(booking.createdAt)}</small>
        {booking.rawStatus === 'reschedule_requested' && (
          <small>Requested: {formatCreatedDate(booking.rescheduleRequestedAt)}</small>
        )}
        {booking.rawStatus === 'completed' && (
          <small>Completed: {formatCreatedDate(booking.completedAt)}</small>
        )}
        {booking.rawStatus === 'completed' && (
          <small>Review: Awaiting customer review</small>
        )}
      </div>

      <JobActions
        booking={booking}
        hasConflict={hasConflict}
        onAccept={onAccept}
        onSuggestNewTime={onSuggestNewTime}
        onStatusUpdate={onStatusUpdate}
        updatingBookingId={updatingBookingId}
      />
    </article>
  )
}

function JobGrid({
  bookings,
  conflictIds,
  group,
  onAccept,
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
              onAccept={onAccept}
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
  onAccept,
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
            onAccept={onAccept}
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
