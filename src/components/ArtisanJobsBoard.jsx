import EmptyState from './EmptyState.jsx'
import SkeletonPreview from './Skeletons.jsx'

const artisanJobGroups = [
  { key: 'pending', title: 'Pending Requests' },
  { key: 'confirmed', title: 'Confirmed' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'completed', title: 'Completed' },
  { key: 'cancelled', title: 'Cancelled' },
]

const statusActions = {
  pending: [
    { label: 'Accept Booking', nextStatus: 'confirmed' },
    { label: 'Reject Booking', nextStatus: 'cancelled' },
  ],
  confirmed: [
    { label: 'Start Job', nextStatus: 'in_progress' },
  ],
  in_progress: [
    { label: 'Complete Job', nextStatus: 'completed' },
  ],
}

function groupBookings(bookings) {
  return artisanJobGroups.reduce((groups, group) => ({
    ...groups,
    [group.key]: bookings.filter((booking) => booking.rawStatus === group.key),
  }), {})
}

function ArtisanJobsBoard({
  bookings,
  emptyText = 'Customer booking requests assigned to your profile will appear here.',
  isLoading = false,
  onStatusUpdate,
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
    <div className="job-status-grid">
      {artisanJobGroups.map((group) => (
        <article className="job-status-column" key={group.key}>
          <h3>{group.title}</h3>
          {groupedBookings[group.key].length === 0 ? (
            <p className="muted-copy">No {group.title.toLowerCase()}.</p>
          ) : (
            groupedBookings[group.key].map((booking) => (
              <div className="job-card" key={booking.id}>
                <div>
                  <strong>{booking.service}</strong>
                  <span>{booking.customer}</span>
                </div>
                <p>{booking.scheduledDate} at {booking.scheduledTime}</p>
                <p>{booking.address}, {booking.city}, {booking.state}</p>
                {booking.notes && <p>{booking.notes}</p>}
                <small>Status: {booking.status}</small>
                <small>Payment: {booking.paymentStatus.replaceAll('_', ' ')}</small>
                {statusActions[group.key] && (
                  <div className="job-actions">
                    {statusActions[group.key].map((action) => (
                      <button
                        disabled={updatingBookingId === booking.id}
                        key={action.nextStatus}
                        type="button"
                        onClick={() => onStatusUpdate(booking.id, action.nextStatus, booking.rawStatus)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </article>
      ))}
    </div>
  )
}

export default ArtisanJobsBoard
