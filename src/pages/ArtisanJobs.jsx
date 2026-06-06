import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import ArtisanJobsBoard from '../components/ArtisanJobsBoard.jsx'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { getArtisanByProfileId } from '../services/artisanService.js'
import {
  getBookingsForUser,
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
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingBookingId, setUpdatingBookingId] = useState('')

  const stats = useMemo(() => ({
    active: bookings.filter((booking) => (
      booking.rawStatus === 'confirmed' || booking.rawStatus === 'in_progress'
    )).length,
    completed: bookings.filter((booking) => booking.rawStatus === 'completed').length,
    pending: bookings.filter((booking) => booking.rawStatus === 'pending').length,
  }), [bookings])

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

      const { data: refreshedBookings, error: refreshError } = await getBookingsForUser(user)

      if (refreshError) {
        setError(getErrorMessage(refreshError))
        return
      }

      setBookings(refreshedBookings)
      showToast(`Booking updated to ${nextStatus.replaceAll('_', ' ')}.`)
    } catch (updateError) {
      setError(getErrorMessage(updateError))
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
      </section>

      <section className="summary-grid">
        <div><strong>{stats.pending}</strong><span>Pending jobs</span></div>
        <div><strong>{stats.active}</strong><span>Active jobs</span></div>
        <div><strong>{stats.completed}</strong><span>Completed jobs</span></div>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      {isLoading ? (
        <ArtisanJobsBoard bookings={[]} isLoading />
      ) : bookings.length > 0 ? (
        <ArtisanJobsBoard
          bookings={bookings}
          onStatusUpdate={handleStatusUpdate}
          updatingBookingId={updatingBookingId}
        />
      ) : (
        <EmptyState title="No booking requests yet">
          New customer requests will appear here as soon as customers book your artisan profile.
        </EmptyState>
      )}
    </div>
  )
}

export default ArtisanJobs
