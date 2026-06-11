import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import ArtisanJobsBoard from '../components/ArtisanJobsBoard.jsx'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { getArtisanByProfileId } from '../services/artisanService.js'
import {
  getBookingsForUser,
  proposeBookingTimeForArtisan,
  sendBookingQuote,
  updateBookingStatusForArtisan,
} from '../services/bookingService.js'
import { showToast } from '../utils/toast.js'

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function ArtisanJobs() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [activeStatus, setActiveStatus] = useState('all')
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [rescheduleBooking, setRescheduleBooking] = useState(null)
  const [rescheduleNote, setRescheduleNote] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')

  const stats = useMemo(() => ({
    completed: bookings.filter((booking) => (
      booking.rawStatus === 'customer_confirmed' || booking.rawStatus === 'completed'
    )).length,
    confirmed: bookings.filter((booking) => booking.rawStatus === 'confirmed').length,
    inProgress: bookings.filter((booking) => (
      booking.rawStatus === 'in_progress' || booking.rawStatus === 'artisan_completed'
    )).length,
    pending: bookings.filter((booking) => booking.rawStatus === 'pending').length,
  }), [bookings])

  const conflictIds = useMemo(() => {
    const activeSlots = new Set(
      bookings
        .filter((booking) => (
          booking.rawStatus === 'confirmed' || booking.rawStatus === 'in_progress'
        ))
        .filter((booking) => (
          booking.scheduledDate !== 'Date pending' && booking.scheduledTime !== 'Time pending'
        ))
        .map((booking) => `${booking.scheduledDate}-${booking.scheduledTime}`),
    )

    return bookings
      .filter((booking) => booking.rawStatus === 'pending')
      .filter((booking) => activeSlots.has(`${booking.scheduledDate}-${booking.scheduledTime}`))
      .map((booking) => booking.id)
  }, [bookings])

  useEffect(() => {
    let isMounted = true

    async function loadJobs() {
      setError('')
      setIsLoading(true)

      try {
        const [artisanResult, bookingsResult] = await Promise.all([
          getArtisanByProfileId(user.id),
          getBookingsForUser(user),
        ])

        if (!isMounted) {
          return
        }

        if (artisanResult.error || bookingsResult.error) {
          setError(
            artisanResult.error?.message ||
              bookingsResult.error?.message ||
              'Unable to load artisan jobs.',
          )
        }

        setArtisan(artisanResult.data)
        setBookings(bookingsResult.data)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadJobs()

    return () => {
      isMounted = false
    }
  }, [user])

  async function refreshBookings() {
    const { data: refreshedBookings, error: refreshError } = await getBookingsForUser(user)

    if (refreshError) {
      setError(getErrorMessage(refreshError))
      return false
    }

    setBookings(refreshedBookings)
    return true
  }

  async function handleStatusUpdate(bookingId, nextStatus, currentStatus) {
    setError('')
    setUpdatingBookingId(bookingId)

    try {
      const { data, error: updateError } = await updateBookingStatusForArtisan({
        artisanProfileId: user.id,
        bookingId,
        currentStatus,
        nextStatus,
      })

      if (updateError) {
        setError(getErrorMessage(updateError))
        return
      }

      if (!data?.id) {
        setError('Supabase did not confirm the booking status update.')
        return
      }

      const didRefresh = await refreshBookings()
      if (!didRefresh) {
        return
      }

      showToast(`Booking updated to ${nextStatus.replaceAll('_', ' ')}.`)
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingBookingId('')
    }
  }

  function openRescheduleModal(booking) {
    setError('')
    setRescheduleBooking(booking)
    setRescheduleDate(booking.scheduledDate === 'Date pending' ? '' : booking.scheduledDate)
    setRescheduleTime(booking.scheduledTime === 'Time pending' ? '' : booking.scheduledTime)
    setRescheduleNote('')
  }

  async function handleQuoteSubmit(booking, { quoteNotes, quotedPrice }) {
    if (!quotedPrice || Number(quotedPrice) <= 0) {
      setError('Enter a quoted price greater than zero.')
      return false
    }

    setError('')
    setUpdatingBookingId(booking.id)

    try {
      const { data, error: quoteError } = await sendBookingQuote({
        bookingId: booking.id,
        quoteNotes,
        quotedPrice,
      })

      if (quoteError) {
        setError(getErrorMessage(quoteError))
        return false
      }

      if (!data) {
        setError('Supabase did not confirm the quote was sent.')
        return false
      }

      const didRefresh = await refreshBookings()
      if (!didRefresh) {
        return false
      }

      showToast('Quote sent to customer.')
      return true
    } catch (quoteError) {
      setError(getErrorMessage(quoteError))
      return false
    } finally {
      setUpdatingBookingId('')
    }
  }

  async function handleRescheduleSubmit(event) {
    event.preventDefault()

    if (!rescheduleBooking) {
      return
    }

    setError('')
    setUpdatingBookingId(rescheduleBooking.id)

    try {
      const { data, error: rescheduleError } = await proposeBookingTimeForArtisan({
        artisanProfileId: user.id,
        bookingId: rescheduleBooking.id,
        note: rescheduleNote,
        proposedDate: rescheduleDate,
        proposedTime: rescheduleTime,
      })

      if (rescheduleError) {
        setError(getErrorMessage(rescheduleError))
        return
      }

      if (!data?.id) {
        setError('Supabase did not confirm the proposed schedule update.')
        return
      }

      const didRefresh = await refreshBookings()
      if (!didRefresh) {
        return
      }

      setRescheduleBooking(null)
      showToast('New time proposed to customer.')
    } catch (rescheduleError) {
      setError(getErrorMessage(rescheduleError))
    } finally {
      setUpdatingBookingId('')
    }
  }

  if (!isLoading && !artisan) {
    return (
      <div className="starter-page artisan-dashboard-page">
        <section className="page-hero compact">
          <p className="section-kicker">Jobs</p>
          <h1>Create your artisan profile first</h1>
          <p>You need an artisan profile before customers can send booking requests.</p>
          <div className="hero-actions">
            <Button className="primary-cta" to="/artisan-onboarding">
              Create Artisan Profile
            </Button>
          </div>
        </section>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="starter-page artisan-dashboard-page">
      <section className="page-hero compact">
        <p className="section-kicker">Artisan jobs</p>
        <h1>Manage incoming bookings</h1>
        <p>Accept new requests, start confirmed jobs, and mark completed work from Supabase.</p>
        <div className="hero-actions">
          <Button className="secondary-cta" to="/disputes">
            View Disputes
          </Button>
        </div>
      </section>

      <section className="summary-grid">
        <div><strong>{stats.pending}</strong><span>Pending Requests</span></div>
        <div><strong>{stats.confirmed}</strong><span>Confirmed Jobs</span></div>
        <div><strong>{stats.inProgress}</strong><span>In Progress</span></div>
        <div><strong>{stats.completed}</strong><span>Completed Jobs</span></div>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      {isLoading ? (
        <ArtisanJobsBoard bookings={[]} isLoading />
      ) : bookings.length > 0 ? (
        <ArtisanJobsBoard
          activeStatus={activeStatus}
          bookings={bookings}
          conflictIds={conflictIds}
          onStatusFilter={setActiveStatus}
          onStatusUpdate={handleStatusUpdate}
          onSubmitQuote={handleQuoteSubmit}
          onSuggestNewTime={openRescheduleModal}
          updatingBookingId={updatingBookingId}
        />
      ) : (
        <EmptyState title="No booking requests yet">
          New customer requests will appear here as soon as customers book your artisan profile.
        </EmptyState>
      )}

      {rescheduleBooking && (
        <div className="modal-backdrop" role="presentation">
          <form className="reschedule-modal" onSubmit={handleRescheduleSubmit}>
            <div>
              <p className="section-kicker">Suggest new time</p>
              <h2>{rescheduleBooking.service}</h2>
              <p>Propose a better schedule for {rescheduleBooking.customer}.</p>
            </div>
            <label>
              Proposed date
              <input
                required
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </label>
            <label>
              Proposed time
              <input
                required
                type="time"
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
              />
            </label>
            <label>
              Optional note
              <textarea
                placeholder="Explain why this time works better."
                value={rescheduleNote}
                onChange={(event) => setRescheduleNote(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                className="secondary-cta"
                type="button"
                onClick={() => setRescheduleBooking(null)}
              >
                Cancel
              </button>
              <button className="primary-cta" disabled={updatingBookingId === rescheduleBooking.id} type="submit">
                {updatingBookingId === rescheduleBooking.id ? 'Saving...' : 'Send Proposal'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}

export default ArtisanJobs
