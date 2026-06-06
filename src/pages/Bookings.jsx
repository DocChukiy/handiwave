import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  createBooking,
  getBookingOptions,
  getBookingsForUser,
} from '../services/bookingService.js'
import { getSupabaseClient } from '../lib/supabaseClient.js'
import { showToast } from '../utils/toast.js'

const initialForm = {
  address: '',
  artisanId: '',
  city: '',
  notes: '',
  scheduledDate: '',
  scheduledTime: '',
  serviceId: '',
  state: '',
}

const statusLabels = {
  cancelled: 'Cancelled',
  completed: 'Completed',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  pending: 'Pending',
  reschedule_requested: 'Reschedule requested',
}

function BookingHistorySection({
  bookings,
  emptyText,
  isLoading,
  participantLabel,
  title,
}) {
  return (
    <div className="list-panel booking-history-panel">
      <div className="booking-history-header">
        <div>
          <p className="section-kicker">History</p>
          <h2>{title}</h2>
        </div>
      </div>

      {isLoading ? (
        <SkeletonPreview count={3} label={`Loading ${title}`} type="service" />
      ) : bookings.length > 0 ? (
        bookings.map((booking) => (
          <article className="list-row booking-row" key={booking.id}>
            <div>
              <h3>{booking.service}</h3>
              <p>{participantLabel(booking)} • {booking.date}</p>
              <p>{booking.address}, {booking.city}, {booking.state}</p>
              {booking.notes && <p>{booking.notes}</p>}
              {booking.rawStatus === 'reschedule_requested' && (
                <div className="booking-reschedule-note">
                  <strong>Artisan proposed a new time</strong>
                  <p>
                    {booking.proposedDate || 'Date pending'} at {booking.proposedTime || 'Time pending'}
                  </p>
                  {booking.rescheduleNote && <p>{booking.rescheduleNote}</p>}
                </div>
              )}
            </div>
            <BookingStatusBadge status={booking.rawStatus} />
          </article>
        ))
      ) : (
        <EmptyState compact title="No bookings yet">
          {emptyText}
        </EmptyState>
      )}
    </div>
  )
}

function getArtisanName(artisan) {
  return artisan.profile?.full_name || artisan.business_name || 'Handiwave artisan'
}

function BookingStatusBadge({ status }) {
  return (
    <span className={`booking-status status-${status}`}>
      {statusLabels[status] || status.replaceAll('_', ' ')}
    </span>
  )
}

function Bookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [options, setOptions] = useState({ artisans: [], services: [] })

  const isCustomer = user?.role === 'customer'
  const selectedArtisan = options.artisans.find((artisan) => artisan.id === form.artisanId)
  const selectedService = options.services.find((service) => service.id === form.serviceId)

  const summary = useMemo(() => {
    const upcomingCount = bookings.filter((booking) => (
      ['pending', 'reschedule_requested', 'confirmed', 'in_progress'].includes(booking.rawStatus)
    )).length
    const completedCount = bookings.filter((booking) => booking.rawStatus === 'completed').length
    const cancelledCount = bookings.filter((booking) => booking.rawStatus === 'cancelled').length

    return {
      cancelledCount,
      completedCount,
      upcomingCount,
    }
  }, [bookings])

  useEffect(() => {
    let isMounted = true

    async function loadBookingPage() {
      setError('')
      setIsLoading(true)

      try {
        const [optionsResult, bookingsResult] = await Promise.all([
          getBookingOptions(),
          getBookingsForUser(user),
        ])

        if (!isMounted) {
          return
        }

        if (optionsResult.error || bookingsResult.error) {
          setError(
            optionsResult.error?.message ||
              bookingsResult.error?.message ||
              'Unable to load bookings.',
          )
        }

        const nextOptions = optionsResult.data
        setOptions(nextOptions)
        setBookings(bookingsResult.data)

        setForm((currentForm) => {
          const firstArtisan = nextOptions.artisans[0]
          const firstService = nextOptions.services[0]

          return {
            ...currentForm,
            artisanId: currentForm.artisanId || firstArtisan?.id || '',
            serviceId:
              currentForm.serviceId ||
              firstArtisan?.primary_service_id ||
              firstService?.id ||
              '',
          }
        })
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

    loadBookingPage()

    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    if (!isCustomer || !user?.id) {
      return undefined
    }

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`customer-bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `customer_id=eq.${user.id}`,
          schema: 'public',
          table: 'bookings',
        },
        async () => {
          const { data, error: refreshError } = await getBookingsForUser(user)

          if (refreshError) {
            setError(refreshError.message)
            return
          }

          setBookings(data)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isCustomer, user])

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function handleArtisanChange(artisanId) {
    const artisan = options.artisans.find((item) => item.id === artisanId)

    setForm((currentForm) => ({
      ...currentForm,
      artisanId,
      serviceId: artisan?.primary_service_id || currentForm.serviceId,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!isCustomer) {
      setError('Only customer accounts can create bookings.')
      return
    }

    if (!form.artisanId || !form.serviceId || !form.scheduledDate || !form.scheduledTime) {
      setError('Please choose an artisan, service, date, and time.')
      return
    }

    if (!form.address.trim() || !form.city.trim() || !form.state.trim()) {
      setError('Please enter your address, city, and state.')
      return
    }

    setIsSaving(true)

    try {
      const { data, error: saveError } = await createBooking({
        address: form.address,
        artisanId: form.artisanId,
        city: form.city,
        customerId: user.id,
        notes: form.notes,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        serviceId: form.serviceId,
        state: form.state,
        userRole: user.role,
      })

      if (saveError) {
        setError(saveError.message)
        return
      }

      if (!data?.id) {
        setError('Supabase did not confirm that the booking row was created.')
        return
      }

      setBookings((currentBookings) => [data, ...currentBookings])
      setForm((currentForm) => ({
        ...initialForm,
        artisanId: currentForm.artisanId,
        serviceId: currentForm.serviceId,
      }))
      showToast('Booking request saved to Supabase successfully.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Bookings</p>
        <h1>{isCustomer ? 'Book a trusted artisan' : 'Manage real bookings'}</h1>
        <p>
          {isCustomer
            ? 'Choose a verified artisan, share your location, and confirm appointment details before work begins.'
            : 'View customer requests, appointment details, locations, and booking progress from Supabase.'}
        </p>
      </section>

      <section className="summary-grid">
        <div><strong>{summary.upcomingCount}</strong><span>Upcoming</span></div>
        <div><strong>{summary.completedCount}</strong><span>Completed</span></div>
        <div><strong>{summary.cancelledCount}</strong><span>Cancelled</span></div>
      </section>

      <RoleNotice />

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="booking-layout">
        {isCustomer && (
          <form className="booking-form" onSubmit={handleSubmit}>
            <h2>Service details</h2>
            <label>
              Preferred artisan
              <select
                disabled={isLoading || isSaving}
                value={form.artisanId}
                onChange={(event) => handleArtisanChange(event.target.value)}
              >
                <option value="">Select an artisan</option>
                {options.artisans.map((artisan) => (
                  <option key={artisan.id} value={artisan.id}>
                    {getArtisanName(artisan)} • {artisan.city}, {artisan.state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service type
              <select
                disabled={isLoading || isSaving}
                value={form.serviceId}
                onChange={(event) => updateForm('serviceId', event.target.value)}
              >
                <option value="">Select a service</option>
                {options.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedArtisan && selectedService && (
              <p className="price-note">
                {getArtisanName(selectedArtisan)} usually handles {selectedService.name}
                {selectedArtisan.starting_price
                  ? ` from NGN ${Number(selectedArtisan.starting_price).toLocaleString()}.`
                  : '.'}
              </p>
            )}
            <label>
              Address
              <input
                disabled={isSaving}
                placeholder="House 12, Admiralty Way"
                value={form.address}
                onChange={(event) => updateForm('address', event.target.value)}
              />
            </label>
            <div className="form-split">
              <label>
                City
                <input
                  disabled={isSaving}
                  placeholder="Lekki"
                  value={form.city}
                  onChange={(event) => updateForm('city', event.target.value)}
                />
              </label>
              <label>
                State
                <input
                  disabled={isSaving}
                  placeholder="Lagos"
                  value={form.state}
                  onChange={(event) => updateForm('state', event.target.value)}
                />
              </label>
            </div>
            <div className="form-split">
              <label>
                Date
                <input
                  disabled={isSaving}
                  type="date"
                  value={form.scheduledDate}
                  onChange={(event) => updateForm('scheduledDate', event.target.value)}
                />
              </label>
              <label>
                Time
                <input
                  disabled={isSaving}
                  type="time"
                  value={form.scheduledTime}
                  onChange={(event) => updateForm('scheduledTime', event.target.value)}
                />
              </label>
            </div>
            <label>
              Notes
              <textarea
                disabled={isSaving}
                placeholder="Describe the issue or service needed"
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
              />
            </label>
            <button disabled={isLoading || isSaving} type="submit">
              {isSaving ? 'Sending request...' : 'Confirm Booking'}
            </button>
          </form>
        )}

        {isCustomer ? (
          <BookingHistorySection
            bookings={bookings}
            emptyText="Your confirmed service requests will appear here after Supabase creates the booking row."
            isLoading={isLoading}
            participantLabel={(booking) => booking.artisan}
            title="Customer booking history"
          />
        ) : (
          <BookingHistorySection
            bookings={bookings}
            emptyText="Customer bookings assigned to your artisan profile will appear here."
            isLoading={isLoading}
            participantLabel={(booking) => booking.customer}
            title="Artisan booking history"
          />
        )}
      </section>
    </div>
  )
}

export default Bookings
