import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import RoleNotice from '../components/RoleNotice.jsx'
import {
  confirmBookingCompleteForCustomer,
  createBooking,
  getBookingOptions,
  getBookingsForUser,
  reportBookingIssueForCustomer,
  respondToBookingQuote,
  respondToBookingReschedule,
} from '../services/bookingService.js'
import logger from '../utils/logger.js'
import {
  getCustomerBookingAvailability,
  getDayLabel,
} from '../services/availabilityService.js'
import { submitBookingReview, updateBookingReview } from '../services/reviewService.js'
import { getSupabaseClient } from '../lib/supabaseClient.js'
import { createDisputeFromBooking } from '../services/disputeService.js'
import { initializeBookingPayment } from '../services/paymentService.js'
import { getMobilePaymentCallbackUrl, openUrl } from '../mobile/capacitor.js'
import { showToast } from '../utils/toast.js'

import BookingForm from '../components/bookings/BookingForm.jsx'
import BookingHistory from '../components/bookings/BookingHistory.jsx'
import BookingDisputeModal from '../components/bookings/BookingDisputeModal.jsx'

const initialForm = {
  address: '',
  artisanId: '',
  attachmentFiles: [],
  city: '',
  notes: '',
  scheduledDate: '',
  scheduledTime: '',
  serviceId: '',
  state: '',
}

const initialDisputeForm = {
  description: '',
  evidenceFile: null,
  reason: '',
  refundAmount: '',
  requestedResolution: '',
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
  pending: 'Pending verification',
  refunded: 'Refunded',
  released: 'Released',
  unpaid: 'Unpaid',
}

export function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

export function formatMoney(value, currency = 'NGN') {
  if (value === null || value === undefined || value === '') {
    return `${currency} 0`
  }

  return `${currency} ${Number(value || 0).toLocaleString()}`
}

export function getBookingPrice(booking) {
  return booking.finalPrice || booking.quotedPrice || booking.estimatedPrice || booking.escrowAmount || 0
}

export function getQuoteStatus(booking) {
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

export function getDisplayPaymentStatus(booking) {
  if (booking.paymentStatus === 'unpaid' && booking.paymentReference) {
    return 'pending'
  }

  return booking.paymentStatus || 'unpaid'
}

export function getDateDayOfWeek(dateValue) {
  if (!dateValue) {
    return null
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

export function formatDateLabel(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(new Date(year, month - 1, day))
}

export function getDateValueFromDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + minutes
}

export function minutesToTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')

  return `${hours}:${minutes}`
}

export function timeIsInsideSlot(time, slot) {
  return Boolean(time && slot.startTime <= time && slot.endTime > time)
}

export function getGeneratedTimesForSlot(slot) {
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

export function getUpcomingAvailableDates(availability, daysToShow = 45) {
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

export function getAvailableTimesForDate({
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

export function getAvailabilityValidationMessage({
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

export function getArtisanName(artisan) {
  return artisan.profile?.full_name || artisan.business_name || 'Handiwave artisan'
}

export function getBookingArtisanTrust(artisan) {
  const rating = Number(artisan?.average_rating) || 0
  const reviewCount = artisan?.review_count || 0
  const completedJobs = artisan?.completed_jobs || 0
  const isVerified = artisan?.verification_status === 'verified'
  const isTopRated = rating >= 4.5 && reviewCount >= 3

  return {
    completedJobs,
    isTopRated,
    isVerified,
    primaryService: artisan?.primary_service?.name || 'Service professional',
    rating,
    reviewCount,
  }
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
  const [attachmentInputKey, setAttachmentInputKey] = useState(0)
  const [bookings, setBookings] = useState([])
  const [disputeBooking, setDisputeBooking] = useState(null)
  const [disputeForm, setDisputeForm] = useState(initialDisputeForm)
  const [editingReviewId, setEditingReviewId] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false)
  const [lastCreatedBooking, setLastCreatedBooking] = useState(null)
  const [options, setOptions] = useState({ artisans: [], services: [] })
  const [payingBookingId, setPayingBookingId] = useState('')
  const [reviewForms, setReviewForms] = useState({})
  const [submittingReviewId, setSubmittingReviewId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')
  const [updatingCompletionId, setUpdatingCompletionId] = useState('')
  const [updatingQuoteId, setUpdatingQuoteId] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)

  const isCustomer = user?.role === 'customer'
  const requestedArtisanId = searchParams.get('artisan')
  const selectedArtisan = options.artisans.find((artisan) => artisan.id === form.artisanId)
  const selectedService = options.services.find((service) => service.id === form.serviceId)
  const imagePreviews = useMemo(() => (
    form.attachmentFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }))
  ), [form.attachmentFiles])

  useEffect(() => () => {
    imagePreviews.forEach((preview) => {
      if (preview.url) {
        URL.revokeObjectURL(preview.url)
      }
    })
  }, [imagePreviews])
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

  function handleAttachmentChange(files) {
    setForm((currentForm) => ({
      ...currentForm,
      attachmentFiles: Array.from(files || []),
    }))
    setUploadProgress(null)
  }

  function handleRemoveAttachment(indexToRemove) {
    setForm((currentForm) => ({
      ...currentForm,
      attachmentFiles: currentForm.attachmentFiles.filter((_, index) => index !== indexToRemove),
    }))
    setAttachmentInputKey((currentKey) => currentKey + 1)
    setUploadProgress(null)
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
      logger.debug('[Handiwave reschedule response] before update:', {
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

  function openDisputeModal(booking) {
    setError('')
    setDisputeBooking(booking)
    setDisputeForm(initialDisputeForm)
  }

  function updateDisputeForm(field, value) {
    setDisputeForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleDisputeSubmit(event) {
    event.preventDefault()

    if (!disputeBooking) {
      return
    }

    if (!disputeForm.reason.trim() || !disputeForm.description.trim()) {
      setError('Enter a dispute reason and description.')
      return
    }

    setError('')
    setIsSubmittingDispute(true)

    try {
      const { data, error: disputeError } = await createDisputeFromBooking({
        bookingId: disputeBooking.id,
        description: disputeForm.description,
        evidenceFile: disputeForm.evidenceFile,
        reason: disputeForm.reason,
        refundAmount: disputeForm.refundAmount,
        requestedResolution: disputeForm.requestedResolution,
        userId: user.id,
      })

      if (disputeError) {
        setError(getErrorMessage(disputeError))
        return
      }

      if (!data) {
        setError('Supabase did not return the dispute id.')
        return
      }

      await refreshBookings()
      setDisputeBooking(null)
      setDisputeForm(initialDisputeForm)
      showToast('Dispute opened. Support can now review the issue.')
    } catch (disputeError) {
      setError(getErrorMessage(disputeError))
    } finally {
      setIsSubmittingDispute(false)
    }
  }

  async function handlePayWithPaystack(booking) {
    setError('')
    setPayingBookingId(booking.id)

    try {
      const callbackUrl = await getMobilePaymentCallbackUrl()
      const { data, error: paymentError } = await initializeBookingPayment(booking.id, callbackUrl)

      if (paymentError) {
        setError(getErrorMessage(paymentError))
        return
      }

      if (!data?.authorization_url) {
        setError('Paystack did not return an authorization URL.')
        return
      }

      try {
        const didOpen = await openUrl(data.authorization_url)
        if (!didOpen) {
          window.location.assign(data.authorization_url)
        }
      } catch {
        window.location.assign(data.authorization_url)
      }
    } catch (paymentError) {
      setError(getErrorMessage(paymentError))
    } finally {
      setPayingBookingId('')
    }
  }

  async function handleQuoteResponse(booking, decision) {
    setError('')
    setUpdatingQuoteId(booking.id)

    try {
      const { data, error: quoteError } = await respondToBookingQuote({
        bookingId: booking.id,
        decision,
      })

      if (quoteError) {
        setError(getErrorMessage(quoteError))
        return
      }

      if (!data) {
        setError('Supabase did not confirm the quote response.')
        return
      }

      const didRefresh = await refreshBookings()
      if (!didRefresh) {
        return
      }

      showToast(decision === 'accept'
        ? 'Quote accepted. Payment is now available.'
        : 'Quote rejected.')
    } catch (quoteError) {
      setError(getErrorMessage(quoteError))
    } finally {
      setUpdatingQuoteId('')
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
    setUploadProgress(null)

    try {
      const { data, error: saveError } = await createBooking({
        address: form.address,
        artisanId: form.artisanId,
        attachmentFiles: form.attachmentFiles,
        city: form.city,
        customerId: user.id,
        notes: form.notes,
        onAttachmentProgress: setUploadProgress,
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
      setAttachmentInputKey((currentKey) => currentKey + 1)
      setUploadProgress(null)
      showToast('Booking request saved to Supabase successfully.')
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="hw-booking-page">
      <section className="hw-booking-header">
        <p className="section-kicker">Bookings</p>
        <h1>{isCustomer ? 'Book a trusted artisan' : 'Manage real bookings'}</h1>
        <p>
          {isCustomer
            ? 'Choose a verified artisan, share your location, and confirm appointment details before work begins.'
            : 'View customer requests, appointment details, locations, and booking progress from Supabase.'}
        </p>
      </section>

      <div className="hw-booking-summary">
        <div className="hw-booking-summary-item">
          <strong>{summary.upcomingCount}</strong>
          <span>Upcoming</span>
        </div>
        <div className="hw-booking-summary-item">
          <strong>{summary.completedCount}</strong>
          <span>Completed</span>
        </div>
        <div className="hw-booking-summary-item">
          <strong>{summary.cancelledCount}</strong>
          <span>Cancelled</span>
        </div>
      </div>

      <RoleNotice />

      {error && <p className="hw-booking-error">{error}</p>}

      {lastCreatedBooking && (
        <div className="hw-booking-success-panel">
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
          {getQuoteStatus(lastCreatedBooking) === 'accepted' ? (
            <button
              className="secondary-cta"
              disabled={payingBookingId === lastCreatedBooking.id}
              type="button"
              onClick={() => handlePayWithPaystack(lastCreatedBooking)}
            >
              {payingBookingId === lastCreatedBooking.id ? 'Starting Paystack...' : 'Pay with Paystack'}
            </button>
          ) : (
            <span className="hw-booking-helper-note">Waiting for artisan quote</span>
          )}
        </div>
      )}

      <div className="hw-booking-layout">
        {isCustomer && (
          <BookingForm
            form={form}
            updateForm={updateForm}
            handleSubmit={handleSubmit}
            handleArtisanChange={handleArtisanChange}
            handleDateChange={handleDateChange}
            handleAttachmentChange={handleAttachmentChange}
            handleRemoveAttachment={handleRemoveAttachment}
            options={options}
            selectedArtisan={selectedArtisan}
            selectedService={selectedService}
            availability={availability}
            availabilityError={availabilityError}
            availableDayLabels={availableDayLabels}
            availableBookingDates={availableBookingDates}
            availableTimesForSelectedDate={availableTimesForSelectedDate}
            dateDayOfWeek={dateDayOfWeek}
            slotsForSelectedDate={slotsForSelectedDate}
            isSelectedDateUnavailable={isSelectedDateUnavailable}
            isLoadingAvailability={isLoadingAvailability}
            isLoading={isLoading}
            isSaving={isSaving}
            imagePreviews={imagePreviews}
            uploadProgress={uploadProgress}
            attachmentInputKey={attachmentInputKey}
          />
        )}

        {isCustomer ? (
          <BookingHistory
            bookings={bookings}
            emptyText="Your confirmed service requests will appear here after Supabase creates the booking row."
            editingReviewId={editingReviewId}
            isLoading={isLoading}
            onCompletionAction={handleCompletionAction}
            onEditReviewStart={handleEditReviewStart}
            onReviewChange={handleReviewChange}
            onReviewSubmit={handleReviewSubmit}
            onReportIssue={openDisputeModal}
            onPay={handlePayWithPaystack}
            onQuoteResponse={handleQuoteResponse}
            onRescheduleResponse={handleRescheduleResponse}
            participantLabel={(booking) => booking.artisan}
            payingBookingId={payingBookingId}
            reviewForms={reviewForms}
            showActions
            submittingReviewId={submittingReviewId}
            title="Customer booking history"
            updatingBookingId={updatingBookingId}
            updatingCompletionId={updatingCompletionId}
            updatingQuoteId={updatingQuoteId}
            user={user}
          />
        ) : (
          <BookingHistory
            bookings={bookings}
            emptyText="Customer bookings assigned to your artisan profile will appear here."
            isLoading={isLoading}
            participantLabel={(booking) => booking.customer}
            title="Artisan booking history"
            updatingBookingId={updatingBookingId}
            user={user}
          />
        )}
      </div>

      <BookingDisputeModal
        isOpen={disputeBooking !== null}
        booking={disputeBooking}
        disputeForm={disputeForm}
        isSubmitting={isSubmittingDispute}
        onClose={() => setDisputeBooking(null)}
        onSubmit={handleDisputeSubmit}
        updateDisputeForm={updateDisputeForm}
      />
    </div>
  )
}

export default Bookings
