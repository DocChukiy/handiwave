import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  confirmBookingCompleteForCustomer,
  createBooking,
  getBookingOptions,
  getBookingsForUser,
  reportBookingIssueForCustomer,
  respondToBookingReschedule,
} from '../services/bookingService.js'
import { submitBookingReview } from '../services/reviewService.js'
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
  artisan_completed: 'Artisan completed',
  completed: 'Completed',
  confirmed: 'Confirmed',
  customer_confirmed: 'Customer confirmed',
  disputed: 'Issue reported',
  in_progress: 'In progress',
  pending: 'Pending',
  reschedule_requested: 'Reschedule requested',
}

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function CompletionReviewForm({
  booking,
  form,
  isSubmitting,
  onChange,
  onSubmit,
}) {
  return (
    <form className="booking-review-form" onSubmit={(event) => onSubmit(event, booking)}>
      <div>
        <strong>Leave a verified review</strong>
        <p>Your feedback helps other customers choose trusted artisans.</p>
      </div>
      <label>
        Rating
        <select
          disabled={isSubmitting}
          value={form.rating}
          onChange={(event) => onChange(booking.id, 'rating', event.target.value)}
        >
          <option value="5">5 stars - Excellent</option>
          <option value="4">4 stars - Good</option>
          <option value="3">3 stars - Okay</option>
          <option value="2">2 stars - Poor</option>
          <option value="1">1 star - Bad</option>
        </select>
      </label>
      <label>
        Review
        <textarea
          disabled={isSubmitting}
          placeholder="Share what went well, timing, quality, and professionalism."
          value={form.reviewText}
          onChange={(event) => onChange(booking.id, 'reviewText', event.target.value)}
        />
      </label>
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Submitting review...' : 'Submit Review'}
      </button>
    </form>
  )
}

function BookingHistorySection({
  bookings,
  emptyText,
  onCompletionAction,
  isLoading,
  onReviewChange,
  onReviewSubmit,
  onRescheduleResponse,
  participantLabel,
  reviewForms = {},
  showRescheduleActions = false,
  updatingCompletionId,
  title,
  submittingReviewId,
  updatingBookingId,
}) {
  const rescheduleRequestCount = bookings.filter((booking) => (
    (booking.rawStatus || booking.status) === 'reschedule_requested'
  )).length

  return (
    <div className="list-panel booking-history-panel">
      <div className="booking-history-header">
        <div>
          <p className="section-kicker">History</p>
          <h2>{title}</h2>
        </div>
      </div>

      {!isLoading && showRescheduleActions && (
        <div className="customer-reschedule-summary">
          {rescheduleRequestCount > 0 ? (
            <>
              <span className="awaiting-response-badge">Awaiting Your Response</span>
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
        <SkeletonPreview count={3} label={`Loading ${title}`} type="service" />
      ) : bookings.length > 0 ? (
        bookings.map((booking) => {
          const bookingStatus = booking.rawStatus || booking.status

          if (showRescheduleActions) {
            console.log('Rendering customer booking card', booking.id, booking.status)
          }

          return (
            <article
              className={
                bookingStatus === 'reschedule_requested'
                  ? 'list-row booking-row reschedule-booking-card'
                  : 'list-row booking-row'
              }
              key={booking.id}
            >
              <div className="booking-card-content">
                <div className="booking-card-top-row">
                  <h3>{booking.service}</h3>
                  <BookingStatusBadge status={bookingStatus} />
                </div>
                <div className="booking-card-meta-row">
                  <span>{participantLabel(booking)}</span>
                  <span>{booking.address}, {booking.city}, {booking.state}</span>
                  <span>{booking.scheduledDate} at {booking.scheduledTime}</span>
                </div>
                {booking.notes && <p>{booking.notes}</p>}
                {showRescheduleActions && bookingStatus === 'artisan_completed' && (
                  <div className="booking-completion-panel">
                    <div>
                      <strong>Artisan marked this job as completed</strong>
                      <p>Please confirm the work was completed safely before leaving a review.</p>
                    </div>
                    <div className="booking-completion-actions">
                      <button
                        disabled={updatingCompletionId === booking.id}
                        type="button"
                        onClick={() => onCompletionAction?.(booking, 'confirm')}
                      >
                        {updatingCompletionId === booking.id ? 'Confirming...' : 'Confirm Job Complete'}
                      </button>
                      <button
                        disabled={updatingCompletionId === booking.id}
                        type="button"
                        onClick={() => onCompletionAction?.(booking, 'report')}
                      >
                        {updatingCompletionId === booking.id ? 'Reporting...' : 'Report Issue'}
                      </button>
                    </div>
                  </div>
                )}
                {showRescheduleActions && bookingStatus === 'customer_confirmed' && (
                  booking.review ? (
                    <div className="booking-review-summary">
                      <strong>Review submitted</strong>
                      <span>{booking.review.rating} stars</span>
                      {booking.review.review_text && <p>{booking.review.review_text}</p>}
                    </div>
                  ) : (
                    <CompletionReviewForm
                      booking={booking}
                      form={reviewForms[booking.id] || { rating: '5', reviewText: '' }}
                      isSubmitting={submittingReviewId === booking.id}
                      onChange={onReviewChange}
                      onSubmit={onReviewSubmit}
                    />
                  )
                )}
                {bookingStatus === 'reschedule_requested' && (
                  <div className="booking-reschedule-note">
                    <div className="booking-reschedule-heading">
                      <strong>Artisan proposed a new time</strong>
                      <span className="awaiting-response-badge">Awaiting Your Response</span>
                    </div>
                    <div className="reschedule-time-grid">
                      <span>
                        <strong>Original date/time</strong>
                        {booking.scheduledDate} at {booking.scheduledTime}
                      </span>
                      <span>
                        <strong>Proposed date/time</strong>
                        {booking.proposedDate || 'Date pending'} at {booking.proposedTime || 'Time pending'}
                      </span>
                    </div>
                    {booking.rescheduleNote && (
                      <p className="reschedule-artisan-note">{booking.rescheduleNote}</p>
                    )}
                    {showRescheduleActions && (
                      <div className="booking-reschedule-actions">
                        <button
                          disabled={updatingBookingId === booking.id}
                          type="button"
                          onClick={() => onRescheduleResponse?.(booking, 'accept')}
                        >
                          {updatingBookingId === booking.id ? 'Updating...' : 'Accept New Time'}
                        </button>
                        <button
                          disabled={updatingBookingId === booking.id}
                          type="button"
                          onClick={() => onRescheduleResponse?.(booking, 'reject')}
                        >
                          {updatingBookingId === booking.id ? 'Updating...' : 'Reject New Time'}
                        </button>
                      </div>
                    )}
                    {booking.rescheduleRequestedAt && (
                      <p>Requested: {new Date(booking.rescheduleRequestedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </article>
          )
        })
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
  const [reviewForms, setReviewForms] = useState({})
  const [submittingReviewId, setSubmittingReviewId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')
  const [updatingCompletionId, setUpdatingCompletionId] = useState('')

  const isCustomer = user?.role === 'customer'
  const selectedArtisan = options.artisans.find((artisan) => artisan.id === form.artisanId)
  const selectedService = options.services.find((service) => service.id === form.serviceId)

  const summary = useMemo(() => {
    const upcomingCount = bookings.filter((booking) => (
      ['pending', 'reschedule_requested', 'confirmed', 'in_progress', 'artisan_completed'].includes(booking.rawStatus)
    )).length
    const completedCount = bookings.filter((booking) => (
      booking.rawStatus === 'customer_confirmed' || booking.rawStatus === 'completed'
    )).length
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
            setError(getErrorMessage(refreshError))
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

  async function refreshBookings() {
    const { data, error: refreshError } = await getBookingsForUser(user)

    if (refreshError) {
      setError(getErrorMessage(refreshError))
      return false
    }

    setBookings(data)
    return true
  }

  async function handleRescheduleResponse(booking, decision) {
    setError('')
    setUpdatingBookingId(booking.id)

    try {
      console.log('[Handiwave reschedule response] before update:', {
        bookingId: booking.id,
        decision,
        rawStatus: booking.rawStatus,
        status: booking.status,
      })

      const { data, error: responseError } = await respondToBookingReschedule({
        bookingId: booking.id,
        customerId: user.id,
        decision,
      })

      if (responseError) {
        setError(getErrorMessage(responseError))
        return
      }

      if (!data?.id) {
        setError('Supabase did not return the updated booking row.')
        return
      }

      const didRefresh = await refreshBookings()
      if (!didRefresh) {
        return
      }

      showToast(decision === 'accept'
        ? 'New booking time accepted.'
        : 'Proposed booking time rejected.')
    } catch (responseError) {
      setError(getErrorMessage(responseError))
    } finally {
      setUpdatingBookingId('')
    }
  }

  async function handleCompletionAction(booking, action) {
    setError('')
    setUpdatingCompletionId(booking.id)

    try {
      const serviceCall = action === 'confirm'
        ? confirmBookingCompleteForCustomer
        : reportBookingIssueForCustomer
      const { data, error: completionError } = await serviceCall({
        bookingId: booking.id,
        customerId: user.id,
      })

      if (completionError) {
        setError(getErrorMessage(completionError))
        return
      }

      if (!data?.id) {
        setError('Supabase did not confirm the booking completion update.')
        return
      }

      const didRefresh = await refreshBookings()
      if (!didRefresh) {
        return
      }

      showToast(action === 'confirm'
        ? 'Job completion confirmed. You can now leave a review.'
        : 'Issue reported. The booking has been marked for support review.')
    } catch (completionError) {
      setError(getErrorMessage(completionError))
    } finally {
      setUpdatingCompletionId('')
    }
  }

  function handleReviewChange(bookingId, field, value) {
    setReviewForms((currentForms) => ({
      ...currentForms,
      [bookingId]: {
        rating: '5',
        reviewText: '',
        ...currentForms[bookingId],
        [field]: value,
      },
    }))
  }

  async function handleReviewSubmit(event, booking) {
    event.preventDefault()
    setError('')
    setSubmittingReviewId(booking.id)

    const form = reviewForms[booking.id] || { rating: '5', reviewText: '' }

    try {
      const { data, error: reviewError } = await submitBookingReview({
        artisanId: booking.artisanId,
        bookingId: booking.id,
        customerId: user.id,
        rating: form.rating,
        reviewText: form.reviewText,
      })

      if (reviewError) {
        setError(getErrorMessage(reviewError))
        return
      }

      if (!data?.id) {
        setError('Supabase did not confirm that the review was saved.')
        return
      }

      const didRefresh = await refreshBookings()
      if (!didRefresh) {
        return
      }

      setReviewForms((currentForms) => {
        const nextForms = { ...currentForms }
        delete nextForms[booking.id]
        return nextForms
      })
      showToast('Review submitted. Thank you for helping other customers.')
    } catch (reviewError) {
      setError(getErrorMessage(reviewError))
    } finally {
      setSubmittingReviewId('')
    }
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
            onCompletionAction={handleCompletionAction}
            onReviewChange={handleReviewChange}
            onReviewSubmit={handleReviewSubmit}
            onRescheduleResponse={handleRescheduleResponse}
            participantLabel={(booking) => booking.artisan}
            reviewForms={reviewForms}
            showRescheduleActions
            submittingReviewId={submittingReviewId}
            title="Customer booking history"
            updatingBookingId={updatingBookingId}
            updatingCompletionId={updatingCompletionId}
          />
        ) : (
          <BookingHistorySection
            bookings={bookings}
            emptyText="Customer bookings assigned to your artisan profile will appear here."
            isLoading={isLoading}
            participantLabel={(booking) => booking.customer}
            title="Artisan booking history"
            updatingBookingId={updatingBookingId}
          />
        )}
      </section>
    </div>
  )
}

export default Bookings
