import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import {
  getCustomerBookingAvailability,
  getDayLabel,
} from '../services/availabilityService.js'
import { submitBookingReview, updateBookingReview } from '../services/reviewService.js'
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
  artisan_completed: 'Awaiting customer confirmation',
  completed: 'Completed',
  confirmed: 'Confirmed',
  customer_confirmed: 'Customer confirmed',
  disputed: 'Issue reported',
  in_progress: 'In progress',
  pending: 'Pending',
  reschedule_requested: 'Reschedule requested',
}

const paymentStatusLabels = {
  failed: 'Failed',
  held_in_escrow: 'Held in escrow',
  refunded: 'Refunded',
  released: 'Released',
  unpaid: 'Unpaid',
}

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function formatMoney(value, currency = 'NGN') {
  if (value === null || value === undefined || value === '') {
    return `${currency} 0`
  }

  return `${currency} ${Number(value || 0).toLocaleString()}`
}

function getBookingPrice(booking) {
  return booking.finalPrice || booking.estimatedPrice || booking.escrowAmount || 0
}

function PaymentStatusBadge({ status }) {
  return (
    <span className={`payment-status-badge payment-${status || 'unpaid'}`}>
      {paymentStatusLabels[status] || status?.replaceAll('_', ' ') || 'Unpaid'}
    </span>
  )
}

function CustomerEscrowPanel({ booking }) {
  const price = getBookingPrice(booking)
  const escrowAmount = booking.escrowAmount || (
    booking.paymentStatus === 'held_in_escrow' ? price : 0
  )

  return (
    <div className="booking-payment-panel">
      <div className="booking-payment-row">
        <span>
          <strong>{formatMoney(price)}</strong>
          {booking.finalPrice ? 'Final price' : 'Estimated price'}
        </span>
        <span>
          <strong>{formatMoney(escrowAmount)}</strong>
          Escrow protected
        </span>
        <span>
          <PaymentStatusBadge status={booking.paymentStatus} />
          Payment status
        </span>
      </div>
      <p>
        Escrow release after customer confirmation. Platform commission will be deducted from the artisan payout when real payments go live.
      </p>
      <button className="paystack-placeholder-button" disabled type="button">
        Pay with Paystack - Coming Soon
      </button>
    </div>
  )
}

function getDateDayOfWeek(dateValue) {
  if (!dateValue) {
    return null
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

function formatDateLabel(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(new Date(year, month - 1, day))
}

function getDateValueFromDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + minutes
}

function minutesToTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')

  return `${hours}:${minutes}`
}

function timeIsInsideSlot(time, slot) {
  return Boolean(time && slot.startTime <= time && slot.endTime > time)
}

function getGeneratedTimesForSlot(slot) {
  const startMinutes = timeToMinutes(slot.startTime)
  const endMinutes = timeToMinutes(slot.endTime)
  const times = []

  for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 60) {
    times.push({
      label: minutesToTime(currentMinutes),
      slotId: slot.id,
      value: minutesToTime(currentMinutes),
    })
  }

  return times
}

function getUpcomingAvailableDates(availability, daysToShow = 45) {
  const activeDayNumbers = new Set(availability.slots.map((slot) => Number(slot.dayOfWeek)))
  const unavailableDateValues = new Set(
    availability.unavailableDates.map((date) => date.unavailableDate),
  )
  const availableDates = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < daysToShow; offset += 1) {
    const candidate = new Date(today)
    candidate.setDate(today.getDate() + offset)

    const dateValue = getDateValueFromDate(candidate)
    const dayOfWeek = candidate.getDay()

    if (activeDayNumbers.has(dayOfWeek) && !unavailableDateValues.has(dateValue)) {
      availableDates.push({
        dayOfWeek,
        label: formatDateLabel(dateValue),
        value: dateValue,
      })
    }
  }

  return availableDates
}

function getAvailableTimesForDate({
  availability,
  date,
}) {
  if (!date) {
    return []
  }

  const dayOfWeek = getDateDayOfWeek(date)
  const matchingDaySlots = availability.slots.filter((slot) => (
    Number(slot.dayOfWeek) === dayOfWeek
  ))
  const bookedTimes = new Set(
    availability.bookedSlots
      .filter((slot) => slot.date === date)
      .map((slot) => slot.time),
  )

  return matchingDaySlots
    .flatMap(getGeneratedTimesForSlot)
    .filter((time) => !bookedTimes.has(time.value))
}

function getAvailabilityValidationMessage({
  availability,
  date,
  time,
}) {
  if (!date || !time) {
    return ''
  }

  const isUnavailableDate = availability.unavailableDates.some((item) => (
    item.unavailableDate === date
  ))

  if (isUnavailableDate) {
    return 'This artisan is unavailable on the selected date.'
  }

  const dayOfWeek = getDateDayOfWeek(date)
  const matchingDaySlots = availability.slots.filter((slot) => (
    Number(slot.dayOfWeek) === dayOfWeek
  ))

  if (matchingDaySlots.length === 0) {
    return `This artisan has no active availability on ${getDayLabel(dayOfWeek)}.`
  }

  const matchingTimeSlot = matchingDaySlots.some((slot) => timeIsInsideSlot(time, slot))

  if (!matchingTimeSlot) {
    return 'Selected time is outside this artisan availability.'
  }

  const alreadyBooked = availability.bookedSlots.some((slot) => (
    slot.date === date && slot.time === time
  ))

  if (alreadyBooked) {
    return 'This time is already booked. Please choose another slot.'
  }

  return ''
}

function CompletionReviewForm({
  booking,
  form,
  isSubmitting,
  mode = 'create',
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
        {isSubmitting
          ? mode === 'edit' ? 'Saving review...' : 'Submitting review...'
          : mode === 'edit' ? 'Save Review' : 'Submit Review'}
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
  editingReviewId,
  onEditReviewStart,
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
            console.log('[Handiwave customer booking history render]', {
              bookingId: booking.id,
              displayStatus: booking.status,
              rawStatus: booking.rawStatus,
              review: booking.review,
              reviewId: booking.reviewId,
            })
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
                {showRescheduleActions && <CustomerEscrowPanel booking={booking} />}
                {booking.notes && <p>{booking.notes}</p>}
                {showRescheduleActions && (
                  <div className="booking-message-actions">
                    <Link to={`/messages?booking=${booking.id}`}>
                      Message Artisan
                    </Link>
                  </div>
                )}
                {showRescheduleActions && bookingStatus === 'completed' && (
                  <div className="booking-compatibility-panel">
                    <strong>Old completed status detected</strong>
                    <p>
                      This booking was completed before the new customer confirmation flow.
                      New jobs should move from artisan completed to customer confirmed before reviews unlock.
                    </p>
                  </div>
                )}
                {showRescheduleActions && bookingStatus === 'artisan_completed' && (
                  <div className="booking-completion-panel">
                    <div>
                      <span className="action-required-badge">Action Required</span>
                      <strong>Artisan marked this job as completed.</strong>
                      <p>Please confirm the work was completed safely before leaving a review.</p>
                    </div>
                    <div className="booking-completion-actions">
                      <button
                        disabled={updatingCompletionId === booking.id}
                        type="button"
                        onClick={() => onCompletionAction?.(booking, 'confirm')}
                      >
                        {updatingCompletionId === booking.id ? 'Confirming...' : 'Confirm Job Completed'}
                      </button>
                      <button
                        disabled={updatingCompletionId === booking.id}
                        type="button"
                        onClick={() => onCompletionAction?.(booking, 'report')}
                      >
                        {updatingCompletionId === booking.id ? 'Reporting...' : 'Report Not Completed'}
                      </button>
                    </div>
                  </div>
                )}
                {showRescheduleActions && ['customer_confirmed', 'completed'].includes(bookingStatus) && (
                  booking.review ? (
                    <div className="booking-review-summary">
                      {editingReviewId === booking.id ? (
                        <CompletionReviewForm
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
                        <>
                          <div>
                            <strong>Review submitted</strong>
                            <p>{booking.review.review_text || 'No written comment added.'}</p>
                          </div>
                          <div className="booking-review-actions">
                            <span>{booking.review.rating} stars</span>
                            <button
                              type="button"
                              onClick={() => onEditReviewStart?.(booking)}
                            >
                              Edit Review
                            </button>
                          </div>
                        </>
                      )}
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
  const [searchParams] = useSearchParams()
  const [availability, setAvailability] = useState({
    bookedSlots: [],
    slots: [],
    unavailableDates: [],
  })
  const [availabilityError, setAvailabilityError] = useState('')
  const [bookings, setBookings] = useState([])
  const [editingReviewId, setEditingReviewId] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastCreatedBooking, setLastCreatedBooking] = useState(null)
  const [options, setOptions] = useState({ artisans: [], services: [] })
  const [reviewForms, setReviewForms] = useState({})
  const [submittingReviewId, setSubmittingReviewId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')
  const [updatingCompletionId, setUpdatingCompletionId] = useState('')

  const isCustomer = user?.role === 'customer'
  const requestedArtisanId = searchParams.get('artisan')
  const selectedArtisan = options.artisans.find((artisan) => artisan.id === form.artisanId)
  const selectedService = options.services.find((service) => service.id === form.serviceId)
  const availableDayLabels = useMemo(() => (
    [...new Set(availability.slots.map((slot) => getDayLabel(slot.dayOfWeek)))]
  ), [availability.slots])
  const availableBookingDates = useMemo(() => (
    getUpcomingAvailableDates(availability)
  ), [availability])
  const dateDayOfWeek = getDateDayOfWeek(form.scheduledDate)
  const slotsForSelectedDate = availability.slots.filter((slot) => (
    Number(slot.dayOfWeek) === dateDayOfWeek
  ))
  const availableTimesForSelectedDate = useMemo(() => (
    getAvailableTimesForDate({
      availability,
      date: form.scheduledDate,
    })
  ), [availability, form.scheduledDate])
  const isSelectedDateUnavailable = availability.unavailableDates.some((date) => (
    date.unavailableDate === form.scheduledDate
  ))
  const availabilityValidationMessage = getAvailabilityValidationMessage({
    availability,
    date: form.scheduledDate,
    time: form.scheduledTime,
  })

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
          const requestedArtisan = nextOptions.artisans.find((artisan) => (
            artisan.id === requestedArtisanId
          ))
          const firstArtisan = requestedArtisan || nextOptions.artisans[0]
          const firstService = nextOptions.services[0]

          return {
            ...currentForm,
            artisanId: requestedArtisan?.id || currentForm.artisanId || firstArtisan?.id || '',
            serviceId:
              requestedArtisan?.primary_service_id ||
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
  }, [requestedArtisanId, user])

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

  useEffect(() => {
    let isMounted = true

    async function loadAvailabilityForSelectedArtisan() {
      if (!form.artisanId || !isCustomer) {
        setAvailability({ bookedSlots: [], slots: [], unavailableDates: [] })
        setAvailabilityError('')
        return
      }

      setAvailabilityError('')
      setIsLoadingAvailability(true)

              try {
        const { data, error: loadAvailabilityError } =
          await getCustomerBookingAvailability(form.artisanId)

        if (!isMounted) {
          return
        }

        if (loadAvailabilityError) {
          setAvailabilityError(getErrorMessage(loadAvailabilityError))
          return
        }

        setAvailability(data)
        setForm((currentForm) => ({
          ...currentForm,
          scheduledDate: '',
          scheduledTime: '',
        }))
      } catch (loadAvailabilityError) {
        if (isMounted) {
          setAvailabilityError(getErrorMessage(loadAvailabilityError))
        }
      } finally {
        if (isMounted) {
          setIsLoadingAvailability(false)
        }
      }
    }

    loadAvailabilityForSelectedArtisan()

    return () => {
      isMounted = false
    }
  }, [form.artisanId, isCustomer])

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
      scheduledDate: '',
      scheduledTime: '',
      serviceId: artisan?.primary_service_id || currentForm.serviceId,
    }))
  }

  function handleDateChange(date) {
    setForm((currentForm) => ({
      ...currentForm,
      scheduledDate: date,
      scheduledTime: '',
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

  function handleEditReviewStart(booking) {
    setEditingReviewId(booking.id)
    setReviewForms((currentForms) => ({
      ...currentForms,
      [booking.id]: {
        rating: String(booking.review?.rating || 5),
        reviewText: booking.review?.review_text || '',
      },
    }))
  }

  async function handleReviewSubmit(event, booking) {
    event.preventDefault()
    setError('')
    setSubmittingReviewId(booking.id)

    const form = reviewForms[booking.id] || { rating: '5', reviewText: '' }

    try {
      const { data, error: reviewError } = booking.review
        ? await updateBookingReview({
          bookingId: booking.id,
          customerId: user.id,
          rating: form.rating,
          reviewId: booking.review.id,
          reviewText: form.reviewText,
        })
        : await submitBookingReview({
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
      setEditingReviewId('')
      showToast(booking.review
        ? 'Review updated.'
        : 'Review submitted. Thank you for helping other customers.')
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

    if (availabilityValidationMessage) {
      setError(availabilityValidationMessage)
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
        setError(getErrorMessage(saveError))
        return
      }

      if (!data?.id) {
        setError('Supabase did not confirm that the booking row was created.')
        return
      }

      setBookings((currentBookings) => [data, ...currentBookings])
      setLastCreatedBooking(data)
      setForm((currentForm) => ({
        ...initialForm,
        artisanId: currentForm.artisanId,
        serviceId: currentForm.serviceId,
      }))
      showToast('Booking request saved to Supabase successfully.')
    } catch (saveError) {
      setError(getErrorMessage(saveError))
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

      {lastCreatedBooking && (
        <section className="booking-success-panel">
          <div>
            <span>Booking request created</span>
            <h2>{lastCreatedBooking.service}</h2>
            <p>
              Your booking chat is ready so you can agree on service details before the artisan accepts or reschedules.
            </p>
          </div>
          <Link className="primary-cta" to={`/messages?booking=${lastCreatedBooking.id}`}>
            Message Artisan
          </Link>
        </section>
      )}

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
            {selectedArtisan && (
              <div className="booking-availability-panel">
                <strong>Available slots</strong>
                <p>
                  Pick a date that matches this artisan&apos;s weekly schedule. Handiwave also checks blocked dates and existing bookings before submission.
                </p>
                {isLoadingAvailability ? (
                  <p>Loading artisan availability...</p>
                ) : availabilityError ? (
                  <p>{availabilityError}</p>
                ) : availableDayLabels.length > 0 ? (
                  <>
                    <div className="availability-chip-row">
                      {availableDayLabels.map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    {availability.unavailableDates.length > 0 && (
                      <p>
                        Blocked dates: {availability.unavailableDates
                          .slice(0, 3)
                          .map((date) => date.unavailableDate)
                          .join(', ')}
                        {availability.unavailableDates.length > 3 ? '...' : ''}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p>This artisan has not added bookable availability yet.</p>
                    <Link className="secondary-cta compact-cta" to="/messages">
                      Message Artisan
                    </Link>
                  </>
                )}
              </div>
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
                <select
                  disabled={
                    isSaving ||
                    isLoadingAvailability ||
                    availableBookingDates.length === 0
                  }
                  value={form.scheduledDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                >
                  <option value="">Select available date</option>
                  {availableBookingDates.map((date) => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time
                <select
                  disabled={
                    isSaving ||
                    isLoadingAvailability ||
                    !form.scheduledDate ||
                    isSelectedDateUnavailable ||
                    availableTimesForSelectedDate.length === 0
                  }
                  value={form.scheduledTime}
                  onChange={(event) => updateForm('scheduledTime', event.target.value)}
                >
                  <option value="">Select available time</option>
                  {availableTimesForSelectedDate.map((time) => (
                    <option key={`${time.slotId}-${time.value}`} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selectedArtisan && !isLoadingAvailability && availableBookingDates.length === 0 && (
              <div className="booking-empty-slot-panel">
                <p>No available slots for this date. Try another date or message artisan.</p>
                <Link className="secondary-cta compact-cta" to="/messages">
                  Message Artisan
                </Link>
              </div>
            )}
            {form.scheduledDate && slotsForSelectedDate.length === 0 && (
              <p className="auth-hint">
                No available slots for this date. Try another date or message artisan.
              </p>
            )}
            {isSelectedDateUnavailable && (
              <p className="auth-error">
                This artisan is unavailable on the selected date.
              </p>
            )}
            {form.scheduledDate && slotsForSelectedDate.length > 0 && availableTimesForSelectedDate.length === 0 && !isSelectedDateUnavailable && (
              <div className="booking-empty-slot-panel">
                <p>No available slots for this date. Try another date or message artisan.</p>
                <Link className="secondary-cta compact-cta" to="/messages">
                  Message Artisan
                </Link>
              </div>
            )}
            {availabilityValidationMessage && (
              <p className="auth-error">{availabilityValidationMessage}</p>
            )}
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
            editingReviewId={editingReviewId}
            isLoading={isLoading}
            onCompletionAction={handleCompletionAction}
            onEditReviewStart={handleEditReviewStart}
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
