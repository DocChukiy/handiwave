import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getArtisanByProfileId } from './artisanService.js'
import { ensureConversationForBooking } from './messageService.js'
import { createNotificationSafely } from './notificationService.js'

const bookingServiceRelation = 'bookings_service_id_fkey'
const bookingArtisanRelation = 'bookings_artisan_id_fkey'
const bookingCustomerRelation = 'bookings_customer_id_fkey'
const artisanProfileRelation = 'artisans_profile_id_fkey'
const bookingAttachmentRelation = 'booking_attachments_booking_id_fkey'
const bookingAttachmentBucket = 'handiwave-booking-attachments'

const bookingSelect = `
  *,
  service:services!${bookingServiceRelation}(id, name, category, icon),
  artisan:artisans!${bookingArtisanRelation}(
    id,
    business_name,
    profile_id,
    city,
    state,
    verification_status,
    profile:profiles!${artisanProfileRelation}(id, full_name, email, avatar_url)
  ),
  customer:profiles!${bookingCustomerRelation}(id, full_name, email),
  attachments:booking_attachments!${bookingAttachmentRelation}(
    id,
    file_name,
    file_path,
    file_size,
    file_type,
    file_url,
    uploaded_by,
    created_at
  ),
  review:reviews!reviews_booking_id_fkey(id, rating, review_text, created_at, edited_at)
`

const allowedArtisanTransitions = {
  confirmed: ['in_progress'],
  in_progress: ['artisan_completed'],
  pending: ['confirmed', 'cancelled', 'reschedule_requested'],
  reschedule_requested: ['cancelled'],
}

async function getArtisanProfileIdByArtisanId(artisanId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('artisans')
    .select('profile_id')
    .eq('id', artisanId)
    .maybeSingle()

  if (error) {
    console.error('[Handiwave notification] artisan profile lookup failed:', error)
  }

  return data?.profile_id || ''
}

function formatDateTime(date, time) {
  const dateLabel = date || 'Date pending'
  const timeLabel = time ? time.slice(0, 5) : 'Time pending'

  return `${dateLabel} • ${timeLabel}`
}

function toNumber(value) {
  return Number(value) || 0
}

function getSafeFileName(fileName = 'issue-photo') {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function mapAttachmentRow(attachment) {
  return {
    createdAt: attachment.created_at || '',
    fileName: attachment.file_name || attachment.file_path?.split('/').pop() || 'Issue image',
    filePath: attachment.file_path || '',
    fileSize: Number(attachment.file_size) || 0,
    fileType: attachment.file_type || '',
    fileUrl: attachment.file_url || '',
    id: attachment.id,
    uploadedBy: attachment.uploaded_by || '',
  }
}

export function mapBookingRow(booking) {
  const artisanName =
    booking.artisan?.profile?.full_name ||
    booking.artisan?.business_name ||
    'Handiwave artisan'
  const customerName = booking.customer?.full_name || booking.customer?.email || 'Customer'
  const review = Array.isArray(booking.review) ? booking.review[0] : booking.review
  const status = booking.status || 'pending'

  return {
    address: booking.location_address,
    artisan: artisanName,
    artisanId: booking.artisan_id,
    attachments: (booking.attachments || []).map(mapAttachmentRow),
    city: booking.city,
    customer: customerName,
    customerId: booking.customer_id,
    date: formatDateTime(booking.scheduled_date, booking.scheduled_time),
    completedAt: booking.completed_at || '',
    commissionAmount: toNumber(booking.commission_amount),
    commissionRate: toNumber(booking.commission_rate),
    createdAt: booking.created_at || '',
    escrowAmount: toNumber(booking.escrow_amount),
    estimatedPrice: booking.estimated_price,
    finalPrice: booking.final_price,
    id: booking.id,
    notes: booking.notes || '',
    paymentStatus: booking.payment_status || 'unpaid',
    paymentReference: booking.payment_reference || '',
    paymentReleasedAt: booking.payment_released_at || '',
    platformFee: toNumber(booking.commission_amount),
    proposedBy: booking.proposed_by || '',
    proposedDate: booking.proposed_date || '',
    proposedTime: booking.proposed_time ? booking.proposed_time.slice(0, 5) : '',
    quotedPrice: toNumber(booking.quoted_price),
    quoteAcceptedAt: booking.quote_accepted_at || '',
    quoteNotes: booking.quote_notes || '',
    quoteRejectedAt: booking.quote_rejected_at || '',
    quoteSentAt: booking.quote_sent_at || '',
    rescheduleRequestedAt: booking.reschedule_requested_at || '',
    rescheduleNote: booking.reschedule_note || '',
    rawStatus: status,
    review: review || null,
    reviewId: review?.id || '',
    scheduledDate: booking.scheduled_date || 'Date pending',
    scheduledTime: booking.scheduled_time ? booking.scheduled_time.slice(0, 5) : 'Time pending',
    service: booking.service?.name || 'Handiwave service',
    serviceId: booking.service_id,
    state: booking.state,
    status: status.replaceAll('_', ' '),
    artisanPayoutAmount: toNumber(booking.artisan_payout_amount),
    refundAmount: toNumber(booking.refund_amount),
  }
}

async function signBookingAttachments(booking) {
  if (!booking?.attachments?.length) {
    return booking
  }

  const supabase = getSupabaseClient()
  const attachments = await Promise.all(booking.attachments.map(async (attachment) => {
    if (!attachment.filePath) {
      return attachment
    }

    const { data, error } = await supabase.storage
      .from(bookingAttachmentBucket)
      .createSignedUrl(attachment.filePath, 60 * 30)

    if (error) {
      console.error('[Handiwave booking attachments] signed URL failed:', error)
      return attachment
    }

    return {
      ...attachment,
      fileUrl: data?.signedUrl || attachment.fileUrl,
    }
  }))

  return {
    ...booking,
    attachments,
  }
}

async function mapBookingRows(rows = []) {
  const mappedRows = rows.map(mapBookingRow)
  return Promise.all(mappedRows.map(signBookingAttachments))
}

async function uploadBookingAttachments({
  bookingId,
  files = [],
  uploadedBy,
}) {
  const imageFiles = Array.from(files || []).filter(Boolean)

  if (imageFiles.length === 0) {
    return {
      data: [],
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const attachmentRows = []

  for (const file of imageFiles) {
    if (!file.type?.startsWith('image/')) {
      return {
        data: [],
        error: new Error(`${file.name} is not a supported image file.`),
      }
    }

    const extension = file.name.split('.').pop() || 'jpg'
    const path = `${bookingId}/${uploadedBy}/${Date.now()}-${getSafeFileName(file.name || `issue.${extension}`)}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bookingAttachmentBucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return {
        data: [],
        error: uploadError,
      }
    }

    attachmentRows.push({
      booking_id: bookingId,
      file_name: file.name,
      file_path: uploadData?.path || path,
      file_size: file.size,
      file_type: file.type,
      file_url: null,
      uploaded_by: uploadedBy,
    })
  }

  const { data, error } = await supabase
    .from('booking_attachments')
    .insert(attachmentRows)
    .select('*')

  return {
    data,
    error,
  }
}

export async function sendBookingQuote({
  bookingId,
  quoteNotes,
  quotedPrice,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('send_booking_quote', {
    target_booking_id: bookingId,
    target_quote_notes: quoteNotes?.trim() || null,
    target_quoted_price: Number(quotedPrice),
  })

  return {
    data,
    error,
  }
}

export async function respondToBookingQuote({
  bookingId,
  decision,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('respond_to_booking_quote', {
    decision,
    target_booking_id: bookingId,
  })

  return {
    data,
    error,
  }
}

export async function proposeBookingTimeForArtisan({
  artisanProfileId,
  bookingId,
  note,
  proposedDate,
  proposedTime,
}) {
  const { data: artisanProfile, error: artisanError } =
    await getArtisanByProfileId(artisanProfileId)

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  if (!artisanProfile) {
    return {
      data: null,
      error: new Error('Create your artisan profile before suggesting a new time.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({
      proposed_by: 'artisan',
      proposed_date: proposedDate,
      proposed_time: proposedTime,
      reschedule_requested_at: new Date().toISOString(),
      reschedule_note: note?.trim() || null,
      status: 'reschedule_requested',
    })
    .eq('id', bookingId)
    .eq('artisan_id', artisanProfile.id)
    .eq('status', 'pending')
    .select('id, customer_id, status, proposed_date, proposed_time, reschedule_note, proposed_by, reschedule_requested_at')
    .single()

  if (!error && data?.customer_id) {
    await createNotificationSafely({
      body: 'Your artisan suggested a new booking time. Review the proposal in your bookings.',
      data: {
        booking_id: data.id,
      },
      profileId: data.customer_id,
      title: 'New time proposed',
      type: 'booking',
    })
  }

  return {
    data,
    error,
  }
}

export async function respondToBookingReschedule({
  bookingId,
  customerId,
  decision,
}) {
  if (!['accept', 'reject'].includes(decision)) {
    return {
      data: null,
      error: new Error('Choose whether to accept or reject the proposed time.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data: freshBooking, error: freshBookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle()

  console.log('[Handiwave reschedule response] fresh booking before status validation:', freshBooking)

  if (freshBookingError) {
    return {
      data: null,
      error: freshBookingError,
    }
  }

  if (!freshBooking) {
    return {
      data: null,
      error: new Error('Booking not found.'),
    }
  }

  if (freshBooking.customer_id !== customerId) {
    return {
      data: null,
      error: new Error('Booking not found.'),
    }
  }

  if (freshBooking.status !== 'reschedule_requested') {
    return {
      data: null,
      error: new Error('This reschedule request is no longer awaiting a response.'),
    }
  }

  const updatePayload = {
    proposed_by: null,
    proposed_date: null,
    proposed_time: null,
    reschedule_note: null,
    reschedule_requested_at: null,
    status: decision === 'accept' ? 'confirmed' : 'pending',
  }

  if (decision === 'accept') {
    if (!freshBooking.proposed_date || !freshBooking.proposed_time) {
      return {
        data: null,
        error: new Error('This reschedule request is missing a proposed date or time.'),
      }
    }

    updatePayload.scheduled_date = freshBooking.proposed_date
    updatePayload.scheduled_time = freshBooking.proposed_time
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select('*')
    .maybeSingle()

  if (!error && !data) {
    return {
      data: null,
      error: new Error('Supabase did not return the updated booking row.'),
    }
  }

  if (!error && data?.artisan_id) {
    const artisanProfileId = await getArtisanProfileIdByArtisanId(data.artisan_id)

    await createNotificationSafely({
      body: decision === 'accept'
        ? 'The customer accepted your proposed booking time.'
        : 'The customer rejected your proposed booking time.',
      data: {
        booking_id: data.id,
      },
      profileId: artisanProfileId,
      title: decision === 'accept' ? 'Reschedule accepted' : 'Reschedule rejected',
      type: 'booking',
    })
  }

  if (!error && data?.artisanId) {
    const artisanProfileId = await getArtisanProfileIdByArtisanId(data.artisanId)

    await createNotificationSafely({
      body: 'The customer confirmed that the job is complete.',
      data: {
        booking_id: data.id,
      },
      profileId: artisanProfileId,
      title: 'Job completion confirmed',
      type: 'booking',
    })
  }

  return {
    data,
    error,
  }
}

export async function updateBookingStatusForArtisan({
  artisanProfileId,
  bookingId,
  currentStatus,
  nextStatus,
}) {
  console.log('[Handiwave artisan booking status update]', {
    bookingId,
    currentStatus,
    nextStatus,
  })

  if (!allowedArtisanTransitions[currentStatus]?.includes(nextStatus)) {
    return {
      data: null,
      error: new Error(`Cannot change booking from ${currentStatus} to ${nextStatus}.`),
    }
  }

  const { data: artisanProfile, error: artisanError } =
    await getArtisanByProfileId(artisanProfileId)

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  if (!artisanProfile) {
    return {
      data: null,
      error: new Error('Create your artisan profile before managing bookings.'),
    }
  }

  const supabase = getSupabaseClient()

  if (currentStatus === 'pending' && nextStatus === 'confirmed') {
    const { data: freshBooking, error: freshBookingError } = await supabase
      .from('bookings')
      .select('id, payment_status, quote_accepted_at')
      .eq('id', bookingId)
      .maybeSingle()

    if (freshBookingError) {
      return {
        data: null,
        error: freshBookingError,
      }
    }

    if (!freshBooking?.quote_accepted_at || freshBooking.payment_status !== 'held_in_escrow') {
      return {
        data: null,
        error: new Error('Send a quote and wait for Paystack escrow payment before confirming this booking.'),
      }
    }
  }

  const updatePayload = {
    status: nextStatus,
  }

  if (nextStatus === 'artisan_completed') {
    updatePayload.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .eq('artisan_id', artisanProfile.id)
    .eq('status', currentStatus)
    .select('id, customer_id, status, completed_at')
    .maybeSingle()

  console.log('[Handiwave artisan booking status update result]', {
    data,
    error,
  })

  if (!error && !data) {
    return {
      data: null,
      error: new Error('Supabase did not update the booking. Check that the booking id, artisan id, and current status still match.'),
    }
  }

  if (!error && data?.customer_id && nextStatus === 'confirmed') {
    await createNotificationSafely({
      body: 'Your artisan accepted the booking request.',
      data: {
        booking_id: data.id,
      },
      profileId: data.customer_id,
      title: 'Booking accepted',
      type: 'booking',
    })
  }

  if (!error && data?.customer_id && nextStatus === 'artisan_completed') {
    await createNotificationSafely({
      body: 'Your artisan marked the job as completed. Please confirm the work.',
      data: {
        booking_id: data.id,
      },
      profileId: data.customer_id,
      title: 'Confirm job completion',
      type: 'booking',
    })
  }

  return {
    data,
    error,
  }
}

export async function confirmBookingCompleteForCustomer({ bookingId, customerId }) {
  const supabase = getSupabaseClient()

  console.log('[Handiwave customer completion confirm]', {
    bookingId,
    customerId,
    nextStatus: 'customer_confirmed',
  })

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'customer_confirmed',
    })
    .eq('id', bookingId)
    .eq('customer_id', customerId)
    .eq('status', 'artisan_completed')
    .select(bookingSelect)
    .maybeSingle()

  console.log('[Handiwave customer completion confirm result]', {
    data,
    error,
  })

  if (!error && !data) {
    return {
      data: null,
      error: new Error('This booking is not awaiting customer completion confirmation.'),
    }
  }

  if (!error && data?.artisan_id) {
    const artisanProfileId = await getArtisanProfileIdByArtisanId(data.artisan_id)

    await createNotificationSafely({
      body: 'The customer confirmed that the job is complete.',
      data: {
        booking_id: data.id,
      },
      profileId: artisanProfileId,
      title: 'Job completion confirmed',
      type: 'booking',
    })
  }

  return {
    data: data ? mapBookingRow(data) : null,
    error,
  }
}

export async function reportBookingIssueForCustomer({ bookingId, customerId }) {
  const supabase = getSupabaseClient()

  console.log('[Handiwave customer completion report]', {
    bookingId,
    customerId,
    nextStatus: 'disputed',
  })

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'disputed',
    })
    .eq('id', bookingId)
    .eq('customer_id', customerId)
    .eq('status', 'artisan_completed')
    .select(bookingSelect)
    .maybeSingle()

  console.log('[Handiwave customer completion report result]', {
    data,
    error,
  })

  if (!error && !data) {
    return {
      data: null,
      error: new Error('This booking is not awaiting customer completion confirmation.'),
    }
  }

  return {
    data: data ? mapBookingRow(data) : null,
    error,
  }
}

export async function getBookingOptions() {
  const supabase = getSupabaseClient()
  const [servicesResult, artisansResult] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, category, base_price')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('artisans')
      .select(`
        id,
        business_name,
        profile_id,
        city,
        state,
        primary_service_id,
        starting_price,
        verification_status,
        profile:profiles!${artisanProfileRelation}(id, full_name),
        primary_service:services!artisans_primary_service_id_fkey(id, name, category)
      `)
      .eq('verification_status', 'verified')
      .eq('is_available', true)
      .order('average_rating', { ascending: false }),
  ])

  return {
    data: {
      artisans: artisansResult.data || [],
      services: servicesResult.data || [],
    },
    error: servicesResult.error || artisansResult.error,
  }
}

export async function getBookingsForUser(user) {
  if (!user) {
    return {
      data: [],
      error: new Error('You must be logged in to view bookings.'),
    }
  }

  const supabase = getSupabaseClient()

  if (user.role === 'artisan') {
    const { data: artisanProfile, error: artisanError } = await getArtisanByProfileId(user.id)

    if (artisanError) {
      return {
        data: [],
        error: artisanError,
      }
    }

    if (!artisanProfile) {
      return {
        data: [],
        error: null,
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(bookingSelect)
      .eq('artisan_id', artisanProfile.id)
      .order('created_at', { ascending: false })

    return {
      data: await mapBookingRows(data || []),
      error,
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(bookingSelect)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return {
    data: await mapBookingRows(data || []),
    error,
  }
}

async function getBookingById(bookingId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(bookingSelect)
    .eq('id', bookingId)
    .single()

  return {
    data: data ? await signBookingAttachments(mapBookingRow(data)) : null,
    error,
  }
}

export async function createBooking({
  address,
  artisanId,
  attachmentFiles = [],
  city,
  customerId,
  notes,
  scheduledDate,
  scheduledTime,
  serviceId,
  state,
  userRole,
}) {
  if (userRole !== 'customer') {
    return {
      data: null,
      error: new Error('Only customer accounts can create bookings.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data: artisan, error: artisanError } = await supabase
    .from('artisans')
    .select('id, profile_id, primary_service_id, starting_price, verification_status')
    .eq('id', artisanId)
    .maybeSingle()

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  if (!artisan) {
    return {
      data: null,
      error: new Error('Selected artisan was not found.'),
    }
  }

  if (artisan.profile_id === customerId) {
    return {
      data: null,
      error: new Error('You cannot book your own artisan profile.'),
    }
  }

  const resolvedServiceId = serviceId || artisan.primary_service_id
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, name, base_price')
    .eq('id', resolvedServiceId)
    .maybeSingle()

  if (serviceError) {
    console.error('[Handiwave booking debug] service lookup error:', serviceError)
    return {
      data: null,
      error: serviceError,
    }
  }

  if (!service) {
    return {
      data: null,
      error: new Error('Selected service was not found.'),
    }
  }

  const { data: artisanService, error: artisanServiceError } = await supabase
    .from('artisan_services')
    .select('price_from')
    .eq('artisan_id', artisanId)
    .eq('service_id', resolvedServiceId)
    .maybeSingle()

  if (artisanServiceError) {
    return {
      data: null,
      error: artisanServiceError,
    }
  }

  const estimatedPrice = Number(
    artisanService?.price_from ||
      artisan.starting_price ||
      service.base_price ||
      0,
  )

  const bookingPayload = {
    artisan_id: artisanId,
    city: city.trim(),
    customer_id: customerId,
    estimated_price: estimatedPrice > 0 ? estimatedPrice : null,
    location_address: address.trim(),
    notes: notes.trim() || null,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    service_id: resolvedServiceId,
    state: state.trim(),
  }

  console.log('[Handiwave booking debug] booking payload before insert:', bookingPayload)

  const { data: insertedBooking, error: insertError } = await supabase
    .from('bookings')
    .insert(bookingPayload)
    .select('*')
    .single()

  console.log('[Handiwave booking debug] inserted booking returned from Supabase:', {
    booking: insertedBooking,
    error: insertError,
  })

  if (insertError) {
    console.error('[Handiwave booking debug] booking insert failed:', insertError)
    return {
      data: null,
      error: insertError,
    }
  }

  if (!insertedBooking) {
    return {
      data: null,
      error: new Error('Supabase did not return an inserted booking row.'),
    }
  }

  const { error: attachmentError } = await uploadBookingAttachments({
    bookingId: insertedBooking.id,
    files: attachmentFiles,
    uploadedBy: customerId,
  })

  if (attachmentError) {
    console.error('[Handiwave booking attachments] upload failed:', attachmentError)
    return {
      data: null,
      error: attachmentError,
    }
  }

  const { data: conversation, error: conversationError } = await ensureConversationForBooking({
    bookingId: insertedBooking.id,
    user: {
      id: customerId,
      role: 'customer',
    },
  })

  if (conversationError) {
    console.error('[Handiwave booking debug] conversation creation failed:', conversationError)
    return {
      data: null,
      error: conversationError,
    }
  }

  const { data: displayBooking, error: displayError } = await getBookingById(insertedBooking.id)

  if (displayError) {
    console.error('[Handiwave booking debug] booking display fetch failed:', displayError)
  }

  await createNotificationSafely({
    body: 'A customer created a new booking request. Open Jobs to review it.',
    data: {
      booking_id: insertedBooking.id,
      conversation_id: conversation?.id,
    },
    profileId: artisan.profile_id,
    title: 'New booking request',
    type: 'booking',
  })

  return {
    data: {
      ...(displayBooking || mapBookingRow({
      ...insertedBooking,
      artisan: null,
      customer: null,
      service,
      })),
      conversationId: conversation?.id || '',
    },
    error: null,
  }
}
